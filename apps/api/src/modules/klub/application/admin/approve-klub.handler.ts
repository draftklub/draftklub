import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface ApproveKlubCommand {
  klubId: string;
  decidedById: string;
}

/**
 * Admin aprova cadastro pendente. Re-checa duplicidade de slug
 * (race-safe: alguém pode ter aprovado um Klub com mesmo slug enquanto
 * essa request rodava). Plano comercial NÃO muda — Klub continua em
 * `status=trial`. Emite OutboxEvent pra trigger de email no PR3.
 */
@Injectable()
export class ApproveKlubHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: ApproveKlubCommand): Promise<{ id: string; slug: string }> {
    return this.prisma.$transaction(async (tx) => {
      const klub = await tx.klub.findUnique({
        where: { id: cmd.klubId },
        select: {
          id: true,
          slug: true,
          name: true,
          reviewStatus: true,
          deletedAt: true,
          createdById: true,
        },
      });
      if (!klub || klub.deletedAt) {
        throw new NotFoundException(`Klub ${cmd.klubId} não encontrado`);
      }
      if (klub.reviewStatus !== 'pending') {
        throw new BadRequestException(
          `Klub ${cmd.klubId} já foi decidido (status=${klub.reviewStatus}).`,
        );
      }

      const conflict = await tx.klub.findFirst({
        where: {
          slug: klub.slug,
          deletedAt: null,
          id: { not: klub.id },
          // Conflitos com Klubs também pendentes não bloqueiam — o admin
          // decide qual fica primeiro; só Klubs já aprovados (live no
          // sistema) bloqueiam aprovação.
          reviewStatus: 'approved',
        },
        select: { id: true, name: true },
      });
      if (conflict) {
        throw new ConflictException({
          type: 'slug_unavailable',
          message: `Slug "${klub.slug}" já está em uso por "${conflict.name}". Edite o slug antes de aprovar.`,
        });
      }

      const updated = await tx.klub.update({
        where: { id: cmd.klubId },
        data: {
          reviewStatus: 'approved',
          reviewDecisionAt: new Date(),
          reviewDecidedById: cmd.decidedById,
        },
        select: { id: true, slug: true },
      });

      // Outbox event — PR3 vai consumir pra disparar email pro criador.
      await tx.outboxEvent.create({
        data: {
          eventType: 'klub.review.approved',
          payload: {
            klubId: klub.id,
            klubName: klub.name,
            klubSlug: updated.slug,
            createdById: klub.createdById,
            decidedById: cmd.decidedById,
          },
        },
      });

      return updated;
    });
  }
}
