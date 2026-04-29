import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { createHash } from 'node:crypto';
import { Observable, map } from 'rxjs';

/**
 * Sprint N batch N-13 — ETag + If-None-Match support.
 *
 * Aplicado seletivamente via @UseInterceptors(EtagInterceptor) em
 * endpoints GET de listagem paginada que beneficiam de cache:
 *  - /me/bookings (player checa lista repetidamente)
 *  - /klubs/:klubId/sports/:sportCode/rankings/:id (leaderboard)
 *
 * Comportamento:
 *  1. Computa SHA-256 weak ETag do JSON body (com prefix `W/"..."`)
 *  2. Header `ETag` setado em todas as responses
 *  3. Se cliente envia `If-None-Match` matching → 304 Not Modified
 *     (body vazio, economiza bytes/parse)
 *
 * Weak ETag (W/) sinaliza "semanticamente equivalente" — duas serializações
 * com whitespace diferente batem. Strong ETag bytewise é overkill aqui
 * (controllers usam JSON.stringify default determinístico em key order
 * graças ao schema Zod fixo).
 */
@Injectable()
export class EtagInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const res = context.switchToHttp().getResponse<FastifyReply>();

    if (req.method !== 'GET' && req.method !== 'HEAD') return next.handle();

    return next.handle().pipe(
      map((body: unknown) => {
        if (body == null) return body;
        const json = JSON.stringify(body);
        const hash = createHash('sha256').update(json).digest('base64url').slice(0, 22);
        const etag = `W/"${hash}"`;
        res.header('ETag', etag);

        const ifNoneMatch = req.headers['if-none-match'];
        if (typeof ifNoneMatch === 'string' && ifNoneMatch === etag) {
          // 304: body vazio, mesma ETag preservada.
          res.status(HttpStatus.NOT_MODIFIED);
          return null;
        }
        return body;
      }),
    );
  }
}
