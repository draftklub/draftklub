import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class ListPointsSchemasHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(klubSportId: string) {
    return this.prisma.rankingPointsSchema.findMany({
      where: { klubSportId, active: true },
      orderBy: { createdAt: 'asc' },
    });
  }
}
