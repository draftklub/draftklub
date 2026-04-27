import { Injectable, NotFoundException } from '@nestjs/common';
import type { Gender, MeResponse, RoleAssignment } from '@draftklub/shared-types';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

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
      gender: (user.gender as Gender | null) ?? null,
      city: user.city,
      state: user.state,
      roleAssignments,
    };
  }
}

function toIsoDate(d: Date): string {
  // Date column do Prisma vem como JS Date com time zerado em UTC.
  // toISOString().slice(0, 10) → YYYY-MM-DD.
  return d.toISOString().slice(0, 10);
}
