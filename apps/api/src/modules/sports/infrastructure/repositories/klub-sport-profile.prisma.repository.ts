import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class KlubSportProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByKlubAndSport(klubId: string, sportCode: string) {
    return this.prisma.klubSportProfile.findUnique({
      where: { klubId_sportCode: { klubId, sportCode } },
      include: { sport: true },
    });
  }

  async findByKlub(klubId: string) {
    return this.prisma.klubSportProfile.findMany({
      where: { klubId, status: 'active' },
      include: { sport: true },
      orderBy: { sport: { sortOrder: 'asc' } },
    });
  }

  async create(data: {
    klubId: string;
    sportCode: string;
    name?: string;
    description?: string;
    defaultRatingEngine: string;
    defaultRatingConfig: Record<string, unknown>;
    defaultInitialRating: number;
    addedById?: string;
  }) {
    return this.prisma.klubSportProfile.create({
      data: {
        klubId: data.klubId,
        sportCode: data.sportCode,
        name: data.name,
        description: data.description,
        defaultRatingEngine: data.defaultRatingEngine,
        defaultRatingConfig: data.defaultRatingConfig as Prisma.InputJsonValue,
        defaultInitialRating: data.defaultInitialRating,
        addedById: data.addedById,
      },
      include: { sport: true },
    });
  }

  async update(id: string, data: Partial<{ status: string; name: string; description: string }>) {
    return this.prisma.klubSportProfile.update({
      where: { id },
      data,
      include: { sport: true },
    });
  }
}
