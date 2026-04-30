import { Injectable, NotFoundException } from '@nestjs/common';
import type { Klub, KlubStatus } from '@draftklub/shared-types';
import { KlubPrismaRepository } from '../../infrastructure/repositories/klub.prisma.repository';
import { mapKlubConfig } from '../mappers/klub-config.mapper';

@Injectable()
export class GetKlubBySlugHandler {
  constructor(private readonly klubRepo: KlubPrismaRepository) {}

  /**
   * Sprint D PR1: pendentes ficam visíveis só pro criador. Demais 404.
   *
   * Sprint N batch N-14 — return type pinned em `Klub` (shared-types)
   * pra travar contrato do wire format. TS quebra se shape divergir.
   */
  async execute(slug: string, viewerId?: string): Promise<Klub> {
    const klub = await this.klubRepo.findBySlug(slug);
    if (!klub) throw new NotFoundException(`Klub '${slug}' not found`);

    if ((klub.review?.reviewStatus ?? 'pending') !== 'approved' && klub.createdById !== viewerId) {
      throw new NotFoundException(`Klub '${slug}' not found`);
    }

    return {
      id: klub.id,
      name: klub.name,
      slug: klub.slug,
      abbreviation: klub.abbreviation,
      commonName: klub.commonName,
      description: klub.discovery?.description ?? null,
      type: klub.type,
      plan: klub.plan,
      status: klub.status as KlubStatus,
      city: klub.contact?.city ?? null,
      state: klub.contact?.state ?? null,
      timezone: klub.contact?.timezone ?? 'America/Sao_Paulo',
      email: klub.contact?.email ?? null,
      phone: klub.contact?.phone ?? null,
      website: klub.discovery?.website ?? null,
      avatarUrl: klub.discovery?.avatarUrl ?? null,
      coverUrl: klub.discovery?.coverUrl ?? null,
      documentHint: klub.legal?.documentHint ?? null,
      legalName: klub.legal?.legalName ?? null,
      isGroup: klub.isGroup,
      parentKlubId: klub.parentKlubId,
      sports: klub.sportProfiles.map((s) => s.sportCode),
      config: mapKlubConfig(klub.config),
      discoverable: klub.discovery?.discoverable ?? false,
      accessMode: klub.discovery?.accessMode ?? 'public',
      cep: klub.contact?.cep ?? null,
      addressStreet: klub.contact?.addressStreet ?? null,
      addressNumber: klub.contact?.addressNumber ?? null,
      addressComplement: klub.contact?.addressComplement ?? null,
      addressNeighborhood: klub.contact?.addressNeighborhood ?? null,
      latitude: klub.contact?.latitude ? Number(klub.contact.latitude) : null,
      longitude: klub.contact?.longitude ? Number(klub.contact.longitude) : null,
      reviewStatus: klub.review?.reviewStatus ?? 'pending',
      reviewRejectionReason: klub.review?.reviewRejectionReason ?? null,
      createdAt: klub.createdAt.toISOString(),
    };
  }
}
