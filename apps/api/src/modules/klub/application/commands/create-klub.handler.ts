import { ConflictException, Injectable } from '@nestjs/common';
import { KlubPrismaRepository } from '../../infrastructure/repositories/klub.prisma.repository';
import { EncryptionService } from '../../../../shared/encryption/encryption.service';
import { DocumentVO } from '../../domain/value-objects/document.vo';
import type { DocumentType } from '../../domain/value-objects/document.vo';

export interface CreateKlubCommand {
  name: string;
  /** Slug opcional (kebab-case). Se omitido, gerado do nome (+ cidade). */
  slug?: string;
  type?: string;
  city?: string;
  state?: string;
  timezone?: string;
  email?: string;
  phone?: string;
  entityType?: 'pj' | 'pf';
  document?: string;
  legalName?: string;
  sportCodes?: string[];
  parentKlubId?: string;
  isGroup?: boolean;
  onboardingSource?: 'self_service' | 'sales_led';
  createdById?: string;
  plan?: string;
  /** Sprint B: opt-in pra `GET /klubs/discover`. Default false. */
  discoverable?: boolean;
  /** Sprint B: 'public' (entrada livre) | 'private' (request flow Sprint C). */
  accessMode?: 'public' | 'private';
  cep?: string;
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
}

@Injectable()
export class CreateKlubHandler {
  constructor(
    private readonly klubRepo: KlubPrismaRepository,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(cmd: CreateKlubCommand): Promise<CreateKlubResult> {
    const slug = cmd.slug
      ? await this.assertSlugAvailable(cmd.slug)
      : await this.generateSlug(cmd.name, cmd.city);

    let documentEncrypted: string | undefined;
    let documentIv: string | undefined;
    let documentHint: string | undefined;

    if (cmd.document && cmd.entityType) {
      const docVO = DocumentVO.tryCreate(cmd.document, cmd.entityType as DocumentType);
      if (!docVO) {
        throw new Error(`Invalid ${cmd.entityType.toUpperCase()}: ${cmd.document}`);
      }
      const { encrypted, iv } = this.encryption.encrypt(docVO.value);
      documentEncrypted = encrypted;
      documentIv = iv;
      documentHint = docVO.hint();
    }

    return this.klubRepo.create({
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
      legalName: cmd.legalName,
      sportCodes: cmd.sportCodes ?? [],
      parentKlubId: cmd.parentKlubId,
      isGroup: cmd.isGroup ?? false,
      onboardingSource: cmd.onboardingSource ?? 'self_service',
      createdById: cmd.createdById,
      plan: cmd.plan ?? 'trial',
      discoverable: cmd.discoverable ?? false,
      accessMode: cmd.accessMode ?? 'public',
      cep: cmd.cep,
    });
  }

  /**
   * Valida slug fornecido pelo cliente. Se já em uso, lança 409 com
   * payload tipado pra UI mostrar erro contextual no campo.
   */
  private async assertSlugAvailable(slug: string): Promise<string> {
    const exists = await this.klubRepo.findBySlug(slug);
    if (exists) {
      throw new ConflictException({
        type: 'slug_unavailable',
        slug,
        message: `Slug "${slug}" já está em uso. Escolha outro.`,
      });
    }
    return slug;
  }

  private async generateSlug(name: string, city?: string): Promise<string> {
    const base = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const exists = await this.klubRepo.findBySlug(base);
    if (!exists) return base;

    if (city) {
      const citySlug = city
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const withCity = `${base}-${citySlug}`;
      const existsWithCity = await this.klubRepo.findBySlug(withCity);
      if (!existsWithCity) return withCity;
    }

    return `${base}-${Date.now()}`;
  }
}
