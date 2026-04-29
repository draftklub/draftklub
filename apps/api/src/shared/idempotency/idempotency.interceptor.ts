import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { createHash } from 'node:crypto';
import { Observable, from, of, switchMap, tap } from 'rxjs';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';

/**
 * Sprint N batch 3 — Idempotency-Key (padrão Stripe).
 *
 * Comportamento (só ativa quando header `Idempotency-Key` está presente):
 *
 *  1. Mutation (POST/PATCH/PUT/DELETE) chega com header
 *  2. Lookup em audit.idempotency_keys por (user_id, key)
 *  3. Encontrado E não expirou:
 *     · request_hash bate → replay do response cached
 *     · request_hash NÃO bate → 422 idempotency_conflict
 *  4. Não encontrado → processa normal, cacheia (status, body) por 24h
 *
 * Aplicado globalmente via APP_INTERCEPTOR. GET/HEAD ignorados (idempotente
 * por definição). Sem Idempotency-Key, sem cache (no-op).
 *
 * Hash da request: SHA-256 do body. Se cliente quiser garantir que o
 * payload é o mesmo entre retries, mantém os mesmos bytes.
 */
const IDEMPOTENT_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
const TTL_HOURS = 24;

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<FastifyRequest & { user?: AuthenticatedUser }>();
    const res = context.switchToHttp().getResponse<FastifyReply>();

    if (!IDEMPOTENT_METHODS.has(req.method)) return next.handle();

    const headerVal = req.headers['idempotency-key'];
    const key =
      typeof headerVal === 'string'
        ? headerVal.trim()
        : Array.isArray(headerVal)
          ? headerVal[0]
          : undefined;
    if (!key) return next.handle();

    if (key.length < 8 || key.length > 128) {
      throw new UnprocessableEntityException({
        error: 'idempotency_key_invalid',
        message: 'Idempotency-Key deve ter entre 8 e 128 caracteres.',
      });
    }

    if (!req.user?.userId) return next.handle();
    const userId = req.user.userId;
    const method = req.method;
    const path = req.url ?? '';
    const requestHash = hashBody(req.body);

    return from(this.lookup(userId, key)).pipe(
      switchMap((existing) => {
        if (existing) {
          if (existing.requestHash !== requestHash) {
            throw new UnprocessableEntityException({
              error: 'idempotency_conflict',
              message: 'Idempotency-Key já foi usada com payload diferente.',
            });
          }
          // Replay cached response. Set status header e devolve body.
          // Nest converte o `of(...)` no body do response usando o status
          // padrão do método; pra preservar o status original cacheado,
          // setamos via res.status() antes.
          res.status(existing.statusCode);
          res.header('idempotent-replayed', 'true');
          this.logger.log(
            `Idempotency replay: ${method} ${path} key=${key.slice(0, 8)}… user=${userId}`,
          );
          return of(existing.responseBody);
        }

        return next.handle().pipe(
          tap((body) => {
            const statusCode = res.statusCode || 200;
            void this.store({
              key,
              userId,
              method,
              path,
              requestHash,
              statusCode,
              responseBody: body as Prisma.InputJsonValue,
            });
          }),
        );
      }),
    );
  }

  private async lookup(userId: string, key: string) {
    const row = await this.prisma.idempotencyKey.findUnique({
      where: { userId_key: { userId, key } },
    });
    if (!row) return null;
    if (row.expiresAt < new Date()) {
      // Expirado — apaga e trata como fresco
      await this.prisma.idempotencyKey
        .delete({ where: { userId_key: { userId, key } } })
        .catch(() => null);
      return null;
    }
    return row;
  }

  private async store(input: {
    key: string;
    userId: string;
    method: string;
    path: string;
    requestHash: string;
    statusCode: number;
    responseBody: Prisma.InputJsonValue;
  }): Promise<void> {
    const expiresAt = new Date(Date.now() + TTL_HOURS * 3_600_000);
    try {
      await this.prisma.idempotencyKey.create({
        data: {
          key: input.key,
          userId: input.userId,
          method: input.method,
          path: input.path,
          requestHash: input.requestHash,
          statusCode: input.statusCode,
          responseBody: input.responseBody,
          expiresAt,
        },
      });
    } catch (err) {
      // P2002 = race com outra request usando mesma key. Idempotent —
      // a outra ganhou, é OK não regravar.
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        return;
      }
      this.logger.warn(
        `Failed to store idempotency key: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

function hashBody(body: unknown): string {
  // body undefined (e.g., DELETE sem payload) → hash de string vazia
  // pra que retries idênticos batam.
  const serialized = body === undefined ? '' : JSON.stringify(body);
  return createHash('sha256').update(serialized).digest('hex');
}
