import { Injectable } from '@nestjs/common';
import { KlubPrismaRepository } from '../../infrastructure/repositories/klub.prisma.repository';
import { EncryptionService } from '../../../../shared/encryption/encryption.service';
import { DocumentVO } from '../../domain/value-objects/document.vo';
import type { DocumentType } from '../../domain/value-objects/document.vo';

export interface CreateKlubCommand {
  name: string;
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
    const slug = await this.generateSlug(cmd.name, cmd.city);

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
    });
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
