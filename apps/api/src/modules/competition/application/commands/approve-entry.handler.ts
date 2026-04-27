import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { CategoryAllocatorService } from '../../domain/services/category-allocator.service';

export interface ApproveEntryCommand {
  tournamentId: string;
  entryId: string;
  approvedById: string;
}

@Injectable()
export class ApproveEntryHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly allocator: CategoryAllocatorService,
  ) {}

  async execute(cmd: ApproveEntryCommand) {
    const entry = await this.prisma.tournamentEntry.findUnique({
      where: { id: cmd.entryId },
      include: {
        tournament: {
          include: { categories: { orderBy: { order: 'asc' } } },
        },
      },
    });

    if (!entry) throw new NotFoundException('Entry not found');
    if (entry.tournamentId !== cmd.tournamentId) {
      throw new BadRequestException('Entry does not belong to this tournament');
    }
    if (entry.status !== 'pending_approval') {
      throw new BadRequestException(`Cannot approve from status: ${entry.status}`);
    }

    const categoryId = this.allocator.allocate(entry.ratingAtEntry, entry.tournament.categories);

    return this.prisma.tournamentEntry.update({
      where: { id: entry.id },
      data: {
        status: 'pending_seeding',
        categoryId,
        categorySource: 'auto',
        approvedAt: new Date(),
        approvedById: cmd.approvedById,
      },
    });
  }
}
