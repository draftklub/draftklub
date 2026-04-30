import { Injectable, NotFoundException } from '@nestjs/common';
import type { MeResponse, NotificationPrefs, RoleAssignment } from '@draftklub/shared-types';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { EncryptionService } from '../../../../shared/encryption/encryption.service';

/**
 * GET /me — retorna o User completo do DB + roleAssignments do contexto
 * Firebase. Antes era stateless (só dados do AuthenticatedUser); agora
 * faz query pra incluir fields editáveis (phone, birthDate, gender,
 * city, state, avatarUrl).
 *
 * birthDate é serializado como ISO `YYYY-MM-DD` (sem time) porque o
 * schema é `@db.Date`.
 */
@Injectable()
export class GetMeHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(userId: string, roleAssignments: RoleAssignment[]): Promise<MeResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return {
      id: user.id,
      email: user.email,
      firebaseUid: user.firebaseUid,
      fullName: user.fullName,
      phone: user.phone,
      birthDate: user.birthDate ? toIsoDate(user.birthDate) : null,
      avatarUrl: user.avatarUrl,
      gender: user.gender ?? null,
      city: user.city,
      state: user.state,
      cep: this.encryption.decryptFromString(user.cep),
      addressStreet: this.encryption.decryptFromString(user.addressStreet),
      addressNumber: this.encryption.decryptFromString(user.addressNumber),
      addressComplement: this.encryption.decryptFromString(user.addressComplement),
      addressNeighborhood: this.encryption.decryptFromString(user.addressNeighborhood),
      latitude: user.latitude,
      longitude: user.longitude,
      documentNumber: this.encryption.decryptFromString(user.documentNumber),
      documentType: user.documentType ?? null,
      notificationPrefs: (user.notificationPrefs as NotificationPrefs | null) ?? {},
      roleAssignments,
    };
  }
}

function toIsoDate(d: Date): string {
  // Date column do Prisma vem como JS Date com time zerado em UTC.
  // toISOString().slice(0, 10) → YYYY-MM-DD.
  return d.toISOString().slice(0, 10);
}
