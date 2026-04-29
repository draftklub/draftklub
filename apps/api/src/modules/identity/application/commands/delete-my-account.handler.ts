import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { AuditService } from '../../../../shared/audit/audit.service';

/**
 * Sprint M batch 8 — direito de exclusão LGPD (Art. 18 VI).
 *
 * Não DELETE físico: anonimiza todos PII fields e seta deletedAt.
 * Estratégia preserva integridade referencial em Bookings/Tournaments
 * (FKs com onDelete: Restrict) e mantém audit trail útil pra forensics.
 *
 * Bloqueia se o User é o ÚNICO KLUB_ADMIN ativo de algum Klub —
 * exclusão criaria Klub órfão. User precisa transferir admin antes.
 *
 * Firebase user permanece — o cliente faz `auth.currentUser.delete()`
 * separado pra não acoplar API a 1 RTT extra ao Firebase.
 */
@Injectable()
export class DeleteMyAccountHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async execute(userId: string): Promise<{ id: string; anonymizedAt: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, deletedAt: true },
    });
    if (!user) {
      throw new BadRequestException(`User ${userId} not found`);
    }
    if (user.deletedAt) {
      throw new BadRequestException('Account already deleted');
    }

    // Bloqueia se sole KLUB_ADMIN de algum Klub.
    const adminAssignments = await this.prisma.roleAssignment.findMany({
      where: { userId, role: 'KLUB_ADMIN', scopeKlubId: { not: null } },
      select: { scopeKlubId: true },
    });
    if (adminAssignments.length > 0) {
      throw new ConflictException({
        type: 'sole_klub_admin',
        klubIds: adminAssignments.map((a) => a.scopeKlubId),
        message:
          'Você ainda é KLUB_ADMIN de pelo menos um Klub. Transfira a administração antes de excluir a conta.',
      });
    }

    const now = new Date();
    const anonymizedEmail = `deleted-${userId}@deleted.local`;

    return this.prisma.$transaction(async (tx) => {
      const previousEmail = user.email;

      await tx.user.update({
        where: { id: userId },
        data: {
          email: anonymizedEmail,
          firebaseUid: null,
          fullName: 'Conta excluída',
          phone: null,
          birthDate: null,
          avatarUrl: null,
          gender: null,
          city: null,
          state: null,
          cep: null,
          addressStreet: null,
          addressNumber: null,
          addressComplement: null,
          addressNeighborhood: null,
          latitude: null,
          longitude: null,
          documentNumber: null,
          documentType: null,
          notificationPrefs: {},
          deletedAt: now,
        },
      });

      // Suspende memberships ativas (mantém histórico, não vira lixo).
      await tx.membership.updateMany({
        where: { userId, status: 'active' },
        data: { status: 'inactive' },
      });

      // Revoga roleAssignments não-platform (PLAYER/STAFF/etc). Platform
      // roles são singleton e bloqueadas acima. KLUB_ADMIN também.
      await tx.roleAssignment.deleteMany({
        where: {
          userId,
          role: { notIn: ['PLATFORM_OWNER', 'PLATFORM_ADMIN', 'KLUB_ADMIN'] },
        },
      });

      await this.audit.record({
        actorId: userId,
        action: 'user.deleted',
        targetType: 'user',
        targetId: userId,
        before: { email: previousEmail },
        after: { email: anonymizedEmail, anonymizedAt: now.toISOString() },
      });

      return { id: userId, anonymizedAt: now.toISOString() };
    });
  }
}
