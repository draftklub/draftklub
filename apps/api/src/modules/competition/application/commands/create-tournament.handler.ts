import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { TournamentValidatorService } from '../../domain/services/tournament-validator.service';

export interface CreateTournamentCategoryInput {
  name: string;
  order: number;
  maxPlayers?: number;
  minRatingExpected?: number;
  maxRatingExpected?: number;
  pointsSchemaId: string;
}

export interface CreateTournamentCommand {
  klubSportId: string;
  rankingId: string;
  name: string;
  description?: string;
  format: 'knockout' | 'round_robin' | 'double_elimination' | 'groups_knockout';
  hasPrequalifiers: boolean;
  prequalifierBordersPerFrontier?: number;
  registrationApproval: 'auto' | 'committee';
  registrationFee?: number;
  registrationOpensAt: Date;
  registrationClosesAt: Date;
  drawDate: Date;
  prequalifierStartDate?: Date;
  prequalifierEndDate?: Date;
  mainStartDate: Date;
  mainEndDate?: Date;
  scheduleConfig?: Record<string, unknown>;
  categories: CreateTournamentCategoryInput[];
  createdById?: string;
}

@Injectable()
export class CreateTournamentHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validator: TournamentValidatorService,
  ) {}

  async execute(cmd: CreateTournamentCommand) {
    const profile = await this.prisma.klubSportProfile.findUnique({
      where: { id: cmd.klubSportId },
    });
    if (!profile) {
      throw new NotFoundException(`KlubSportProfile ${cmd.klubSportId} not found`);
    }

    const activeSchemas = await this.prisma.rankingPointsSchema.count({
      where: { klubSportId: cmd.klubSportId, active: true },
    });
    if (activeSchemas === 0) {
      throw new BadRequestException({
        message: 'No active RankingPointsSchema found for this sport profile. Create a points schema first.',
        code: 'POINTS_SCHEMA_REQUIRED',
      });
    }

    const ranking = await this.prisma.klubSportRanking.findUnique({
      where: { id: cmd.rankingId },
    });
    if (ranking?.klubSportId !== cmd.klubSportId) {
      throw new BadRequestException('Ranking must belong to the same KlubSportProfile');
    }

    if (cmd.categories.length === 0) {
      throw new BadRequestException('Tournament must have at least one category');
    }

    const schemaIds = cmd.categories.map((c) => c.pointsSchemaId);
    const uniqueSchemaIds = Array.from(new Set(schemaIds));
    const schemas = await this.prisma.rankingPointsSchema.findMany({
      where: { id: { in: uniqueSchemaIds } },
    });
    if (schemas.length !== uniqueSchemaIds.length) {
      throw new BadRequestException('One or more pointsSchemaIds not found');
    }
    for (const schema of schemas) {
      if (schema.klubSportId !== cmd.klubSportId) {
        throw new BadRequestException('All points schemas must belong to the same KlubSportProfile');
      }
    }

    this.validator.validateDates(
      {
        registrationOpensAt: cmd.registrationOpensAt,
        registrationClosesAt: cmd.registrationClosesAt,
        drawDate: cmd.drawDate,
        prequalifierStartDate: cmd.prequalifierStartDate,
        prequalifierEndDate: cmd.prequalifierEndDate,
        mainStartDate: cmd.mainStartDate,
        mainEndDate: cmd.mainEndDate,
      },
      cmd.hasPrequalifiers,
    );

    this.validator.validatePrequalifierConfig(
      cmd.hasPrequalifiers,
      cmd.prequalifierBordersPerFrontier,
      cmd.categories.length,
    );

    return this.prisma.tournament.create({
      data: {
        klubSportId: cmd.klubSportId,
        rankingId: cmd.rankingId,
        name: cmd.name,
        description: cmd.description,
        format: cmd.format,
        hasPrequalifiers: cmd.hasPrequalifiers,
        prequalifierBordersPerFrontier: cmd.prequalifierBordersPerFrontier,
        registrationApproval: cmd.registrationApproval,
        registrationFee: cmd.registrationFee,
        registrationOpensAt: cmd.registrationOpensAt,
        registrationClosesAt: cmd.registrationClosesAt,
        drawDate: cmd.drawDate,
        prequalifierStartDate: cmd.prequalifierStartDate,
        prequalifierEndDate: cmd.prequalifierEndDate,
        mainStartDate: cmd.mainStartDate,
        mainEndDate: cmd.mainEndDate,
        scheduleConfig: (cmd.scheduleConfig ?? {}) as Prisma.InputJsonValue,
        status: 'draft',
        createdById: cmd.createdById,
        categories: {
          create: cmd.categories.map((c) => ({
            name: c.name,
            order: c.order,
            maxPlayers: c.maxPlayers,
            minRatingExpected: c.minRatingExpected,
            maxRatingExpected: c.maxRatingExpected,
            pointsSchemaId: c.pointsSchemaId,
          })),
        },
      },
      include: {
        categories: { orderBy: { order: 'asc' } },
      },
    });
  }
}
