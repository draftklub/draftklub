import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class ListEntriesHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(tournamentId: string) {
    const entries = await this.prisma.tournamentEntry.findMany({
      where: { tournamentId },
      orderBy: [{ status: 'asc' }, { registeredAt: 'asc' }],
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true } },
        category: { select: { id: true, name: true, order: true } },
      },
    });

    return entries.map((e) => ({
      id: e.id,
      userId: e.userId,
      user: e.user,
      category: e.category,
      status: e.status,
      finalPosition: e.finalPosition,
      ratingAtEntry: e.ratingAtEntry,
      categorySource: e.categorySource,
      isWildCard: e.isWildCard,
      registeredAt: e.registeredAt,
      approvedAt: e.approvedAt,
      withdrawnAt: e.withdrawnAt,
    }));
  }
}
