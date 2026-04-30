import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { EncryptionService } from '../../../../shared/encryption/encryption.service';
import { DocumentVO } from '../../domain/value-objects/document.vo';

export interface UpdateKlubPatch {
  // Identidade
  name?: string;
  abbreviation?: string | null;
  commonName?: string | null;
  description?: string | null;
  type?:
    | 'sports_club'
    | 'arena'
    | 'academy'
    | 'condo'
    | 'hotel_resort'
    | 'university'
    | 'school'
    | 'public_space'
    | 'individual';
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
  /** Sprint Polish PR-G — slug muda URL/cookies. SUPER_ADMIN-only. */
  slug?: string;
  /** Sprint Polish PR-G — CNPJ. Re-encripta. SUPER_ADMIN-only. */
  document?: string;
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
  'slug',
  'document',
];

/**
 * Sprint Polish PR-F/G — KLUB_ADMIN edita campos user-facing do Klub.
 * SUPER_ADMIN adicionalmente edita campos sensíveis (legalName, plan,
 * status, limites, slug, CNPJ).
 *
 * Slug: validação de unicidade com 409 quando taken.
 * CNPJ: re-encripta via EncryptionService + atualiza hint.
 *
 * NOT changed automatically on CNPJ swap: reviewStatus, kycStatus —
 * SUPER_ADMIN deve revalidar manualmente se necessário.
 */
@Injectable()
export class UpdateKlubHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

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
    const legalData: Record<string, unknown> = {};
    const p = cmd.patch;
    if (p.name !== undefined) data.name = p.name;
    if (p.abbreviation !== undefined) data.abbreviation = p.abbreviation;
    if (p.commonName !== undefined) data.commonName = p.commonName;
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
      if (p.legalName !== undefined) legalData.legalName = p.legalName;
      if (p.plan !== undefined) data.plan = p.plan;
      if (p.status !== undefined) data.status = p.status;
      if (p.maxMembers !== undefined) data.maxMembers = p.maxMembers;
      if (p.maxSports !== undefined) data.maxSports = p.maxSports;
      if (p.maxCourts !== undefined) data.maxCourts = p.maxCourts;

      if (p.slug !== undefined && p.slug !== klub.slug) {
        const conflict = await this.prisma.klub.findFirst({
          where: { slug: p.slug, id: { not: klub.id }, deletedAt: null },
          select: { id: true, name: true },
        });
        if (conflict) {
          throw new ConflictException({
            type: 'slug_taken',
            conflictKlubId: conflict.id,
            conflictKlubName: conflict.name,
            message: `Slug '${p.slug}' já está em uso por '${conflict.name}'`,
          });
        }
        data.slug = p.slug;
      }

      if (p.document !== undefined) {
        const docVO = DocumentVO.tryCreate(p.document, 'cnpj');
        if (!docVO) {
          throw new BadRequestException('CNPJ inválido (dígito verificador)');
        }
        const { encrypted, iv } = this.encryption.encrypt(docVO.value);
        legalData.documentEncrypted = encrypted;
        legalData.documentIv = iv;
        legalData.documentHint = docVO.hint();
      }
    }

    if (Object.keys(data).length === 0 && Object.keys(legalData).length === 0) {
      throw new BadRequestException('Nenhum campo válido pra atualizar');
    }

    let updatedKlub;
    if (Object.keys(data).length > 0) {
      updatedKlub = await this.prisma.klub.update({ where: { id: cmd.klubId }, data });
    }
    if (Object.keys(legalData).length > 0) {
      await this.prisma.klubLegal.upsert({
        where: { klubId: cmd.klubId },
        create: { klubId: cmd.klubId, ...legalData },
        update: legalData,
      });
    }
    return updatedKlub ?? this.prisma.klub.findUnique({ where: { id: cmd.klubId } });
  }
}
