import { Injectable, NotFoundException } from '@nestjs/common';
import { $Enums, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface CreateRankingCommand {
  klubSportId: string;
  name: string;
  type?: 'singles' | 'doubles' | 'mixed';
  gender?: 'male' | 'female' | 'undisclosed' | null;
  ageMin?: number;
  ageMax?: number;
  ratingEngine?: string;
  ratingConfig?: Record<string, unknown>;
  initialRating?: number;
}

@Injectable()
export class CreateRankingHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: CreateRankingCommand) {
    const profile = await this.prisma.klubSportProfile.findUnique({
      where: { id: cmd.klubSportId },
    });
    if (!profile) throw new NotFoundException(`KlubSportProfile ${cmd.klubSportId} not found`);

    const engine = cmd.ratingEngine ?? profile.defaultRatingEngine;
    const config =
      cmd.ratingConfig && Object.keys(cmd.ratingConfig).length > 0
        ? cmd.ratingConfig
        : (profile.defaultRatingConfig as Record<string, unknown>);

    return this.prisma.klubSportRanking.create({
      data: {
        klubSportId: cmd.klubSportId,
        name: cmd.name,
        type: cmd.type ?? 'singles',
        gender: cmd.gender,
        ageMin: cmd.ageMin,
        ageMax: cmd.ageMax,
        ratingEngine: engine as $Enums.RatingEngineType,
        ratingConfig: config as Prisma.InputJsonValue,
        initialRating: cmd.initialRating ?? profile.defaultInitialRating,
      },
    });
  }
}
