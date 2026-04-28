import { ConflictException, Injectable, BadRequestException } from '@nestjs/common';
import { KlubPrismaRepository } from '../../infrastructure/repositories/klub.prisma.repository';
import { EncryptionService } from '../../../../shared/encryption/encryption.service';
import { CepGeocoderService } from '../../../../shared/geocoding/cep-geocoder.service';
import { CnpjLookupService } from '../../../../shared/lookup/cnpj-lookup.service';
import { DocumentVO } from '../../domain/value-objects/document.vo';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { generateKlubSlug, slugify } from '../slug-generator';

export interface CreateKlubCommand {
  name: string;
  type?: string;
  city?: string;
  state?: string;
  timezone?: string;
  email?: string;
  phone?: string;
  /** Obrigatório agora — Sprint D PR1. */
  entityType: 'pj' | 'pf';
  /** CNPJ (14 dígitos) — obrigatório se PJ. */
  document?: string;
  /** CPF (11 dígitos) — obrigatório se PF e User.documentNumber=null. */
  creatorCpf?: string;
  legalName?: string;
  /** Sprint Polish PR-G — apelido popular (BrasilAPI nomeFantasia). */
  commonName?: string;
  /** Sprint Polish PR-G — abreviação curta (manual). */
  abbreviation?: string;
  sportCodes?: string[];
  parentKlubId?: string;
  isGroup?: boolean;
  onboardingSource?: 'self_service' | 'sales_led';
  createdById?: string;
  plan?: string;
  discoverable?: boolean;
  accessMode?: 'public' | 'private';
  cep?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  addressNeighborhood?: string;
  addressSource?: 'cnpj_lookup' | 'manual';
}

export interface CreateKlubResult {
  id: string;
  name: string;
  slug: string;
  type: string;
  plan: string;
  status: string;
  city: string | null;
  state: string | null;
  reviewStatus: string;
}

const MAX_SLUG_SUFFIX_ATTEMPTS = 99;

@Injectable()
export class CreateKlubHandler {
  constructor(
    private readonly klubRepo: KlubPrismaRepository,
    private readonly encryption: EncryptionService,
    private readonly geocoder: CepGeocoderService,
    private readonly cnpjLookup: CnpjLookupService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(cmd: CreateKlubCommand): Promise<CreateKlubResult> {
    // 1. Resolver identidade legal
    let documentEncrypted: string | undefined;
    let documentIv: string | undefined;
    let documentHint: string | undefined;
    let cnpjStatus: string | undefined;
    let cnpjLookupData: Record<string, unknown> | undefined;
    let cnpjStatusCheckedAt: Date | undefined;
    let resolvedLegalName = cmd.legalName;

    if (cmd.entityType === 'pj') {
      if (!cmd.document) {
        throw new BadRequestException({
          type: 'document_required',
          message: 'CNPJ é obrigatório para Klub PJ.',
        });
      }
      const docVO = DocumentVO.tryCreate(cmd.document, 'cnpj');
      if (!docVO) {
        throw new BadRequestException({
          type: 'document_invalid',
          message: 'CNPJ inválido.',
        });
      }
      const { encrypted, iv } = this.encryption.encrypt(docVO.value);
      documentEncrypted = encrypted;
      documentIv = iv;
      documentHint = docVO.hint();

      // Lookup BrasilAPI — pega snapshot independente da situação cadastral.
      // Status fica salvo pro admin auditar; user não vê o resultado.
      const lookup = await this.cnpjLookup.lookup(docVO.value);
      if (lookup) {
        cnpjStatus = lookup.situacaoCadastral ?? undefined;
        cnpjStatusCheckedAt = new Date();
        cnpjLookupData = lookup as unknown as Record<string, unknown>;
        if (!resolvedLegalName && lookup.razaoSocial) {
          resolvedLegalName = lookup.razaoSocial;
        }
      }
    } else if (cmd.entityType === 'pf') {
      // PF reusa o CPF do User criador. Se não veio creatorCpf e o user
      // não tem CPF cadastrado, bloqueamos. Se veio, validamos e fazemos
      // upsert no User (set se null; conflito 409 se diferente do existente).
      if (!cmd.createdById) {
        throw new BadRequestException({
          type: 'creator_required',
          message: 'Klub PF exige user criador autenticado.',
        });
      }
      const user = await this.prisma.user.findUnique({
        where: { id: cmd.createdById },
        select: { documentNumber: true },
      });
      let cpf = user?.documentNumber ?? null;
      if (cmd.creatorCpf) {
        const cpfVO = DocumentVO.tryCreate(cmd.creatorCpf, 'cpf');
        if (!cpfVO) {
          throw new BadRequestException({
            type: 'cpf_invalid',
            message: 'CPF inválido.',
          });
        }
        if (cpf && cpf !== cpfVO.value) {
          throw new ConflictException({
            type: 'cpf_conflict',
            message: 'CPF informado difere do cadastrado no seu perfil.',
          });
        }
        if (!cpf) {
          await this.prisma.user.update({
            where: { id: cmd.createdById },
            data: { documentNumber: cpfVO.value, documentType: 'cpf' },
          });
          cpf = cpfVO.value;
        }
      }
      if (!cpf) {
        throw new BadRequestException({
          type: 'cpf_required',
          message:
            'CPF é obrigatório para Klub PF. Cadastre seu CPF no perfil ou informe no formulário.',
        });
      }
    }

    // 2. Gerar slug único (server-side, não confia no cliente)
    const slug = await this.generateUniqueSlug(
      cmd.name,
      cmd.addressNeighborhood ?? null,
      cmd.city ?? null,
    );

    // 3. Geocoding CEP -> lat/lng (silent fail)
    const geo = cmd.cep ? await this.geocodeOrEmpty(cmd.cep) : {};

    // 4. Persistir
    const result = await this.klubRepo.create({
      name: cmd.name,
      slug,
      type: cmd.type ?? 'sports_club',
      city: cmd.city,
      state: cmd.state,
      timezone: cmd.timezone ?? 'America/Sao_Paulo',
      email: cmd.email,
      phone: cmd.phone,
      entityType: cmd.entityType,
      documentEncrypted,
      documentIv,
      documentHint,
      legalName: resolvedLegalName,
      commonName: cmd.commonName,
      abbreviation: cmd.abbreviation,
      sportCodes: cmd.sportCodes ?? [],
      parentKlubId: cmd.parentKlubId,
      isGroup: cmd.isGroup ?? false,
      onboardingSource: cmd.onboardingSource ?? 'self_service',
      createdById: cmd.createdById,
      plan: cmd.plan ?? 'trial',
      discoverable: cmd.discoverable ?? false,
      accessMode: cmd.accessMode ?? 'public',
      cep: cmd.cep,
      addressStreet: cmd.addressStreet,
      addressNumber: cmd.addressNumber,
      addressComplement: cmd.addressComplement,
      addressNeighborhood: cmd.addressNeighborhood,
      addressSource: cmd.addressSource,
      cnpjStatus,
      cnpjStatusCheckedAt,
      cnpjLookupData,
      reviewStatus: 'pending',
      ...geo,
    });

    return { ...result, reviewStatus: 'pending' };
  }

  private async geocodeOrEmpty(cep: string): Promise<{ latitude?: number; longitude?: number }> {
    const coords = await this.geocoder.geocode(cep);
    if (!coords) return {};
    return { latitude: coords.latitude, longitude: coords.longitude };
  }

  /**
   * Slug determinístico baseado em nome+bairro+cidade. Conflito → sufixo
   * incremental (`-2`, `-3`...). Uniqueness final é race-safe via constraint
   * `slug @unique` no DB; se colidir mesmo após o probe, repository levanta
   * P2002 e a transação aborta.
   */
  private async generateUniqueSlug(
    name: string,
    neighborhood: string | null,
    city: string | null,
  ): Promise<string> {
    const base = generateKlubSlug(name, neighborhood, city);
    if (!base) {
      // Nome só com símbolos — fallback paranóide.
      return `klub-${Date.now()}`;
    }
    const exists = await this.klubRepo.findBySlug(base);
    if (!exists) return base;
    for (let i = 2; i <= MAX_SLUG_SUFFIX_ATTEMPTS; i++) {
      const candidate = `${base}-${i}`;
      const c = await this.klubRepo.findBySlug(candidate);
      if (!c) return candidate;
    }
    // 99 colisões já é absurdo; cai em sufixo timestamp.
    return `${base}-${Date.now()}`;
  }
}

export { slugify };
