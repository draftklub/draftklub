import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface RequestMembershipCommand {
  klubSlug: string;
  userId: string;
  message: string;
  attachmentUrl?: string;
}

const MIN_MESSAGE_LENGTH = 10;
const MAX_MESSAGE_LENGTH = 1000;

/**
 * Sprint C PR1 — usuário solicita entrada em Klub privado. Pré-condições:
 * - Klub existe, está aprovado (reviewStatus='approved') e accessMode='private'.
 *   Klubs públicos usam `joinKlubBySlug` direto.
 * - User não é membro ainda.
 * - User não tem outra solicitação pendente nesse Klub (unique parcial).
 *
 * Cria MembershipRequest pending + emite OutboxEvent
 * `klub.membership_request.created` (worker manda email pros KLUB_ADMINs).
 */
@Injectable()
export class RequestMembershipHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: RequestMembershipCommand): Promise<{ id: string; klubId: string }> {
    const message = cmd.message.trim();
    if (message.length < MIN_MESSAGE_LENGTH) {
      throw new BadRequestException(
        `Mensagem precisa ter pelo menos ${MIN_MESSAGE_LENGTH} caracteres.`,
      );
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      throw new BadRequestException(
        `Mensagem não pode passar de ${MAX_MESSAGE_LENGTH} caracteres.`,
      );
    }

    const klub = await this.prisma.klub.findUnique({
      where: { slug: cmd.klubSlug },
      select: {
        id: true,
        name: true,
        accessMode: true,
        reviewStatus: true,
        deletedAt: true,
      },
    });

    if (!klub || klub.deletedAt || klub.reviewStatus !== 'approved') {
      throw new NotFoundException(`Klub '${cmd.klubSlug}' não encontrado`);
    }

    if (klub.accessMode !== 'private') {
      throw new BadRequestException({
        type: 'klub_is_public',
        message: 'Este Klub é aberto. Entre direto via /klubs/slug/:slug/join.',
      });
    }

    // Já é membro? Idempotente do ponto de vista do user — mas retornar
    // erro deixa claro que não precisa solicitar.
    const existing = await this.prisma.membership.findUnique({
      where: { userId_klubId: { userId: cmd.userId, klubId: klub.id } },
      select: { status: true },
    });
    if (existing?.status === 'active') {
      throw new ConflictException({
        type: 'already_member',
        message: 'Você já é membro deste Klub.',
      });
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const created = await tx.membershipRequest.create({
          data: {
            klubId: klub.id,
            userId: cmd.userId,
            status: 'pending',
            message,
            attachmentUrl: cmd.attachmentUrl,
          },
          select: { id: true, klubId: true },
        });
        await tx.outboxEvent.create({
          data: {
            eventType: 'klub.membership_request.created',
            payload: {
              requestId: created.id,
              klubId: klub.id,
              klubName: klub.name,
              userId: cmd.userId,
            },
          },
        });
        return created;
      });
    } catch (err) {
      // Unique parcial (1 pending por klub_id+user_id).
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException({
          type: 'duplicate_pending_request',
          message: 'Você já tem uma solicitação pendente neste Klub.',
        });
      }
      throw err;
    }
  }
}
