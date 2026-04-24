import { Injectable, NotFoundException } from '@nestjs/common';
import { KlubSportProfileRepository } from '../../infrastructure/repositories/klub-sport-profile.prisma.repository';

@Injectable()
export class GetKlubSportHandler {
  constructor(private readonly profileRepo: KlubSportProfileRepository) {}

  async execute(klubId: string, sportCode: string) {
    const profile = await this.profileRepo.findByKlubAndSport(klubId, sportCode);
    if (!profile) throw new NotFoundException(`Sport '${sportCode}' not found in this Klub`);

    return {
      id: profile.id,
      sportCode: profile.sportCode,
      name: profile.name ?? profile.sport.name,
      description: profile.description,
      defaultRatingEngine: profile.defaultRatingEngine,
      defaultRatingConfig: profile.defaultRatingConfig,
      defaultInitialRating: profile.defaultInitialRating,
      status: profile.status,
      addedAt: profile.addedAt,
      sport: {
        code: profile.sport.code,
        name: profile.sport.name,
        playType: profile.sport.playType,
        minPlayers: profile.sport.minPlayers,
        maxPlayers: profile.sport.maxPlayers,
      },
    };
  }
}
