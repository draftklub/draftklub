import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface UpdateKlubPatch {
  // Identidade
  name?: string;
  description?: string | null;
  type?: 'sports_club' | 'condo' | 'school' | 'public_space' | 'academy' | 'individual';
  avatarUrl?: string | null;
  coverUrl?: string | null;

  // Contato
  email?: string | null;
  phone?: string | null;
  website?: string | null;

  // Endereço
  cep?: string | null;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  addressNeighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  addressSource?: 'cnpj_lookup' | 'manual' | null;
  latitude?: number | null;
  longitude?: number | null;

  // Visibilidade
  discoverable?: boolean;
  accessMode?: 'public' | 'private';

  // JSONB livre
  amenities?: Record<string, unknown>;

  // SUPER_ADMIN-only (não passados quando isSuperAdmin=false)
  legalName?: string | null;
  plan?: 'trial' | 'starter' | 'pro' | 'elite' | 'enterprise';
  status?: 'trial' | 'active' | 'suspended' | 'churned' | 'pending_payment';
  maxMembers?: number;
  maxSports?: number;
  maxCourts?: number;
}

export interface UpdateKlubCommand {
  klubId: string;
  patch: UpdateKlubPatch;
  isSuperAdmin: boolean;
}

const SUPER_ADMIN_ONLY_FIELDS: (keyof UpdateKlubPatch)[] = [
  'legalName',
  'plan',
  'status',
  'maxMembers',
  'maxSports',
  'maxCourts',
];

/**
 * Sprint Polish PR-F — KLUB_ADMIN edita campos user-facing do Klub
 * (identidade, contato, endereço, amenities, visibilidade). SUPER_ADMIN
 * adicionalmente pode mexer em campos sensíveis (legalName, plan, status,
 * limites operacionais).
 *
 * Campos imutáveis nessa rota: slug (rompe URLs), entityType, document
 * (KYC), reviewStatus, kycStatus, parentKlubId/isGroup/billingKlubId,
 * createdById, trialEndsAt. Mudança nesses precisa de fluxo separado
 * (admin de cadastros / billing).
 */
@Injectable()
export class UpdateKlubHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: UpdateKlubCommand) {
    const klub = await this.prisma.klub.findUnique({ where: { id: cmd.klubId } });
    if (!klub || klub.deletedAt) throw new NotFoundException('Klub não encontrado');

    if (!cmd.isSuperAdmin) {
      for (const field of SUPER_ADMIN_ONLY_FIELDS) {
        if (cmd.patch[field] !== undefined) {
          throw new BadRequestException(`Campo '${field}' só pode ser alterado por SUPER_ADMIN`);
        }
      }
    }

    const data: Prisma.KlubUpdateInput = {};
    const p = cmd.patch;
    if (p.name !== undefined) data.name = p.name;
    if (p.description !== undefined) data.description = p.description;
    if (p.type !== undefined) data.type = p.type;
    if (p.avatarUrl !== undefined) data.avatarUrl = p.avatarUrl;
    if (p.coverUrl !== undefined) data.coverUrl = p.coverUrl;
    if (p.email !== undefined) data.email = p.email;
    if (p.phone !== undefined) data.phone = p.phone;
    if (p.website !== undefined) data.website = p.website;
    if (p.cep !== undefined) data.cep = p.cep;
    if (p.addressStreet !== undefined) data.addressStreet = p.addressStreet;
    if (p.addressNumber !== undefined) data.addressNumber = p.addressNumber;
    if (p.addressComplement !== undefined) data.addressComplement = p.addressComplement;
    if (p.addressNeighborhood !== undefined) data.addressNeighborhood = p.addressNeighborhood;
    if (p.city !== undefined) data.city = p.city;
    if (p.state !== undefined) data.state = p.state;
    if (p.addressSource !== undefined) data.addressSource = p.addressSource;
    if (p.latitude !== undefined) data.latitude = p.latitude;
    if (p.longitude !== undefined) data.longitude = p.longitude;
    if (p.discoverable !== undefined) data.discoverable = p.discoverable;
    if (p.accessMode !== undefined) data.accessMode = p.accessMode;
    if (p.amenities !== undefined) data.amenities = p.amenities as Prisma.InputJsonValue;

    if (cmd.isSuperAdmin) {
      if (p.legalName !== undefined) data.legalName = p.legalName;
      if (p.plan !== undefined) data.plan = p.plan;
      if (p.status !== undefined) data.status = p.status;
      if (p.maxMembers !== undefined) data.maxMembers = p.maxMembers;
      if (p.maxSports !== undefined) data.maxSports = p.maxSports;
      if (p.maxCourts !== undefined) data.maxCourts = p.maxCourts;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Nenhum campo válido pra atualizar');
    }

    return this.prisma.klub.update({ where: { id: cmd.klubId }, data });
  }
}
