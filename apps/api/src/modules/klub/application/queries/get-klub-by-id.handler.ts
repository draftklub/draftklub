import { Injectable, NotFoundException } from '@nestjs/common';
import { KlubPrismaRepository } from '../../infrastructure/repositories/klub.prisma.repository';
import { mapKlubConfig } from '../mappers/klub-config.mapper';

@Injectable()
export class GetKlubByIdHandler {
  constructor(private readonly klubRepo: KlubPrismaRepository) {}

  async execute(id: string) {
    const klub = await this.klubRepo.findById(id);
    if (!klub) throw new NotFoundException(`Klub ${id} not found`);

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
      createdAt: klub.createdAt,
    };
  }
}
