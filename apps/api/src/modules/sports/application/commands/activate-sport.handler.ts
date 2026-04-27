import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { KlubSportProfileRepository } from '../../infrastructure/repositories/klub-sport-profile.prisma.repository';
import { SportCatalogRepository } from '../../infrastructure/repositories/sport-catalog.prisma.repository';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface ActivateSportCommand {
  klubId: string;
  sportCode: string;
  name?: string;
  description?: string;
  defaultRatingEngine?: string;
  defaultRatingConfig?: Record<string, unknown>;
  defaultInitialRating?: number;
  addedById?: string;
}

@Injectable()
export class ActivateSportHandler {
  constructor(
    private readonly profileRepo: KlubSportProfileRepository,
    private readonly catalogRepo: SportCatalogRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(cmd: ActivateSportCommand) {
    const sport = await this.catalogRepo.findByCode(cmd.sportCode);
    if (!sport) throw new NotFoundException(`Sport '${cmd.sportCode}' not found`);

    const existing = await this.profileRepo.findByKlubAndSport(cmd.klubId, cmd.sportCode);
    if (existing?.status === 'active') {
      throw new ConflictException(`Sport '${cmd.sportCode}' already active in this Klub`);
    }

    if (cmd.defaultRatingEngine) {
      const engine = await this.prisma.ratingEngine.findUnique({
        where: { code: cmd.defaultRatingEngine },
      });
      if (!engine)
        throw new NotFoundException(`Rating engine '${cmd.defaultRatingEngine}' not found`);
    }

    if (existing) {
      return this.profileRepo.update(existing.id, { status: 'active' });
    }

    return this.profileRepo.create({
      klubId: cmd.klubId,
      sportCode: cmd.sportCode,
      name: cmd.name,
      description: cmd.description,
      defaultRatingEngine: cmd.defaultRatingEngine ?? 'elo',
      defaultRatingConfig: cmd.defaultRatingConfig ?? {},
      defaultInitialRating: cmd.defaultInitialRating ?? 1000,
      addedById: cmd.addedById,
    });
  }
}
