import { Injectable, NotFoundException } from '@nestjs/common';
import type { Klub, KlubStatus } from '@draftklub/shared-types';
import { KlubPrismaRepository } from '../../infrastructure/repositories/klub.prisma.repository';
import { mapKlubConfig } from '../mappers/klub-config.mapper';

@Injectable()
export class GetKlubByIdHandler {
  constructor(private readonly klubRepo: KlubPrismaRepository) {}

  /**
   * Sprint D PR1: Klubs com `reviewStatus !== 'approved'` ficam ocultos
   * pra todo mundo, EXCETO o criador (que pode acompanhar o pending no
   * /escolher-klub e /criar-klub/sucesso). 404 ao invés de 403 pra não
   * vazar existência.
   */
  async execute(id: string, viewerId?: string): Promise<Klub> {
    const klub = await this.klubRepo.findById(id);
    if (!klub) throw new NotFoundException(`Klub ${id} not found`);

    if ((klub.review?.reviewStatus ?? 'pending') !== 'approved' && klub.createdById !== viewerId) {
      throw new NotFoundException(`Klub ${id} not found`);
    }

    return {
      id: klub.id,
      name: klub.name,
      slug: klub.slug,
      abbreviation: klub.abbreviation,
      commonName: klub.commonName,
      description: klub.description,
      type: klub.type,
      plan: klub.plan,
      status: klub.status as KlubStatus,
      city: klub.city,
      state: klub.state,
      timezone: klub.timezone,
      email: klub.email,
      phone: klub.phone,
      website: klub.website,
      avatarUrl: klub.avatarUrl,
      coverUrl: klub.coverUrl,
      documentHint: klub.legal?.documentHint ?? null,
      legalName: klub.legal?.legalName ?? null,
      isGroup: klub.isGroup,
      parentKlubId: klub.parentKlubId,
      sports: klub.sportProfiles.map((s) => s.sportCode),
      config: mapKlubConfig(klub.config),
      discoverable: klub.discoverable,
      accessMode: klub.accessMode ?? 'public',
      cep: klub.cep,
      addressStreet: klub.addressStreet,
      addressNumber: klub.addressNumber,
      addressComplement: klub.addressComplement,
      addressNeighborhood: klub.addressNeighborhood,
      latitude: klub.latitude ? Number(klub.latitude) : null,
      longitude: klub.longitude ? Number(klub.longitude) : null,
      reviewStatus: klub.review?.reviewStatus ?? 'pending',
      reviewRejectionReason: klub.review?.reviewRejectionReason ?? null,
      createdAt: klub.createdAt.toISOString(),
    };
  }
}
