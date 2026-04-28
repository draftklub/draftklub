import { Injectable, NotFoundException } from '@nestjs/common';
import type { KlubAccessMode, KlubReviewStatus } from '@draftklub/shared-types';
import { KlubPrismaRepository } from '../../infrastructure/repositories/klub.prisma.repository';
import { mapKlubConfig } from '../mappers/klub-config.mapper';

@Injectable()
export class GetKlubBySlugHandler {
  constructor(private readonly klubRepo: KlubPrismaRepository) {}

  /**
   * Sprint D PR1: pendentes ficam visíveis só pro criador. Demais 404.
   */
  async execute(slug: string, viewerId?: string) {
    const klub = await this.klubRepo.findBySlug(slug);
    if (!klub) throw new NotFoundException(`Klub '${slug}' not found`);

    if (klub.reviewStatus !== 'approved' && klub.createdById !== viewerId) {
      throw new NotFoundException(`Klub '${slug}' not found`);
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
      status: klub.status,
      city: klub.city,
      state: klub.state,
      timezone: klub.timezone,
      email: klub.email,
      phone: klub.phone,
      website: klub.website,
      avatarUrl: klub.avatarUrl,
      coverUrl: klub.coverUrl,
      documentHint: klub.documentHint,
      legalName: klub.legalName,
      isGroup: klub.isGroup,
      parentKlubId: klub.parentKlubId,
      sports: klub.sportProfiles.map((s) => s.sportCode),
      config: mapKlubConfig(klub.config),
      discoverable: klub.discoverable,
      accessMode: (klub.accessMode as KlubAccessMode) ?? 'public',
      cep: klub.cep,
      addressStreet: klub.addressStreet,
      addressNumber: klub.addressNumber,
      addressComplement: klub.addressComplement,
      addressNeighborhood: klub.addressNeighborhood,
      reviewStatus: klub.reviewStatus as KlubReviewStatus,
      reviewRejectionReason: klub.reviewRejectionReason,
      createdAt: klub.createdAt,
    };
  }
}
