import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class ListTournamentsHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(klubSportId: string) {
    const tournaments = await this.prisma.tournament.findMany({
      where: { klubSportId },
      orderBy: { mainStartDate: 'desc' },
      include: {
        _count: { select: { entries: true, categories: true } },
      },
    });

    return tournaments.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      format: t.format,
      status: t.status,
      currentPhase: t.currentPhase,
      hasPrequalifiers: t.hasPrequalifiers,
      registrationApproval: t.registrationApproval,
      registrationOpensAt: t.registrationOpensAt,
      registrationClosesAt: t.registrationClosesAt,
      drawDate: t.drawDate,
      mainStartDate: t.mainStartDate,
      mainEndDate: t.mainEndDate,
      entryCount: t._count.entries,
      categoryCount: t._count.categories,
    }));
  }
}
