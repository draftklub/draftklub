import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { PolicyEngine } from '../../../../shared/auth/policy.engine';
import type { AuthenticatedUser } from '../../../../shared/auth/authenticated-user.interface';

export interface TransferKlubAdminCommand {
  caller: AuthenticatedUser;
  klubId: string;
  targetEmail: string;
}

export interface TransferKlubAdminResult {
  klubId: string;
  oldAdminUserId: string;
  newAdminUserId: string;
}

/**
 * Sprint Polish PR-J3 — transferência de KLUB_ADMIN.
 *
 * Regras (alinhadas com decisão do user):
 * - Admin antigo sai LIMPO: removemos a row KLUB_ADMIN dele, não criamos
 *   KLUB_ASSISTANT automático. Membership permanece (continua sócio).
 * - Target precisa ter Membership active no Klub (evita transferência
 *   acidental pra email aleatório).
 * - Caller deve ser KLUB_ADMIN do próprio Klub OU Platform-level
 *   (Owner/Admin podem forçar em emergência).
 * - No-op (target == admin atual) → BadRequest.
 *
 * Tudo em transação. Emite outbox event `klub.admin.transferred`.
 */
@Injectable()
export class TransferKlubAdminHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyEngine,
  ) {}

  async execute(cmd: TransferKlubAdminCommand): Promise<TransferKlubAdminResult> {
    if (
      !this.policy.can(cmd.caller, 'role.transfer', {
        klubId: cmd.klubId,
        targetRole: 'KLUB_ADMIN',
      })
    ) {
      throw new ForbiddenException('Sem permissão pra transferir Klub Admin.');
    }

    const target = await this.prisma.user.findUnique({
      where: { email: cmd.targetEmail },
      select: { id: true },
    });
    if (!target) {
      throw new NotFoundException(`Nenhum user encontrado pro email ${cmd.targetEmail}.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const currentAdmin = await tx.roleAssignment.findFirst({
        where: { role: 'KLUB_ADMIN', scopeKlubId: cmd.klubId },
        select: { id: true, userId: true },
      });
      if (!currentAdmin) {
        throw new NotFoundException(
          `Klub ${cmd.klubId} não tem KLUB_ADMIN ativo — estado inconsistente.`,
        );
      }

      if (currentAdmin.userId === target.id) {
        throw new BadRequestException(
          'Target já é o KLUB_ADMIN atual — transferência seria no-op.',
        );
      }

      const targetMembership = await tx.membership.findUnique({
        where: { userId_klubId: { userId: target.id, klubId: cmd.klubId } },
        select: { status: true },
      });
      if (targetMembership?.status !== 'active') {
        throw new BadRequestException(
          'Target precisa ser membro ativo do Klub antes de virar admin.',
        );
      }

      const klub = await tx.klub.findUnique({
        where: { id: cmd.klubId },
        select: { name: true, slug: true },
      });
      if (!klub) {
        throw new NotFoundException(`Klub ${cmd.klubId} não encontrado.`);
      }

      // 1. Old admin sai limpo: deleta a row KLUB_ADMIN dele.
      await tx.roleAssignment.delete({ where: { id: currentAdmin.id } });

      // 2. Defensive cleanup: se target já tinha KLUB_ASSISTANT ou SPORT_*
      //    nesse Klub, KLUB_ADMIN trumps — removemos pra audit trail ficar
      //    limpo (target só tem KLUB_ADMIN dali em diante).
      await tx.roleAssignment.deleteMany({
        where: {
          userId: target.id,
          scopeKlubId: cmd.klubId,
          role: { in: ['KLUB_ASSISTANT', 'SPORT_COMMISSION', 'SPORT_STAFF'] },
        },
      });

      // 3. Cria a nova row KLUB_ADMIN. Unique partial index garante singleton.
      await tx.roleAssignment.create({
        data: {
          userId: target.id,
          role: 'KLUB_ADMIN',
          scopeKlubId: cmd.klubId,
          scopeSportId: null,
          grantedBy: cmd.caller.userId,
        },
      });

      await tx.outboxEvent.create({
        data: {
          eventType: 'klub.admin.transferred',
          payload: {
            klubId: cmd.klubId,
            klubName: klub.name,
            klubSlug: klub.slug,
            oldAdminUserId: currentAdmin.userId,
            newAdminUserId: target.id,
            transferredById: cmd.caller.userId,
          },
        },
      });

      return {
        klubId: cmd.klubId,
        oldAdminUserId: currentAdmin.userId,
        newAdminUserId: target.id,
      };
    });
  }
}
