import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { AuditService } from '../../../../shared/audit/audit.service';

export interface RejectKlubCommand {
  klubId: string;
  decidedById: string;
  reason: string;
}

const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 500;

/**
 * Rejeita cadastro pendente com motivo (mín 10 chars, max 500 — dá pro
 * admin escrever uma frase explicativa que vai pro email do criador).
 */
@Injectable()
export class RejectKlubHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async execute(cmd: RejectKlubCommand): Promise<{ id: string }> {
    const reason = cmd.reason.trim();
    if (reason.length < MIN_REASON_LENGTH) {
      throw new BadRequestException(
        `Motivo da rejeição precisa ter pelo menos ${MIN_REASON_LENGTH} caracteres.`,
      );
    }
    if (reason.length > MAX_REASON_LENGTH) {
      throw new BadRequestException(
        `Motivo da rejeição não pode passar de ${MAX_REASON_LENGTH} caracteres.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const klub = await tx.klub.findUnique({
        where: { id: cmd.klubId },
        select: {
          id: true,
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

      await tx.klub.update({
        where: { id: cmd.klubId },
        data: {
          reviewStatus: 'rejected',
          reviewDecisionAt: new Date(),
          reviewDecidedById: cmd.decidedById,
          reviewRejectionReason: reason,
        },
      });

      await tx.outboxEvent.create({
        data: {
          eventType: 'klub.review.rejected',
          payload: {
            klubId: klub.id,
            klubName: klub.name,
            createdById: klub.createdById,
            decidedById: cmd.decidedById,
            reason,
          },
        },
      });

      return { id: klub.id };
    }).then(async (result) => {
      await this.audit.record({
        actorId: cmd.decidedById,
        action: 'klub.rejected',
        targetType: 'klub',
        targetId: cmd.klubId,
        before: { reviewStatus: 'pending' },
        after: { reviewStatus: 'rejected' },
        metadata: { reason },
      });
      return result;
    });
  }
}
