import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface ApproveMembershipRequestCommand {
  requestId: string;
  klubId: string; // do route param — confere que request pertence ao Klub
  decidedById: string;
}

/**
 * KLUB_ADMIN aprova solicitação. Em transação:
 * 1. Marca request approved
 * 2. Upsert Membership active type=member
 * 3. Cria RoleAssignment PLAYER se não existir
 * 4. Emite OutboxEvent klub.membership_request.approved (worker manda email)
 *
 * Idempotente em re-aprovação não é suportado: handler exige status='pending'.
 */
@Injectable()
export class ApproveMembershipRequestHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: ApproveMembershipRequestCommand): Promise<{ id: string }> {
    return this.prisma.$transaction(async (tx) => {
      const req = await tx.membershipRequest.findUnique({
        where: { id: cmd.requestId },
        select: {
          id: true,
          klubId: true,
          userId: true,
          status: true,
          klub: { select: { name: true, slug: true } },
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
          status: 'approved',
          decisionAt: new Date(),
          decidedById: cmd.decidedById,
        },
      });

      await tx.membership.upsert({
        where: { userId_klubId: { userId: req.userId, klubId: req.klubId } },
        create: {
          userId: req.userId,
          klubId: req.klubId,
          type: 'member',
          status: 'active',
        },
        update: { status: 'active', type: 'member' },
      });

      const existingRole = await tx.roleAssignment.findFirst({
        where: {
          userId: req.userId,
          scopeKlubId: req.klubId,
          role: 'PLAYER',
        },
        select: { id: true },
      });
      if (!existingRole) {
        await tx.roleAssignment.create({
          data: {
            userId: req.userId,
            role: 'PLAYER',
            scopeKlubId: req.klubId,
            scopeSportId: null,
          },
        });
      }

      await tx.outboxEvent.create({
        data: {
          eventType: 'klub.membership_request.approved',
          payload: {
            requestId: req.id,
            klubId: req.klubId,
            klubName: req.klub.name,
            klubSlug: req.klub.slug,
            userId: req.userId,
            decidedById: cmd.decidedById,
          },
        },
      });

      return { id: req.id };
    });
  }
}
