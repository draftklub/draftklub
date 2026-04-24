import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface MoveEntryCategoryCommand {
  tournamentId: string;
  entryId: string;
  targetCategoryId: string;
  movedById: string;
  asWildCard?: boolean;
}

@Injectable()
export class MoveEntryCategoryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: MoveEntryCategoryCommand) {
    const entry = await this.prisma.tournamentEntry.findUnique({
      where: { id: cmd.entryId },
      include: { tournament: true },
    });

    if (!entry) throw new NotFoundException('Entry not found');
    if (entry.tournamentId !== cmd.tournamentId) {
      throw new BadRequestException('Entry does not belong to this tournament');
    }
    if (!['pending_seeding', 'seeded'].includes(entry.status)) {
      throw new BadRequestException(`Cannot move entry from status: ${entry.status}`);
    }

    if (new Date() > entry.tournament.drawDate) {
      throw new BadRequestException('Cannot move entry after draw date');
    }

    const category = await this.prisma.tournamentCategory.findUnique({
      where: { id: cmd.targetCategoryId },
    });
    if (category?.tournamentId !== cmd.tournamentId) {
      throw new BadRequestException('Target category does not belong to this tournament');
    }

    return this.prisma.tournamentEntry.update({
      where: { id: entry.id },
      data: {
        categoryId: cmd.targetCategoryId,
        categorySource: cmd.asWildCard ? 'wildcard' : 'committee',
        isWildCard: cmd.asWildCard ?? false,
        movedById: cmd.movedById,
      },
    });
  }
}
