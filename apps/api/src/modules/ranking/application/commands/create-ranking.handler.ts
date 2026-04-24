import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface CreateRankingCommand {
  klubSportId: string;
  name: string;
  type?: 'singles' | 'doubles' | 'mixed';
  gender?: 'M' | 'F' | null;
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
        ratingEngine: engine,
        ratingConfig: config as Prisma.InputJsonValue,
        initialRating: cmd.initialRating ?? profile.defaultInitialRating,
      },
    });
  }
}
