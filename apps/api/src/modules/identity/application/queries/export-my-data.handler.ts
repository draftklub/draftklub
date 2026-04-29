import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { EncryptionService } from '../../../../shared/encryption/encryption.service';
import { AuditService } from '../../../../shared/audit/audit.service';

/**
 * Sprint M batch 8 — direito de portabilidade (LGPD Art. 18 V).
 * Retorna um JSON com TODOS os dados pessoais do User: profile, klubs,
 * roles, bookings, torneios, matches, memberships, solicitações.
 *
 * Campos cifrados (CPF, endereço) são decifrados antes de exportar —
 * o titular dos dados tem direito a ver em plaintext o que está
 * armazenado dele.
 */
@Injectable()
export class ExportMyDataHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly audit: AuditService,
  ) {}

  async execute(userId: string): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: { include: { klub: { select: { id: true, name: true, slug: true } } } },
        roleAssignments: true,
        rankingEntries: { include: { ranking: { select: { id: true, name: true } } } },
        matchesSubmitted: true,
        tournamentEntries: {
          include: { tournament: { select: { id: true, name: true } } },
        },
        responsibleForBookings: {
          select: { id: true, startsAt: true, endsAt: true, status: true, klubId: true },
        },
        sportEnrollments: true,
        membershipRequests: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    await this.audit.record({
      actorId: userId,
      action: 'user.data.exported',
      targetType: 'user',
      targetId: userId,
      metadata: { format: 'json', includesEncryptedFields: true },
    });

    return {
      exportedAt: new Date().toISOString(),
      schemaVersion: '2026-04-29-v1',
      profile: {
        id: user.id,
        email: user.email,
        firebaseUid: user.firebaseUid,
        fullName: user.fullName,
        phone: user.phone,
        birthDate: user.birthDate?.toISOString().slice(0, 10) ?? null,
        avatarUrl: user.avatarUrl,
        gender: user.gender,
        kind: user.kind,
        consentGivenAt: user.consentGivenAt?.toISOString() ?? null,
        consentVersion: user.consentVersion,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      address: {
        cep: this.encryption.decryptFromString(user.cep),
        street: this.encryption.decryptFromString(user.addressStreet),
        number: this.encryption.decryptFromString(user.addressNumber),
        complement: this.encryption.decryptFromString(user.addressComplement),
        neighborhood: this.encryption.decryptFromString(user.addressNeighborhood),
        city: user.city,
        state: user.state,
        latitude: user.latitude,
        longitude: user.longitude,
      },
      document: {
        type: user.documentType,
        number: this.encryption.decryptFromString(user.documentNumber),
      },
      notificationPrefs: user.notificationPrefs,
      memberships: user.memberships,
      roleAssignments: user.roleAssignments,
      rankingEntries: user.rankingEntries,
      matchesSubmitted: user.matchesSubmitted,
      tournamentEntries: user.tournamentEntries,
      bookings: user.responsibleForBookings,
      sportEnrollments: user.sportEnrollments,
      membershipRequests: user.membershipRequests,
    };
  }
}
