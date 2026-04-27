import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  DocumentType,
  Gender,
  MeResponse,
  NotificationPrefs,
  RoleAssignment,
} from '@draftklub/shared-types';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { CepGeocoderService } from '../../../../shared/geocoding/cep-geocoder.service';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly geocoder: CepGeocoderService,
  ) {}

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
    if (dto.cep !== undefined) {
      data.cep = dto.cep;
      // Geocoding CEP -> lat/lng. Falha silenciosa: deixa null e usuário
      // cai em fallback de browser geolocation no /buscar-klubs.
      const coords = dto.cep ? await this.geocoder.geocode(dto.cep) : null;
      data.latitude = coords?.latitude ?? null;
      data.longitude = coords?.longitude ?? null;
    }
    if (dto.addressStreet !== undefined) data.addressStreet = dto.addressStreet;
    if (dto.addressNumber !== undefined) data.addressNumber = dto.addressNumber;
    if (dto.addressComplement !== undefined) data.addressComplement = dto.addressComplement;
    if (dto.addressNeighborhood !== undefined) data.addressNeighborhood = dto.addressNeighborhood;
    if (dto.documentNumber !== undefined) {
      data.documentNumber = dto.documentNumber;
      // Setar CPF -> implicitamente seta type='cpf' se não veio explícito.
      data.documentType = dto.documentType ?? 'cpf';
    } else if (dto.documentType !== undefined) {
      data.documentType = dto.documentType;
    }
    if (dto.notificationPrefs !== undefined) {
      // Replace wholesale — UI envia objeto canônico completo. Onda 3
      // pode evoluir pra deep-merge se útil.
      data.notificationPrefs = dto.notificationPrefs;
    }

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
      cep: user.cep,
      addressStreet: user.addressStreet,
      addressNumber: user.addressNumber,
      addressComplement: user.addressComplement,
      addressNeighborhood: user.addressNeighborhood,
      latitude: user.latitude,
      longitude: user.longitude,
      documentNumber: user.documentNumber,
      documentType: (user.documentType as DocumentType | null) ?? null,
      notificationPrefs: (user.notificationPrefs as NotificationPrefs | null) ?? {},
      roleAssignments,
    };
  }
}
