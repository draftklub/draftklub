import { Injectable, NotFoundException } from '@nestjs/common';
import type { Gender, MeResponse, RoleAssignment } from '@draftklub/shared-types';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import type { UpdateMeDto } from '../../api/dtos/update-me.dto';

export interface UpdateMeCommand {
  userId: string;
  roleAssignments: RoleAssignment[];
  dto: UpdateMeDto;
}

/**
 * PATCH /me — atualização parcial do User. Só campos presentes no
 * `dto` são tocados (Prisma `data: { ...definedFields }`). Endpoint
 * retorna `MeResponse` completo pós-update pra cliente recarregar
 * sem segundo round-trip.
 */
@Injectable()
export class UpdateMeHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: UpdateMeCommand): Promise<MeResponse> {
    const { userId, dto, roleAssignments } = cmd;

    // Filtrar undefined: Prisma update aceita parcial, mas null
    // significa "set to null". Aqui só passamos fields que vieram.
    const data: Record<string, unknown> = {};
    if (dto.fullName !== undefined) data.fullName = dto.fullName;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.birthDate !== undefined) data.birthDate = new Date(dto.birthDate);
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl;
    if (dto.gender !== undefined) data.gender = dto.gender;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.state !== undefined) data.state = dto.state;

    let user;
    try {
      user = await this.prisma.user.update({
        where: { id: userId },
        data,
      });
    } catch (err) {
      // P2025 = record not found
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2025'
      ) {
        throw new NotFoundException(`User ${userId} not found`);
      }
      throw err;
    }

    return {
      id: user.id,
      email: user.email,
      firebaseUid: user.firebaseUid,
      fullName: user.fullName,
      phone: user.phone,
      birthDate: user.birthDate ? user.birthDate.toISOString().slice(0, 10) : null,
      avatarUrl: user.avatarUrl,
      gender: (user.gender as Gender | null) ?? null,
      city: user.city,
      state: user.state,
      roleAssignments,
    };
  }
}
