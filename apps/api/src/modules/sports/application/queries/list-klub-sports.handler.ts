import { Injectable } from '@nestjs/common';
import { KlubSportProfileRepository } from '../../infrastructure/repositories/klub-sport-profile.prisma.repository';

@Injectable()
export class ListKlubSportsHandler {
  constructor(private readonly profileRepo: KlubSportProfileRepository) {}

  async execute(klubId: string) {
    const profiles = await this.profileRepo.findByKlub(klubId);
    return profiles.map((p) => ({
      id: p.id,
      sportCode: p.sportCode,
      name: p.name ?? p.sport.name,
      description: p.description,
      defaultRatingEngine: p.defaultRatingEngine,
      defaultInitialRating: p.defaultInitialRating,
      status: p.status,
      addedAt: p.addedAt,
      sport: {
        code: p.sport.code,
        name: p.sport.name,
        playType: p.sport.playType,
      },
    }));
  }
}
