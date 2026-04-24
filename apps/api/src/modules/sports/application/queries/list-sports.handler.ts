import { Injectable } from '@nestjs/common';
import { SportCatalogRepository } from '../../infrastructure/repositories/sport-catalog.prisma.repository';

@Injectable()
export class ListSportsHandler {
  constructor(private readonly repo: SportCatalogRepository) {}

  async execute(onlyActive = true) {
    const sports = await this.repo.findAll(onlyActive);
    return sports.map((s) => ({
      code: s.code,
      name: s.name,
      description: s.description,
      playType: s.playType,
      minPlayers: s.minPlayers,
      maxPlayers: s.maxPlayers,
      active: s.active,
    }));
  }
}
