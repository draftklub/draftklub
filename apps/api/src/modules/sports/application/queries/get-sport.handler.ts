import { Injectable, NotFoundException } from '@nestjs/common';
import { SportCatalogRepository } from '../../infrastructure/repositories/sport-catalog.prisma.repository';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class GetSportHandler {
  constructor(
    private readonly repo: SportCatalogRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(code: string) {
    const sport = await this.repo.findByCode(code);
    if (!sport) throw new NotFoundException(`Sport '${code}' not found`);

    const engines = await this.prisma.ratingEngine.findMany({
      where: { active: true },
    });

    return {
      code: sport.code,
      name: sport.name,
      description: sport.description,
      playType: sport.playType,
      minPlayers: sport.minPlayers,
      maxPlayers: sport.maxPlayers,
      availableRatingEngines: engines.map((e) => ({
        code: e.code,
        name: e.name,
        description: e.description,
        defaultConfig: e.defaultConfig,
      })),
    };
  }
}
