import { Injectable } from '@nestjs/common';
import { KlubPrismaRepository } from '../../infrastructure/repositories/klub.prisma.repository';

@Injectable()
export class ListKlubsHandler {
  constructor(private readonly klubRepo: KlubPrismaRepository) {}

  async execute() {
    const klubs = await this.klubRepo.findAll();
    return klubs.map((k) => ({
      id: k.id,
      name: k.name,
      slug: k.slug,
      type: k.type,
      plan: k.plan,
      status: k.status,
      city: k.city,
      state: k.state,
      sports: k.sportProfiles.map((s) => s.sportCode),
    }));
  }
}
