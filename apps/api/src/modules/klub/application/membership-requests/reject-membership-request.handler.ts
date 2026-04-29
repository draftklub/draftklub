import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { MetricsService } from '../../../../shared/metrics/metrics.service';

export interface RejectMembershipRequestCommand {
  requestId: string;
  klubId: string;
  decidedById: string;
  reason: string;
}

const MIN_REASON = 10;
const MAX_REASON = 500;

@Injectable()
export class RejectMembershipRequestHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsService,
  ) {}

  async execute(cmd: RejectMembershipRequestCommand): Promise<{ id: string }> {
    const reason = cmd.reason.trim();
    if (reason.length < MIN_REASON) {
      throw new BadRequestException(`Motivo precisa ter pelo menos ${MIN_REASON} caracteres.`);
    }
    if (reason.length > MAX_REASON) {
      throw new BadRequestException(`Motivo não pode passar de ${MAX_REASON} caracteres.`);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const req = await tx.membershipRequest.findUnique({
        where: { id: cmd.requestId },
        select: {
          id: true,
          klubId: true,
          userId: true,
          status: true,
          klub: { select: { name: true } },
        },
      });
      if (req?.klubId !== cmd.klubId) {
        throw new NotFoundException(`Solicitação ${cmd.requestId} não encontrada`);
      }
      if (req.status !== 'pending') {
        throw new BadRequestException(
          `Solicitação ${cmd.requestId} já foi decidida (status=${req.status}).`,
        );
      }

      await tx.membershipRequest.update({
        where: { id: req.id },
        data: {
          status: 'rejected',
          decisionAt: new Date(),
          decidedById: cmd.decidedById,
          rejectionReason: reason,
        },
      });

      await tx.outboxEvent.create({
        data: {
          eventType: 'klub.membership_request.rejected',
          payload: {
            requestId: req.id,
            klubId: req.klubId,
            klubName: req.klub.name,
            userId: req.userId,
            decidedById: cmd.decidedById,
            reason,
          },
        },
      });

      return { id: req.id };
    });
    this.metrics.membershipRequestDecided('rejected');
    return result;
  }
}
