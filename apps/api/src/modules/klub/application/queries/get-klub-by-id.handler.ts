import { Injectable, NotFoundException } from '@nestjs/common';
import type { KlubAccessMode, KlubReviewStatus } from '@draftklub/shared-types';
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
  async execute(id: string, viewerId?: string) {
    const klub = await this.klubRepo.findById(id);
    if (!klub) throw new NotFoundException(`Klub ${id} not found`);

    if (klub.reviewStatus !== 'approved' && klub.createdById !== viewerId) {
      throw new NotFoundException(`Klub ${id} not found`);
    }

    return {
      id: klub.id,
      name: klub.name,
      slug: klub.slug,
      type: klub.type,
      plan: klub.plan,
      status: klub.status,
      city: klub.city,
      state: klub.state,
      timezone: klub.timezone,
      email: klub.email,
      phone: klub.phone,
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
