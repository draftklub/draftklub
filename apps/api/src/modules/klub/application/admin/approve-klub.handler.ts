import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { AuditService } from '../../../../shared/audit/audit.service';
import { MetricsService } from '../../../../shared/metrics/metrics.service';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly metrics: MetricsService,
  ) {}

  async execute(cmd: ApproveKlubCommand): Promise<{ id: string; slug: string }> {
    return this.prisma
      .$transaction(async (tx) => {
        const klub = await tx.klub.findUnique({
          where: { id: cmd.klubId },
          select: {
            id: true,
            slug: true,
            name: true,
            deletedAt: true,
            createdById: true,
            review: { select: { reviewStatus: true } },
          },
        });
        if (!klub || klub.deletedAt) {
          throw new NotFoundException(`Klub ${cmd.klubId} não encontrado`);
        }
        if (klub.review?.reviewStatus !== 'pending') {
          throw new BadRequestException(
            `Klub ${cmd.klubId} já foi decidido (status=${klub.review?.reviewStatus}).`,
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
            review: { is: { reviewStatus: 'approved' } },
          },
          select: { id: true, name: true },
        });
        if (conflict) {
          throw new ConflictException({
            type: 'slug_unavailable',
            message: `Slug "${klub.slug}" já está em uso por "${conflict.name}". Edite o slug antes de aprovar.`,
          });
        }

        await tx.klubReview.upsert({
          where: { klubId: cmd.klubId },
          update: {
            reviewStatus: 'approved',
            reviewDecisionAt: new Date(),
            reviewDecidedById: cmd.decidedById,
          },
          create: {
            klubId: cmd.klubId,
            reviewStatus: 'approved',
            reviewDecisionAt: new Date(),
            reviewDecidedById: cmd.decidedById,
          },
        });

        const updated = { id: cmd.klubId, slug: klub.slug };

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
      })
      .then(async (updated) => {
        await this.audit.record({
          actorId: cmd.decidedById,
          action: 'klub.approved',
          targetType: 'klub',
          targetId: cmd.klubId,
          before: { reviewStatus: 'pending' },
          after: { reviewStatus: 'approved' },
        });
        this.metrics.klubReviewDecided('approved');
        return updated;
      });
  }
}
