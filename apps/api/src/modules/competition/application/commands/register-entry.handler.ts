import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { CategoryAllocatorService } from '../../domain/services/category-allocator.service';

export interface RegisterEntryCommand {
  tournamentId: string;
  userId: string;
}

@Injectable()
export class RegisterEntryHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly allocator: CategoryAllocatorService,
  ) {}

  async execute(cmd: RegisterEntryCommand) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: cmd.tournamentId },
      include: {
        categories: { orderBy: { order: 'asc' } },
      },
    });

    if (!tournament) {
      throw new NotFoundException(`Tournament ${cmd.tournamentId} not found`);
    }

    const now = new Date();

    if (now < tournament.registrationOpensAt) {
      throw new BadRequestException('Registration not yet open');
    }
    if (now > tournament.registrationClosesAt) {
      throw new BadRequestException('Registration already closed');
    }

    const existing = await this.prisma.tournamentEntry.findUnique({
      where: { tournamentId_userId: { tournamentId: cmd.tournamentId, userId: cmd.userId } },
    });
    if (existing && existing.status !== 'withdrawn') {
      throw new ConflictException('User already registered in this tournament');
    }

    const rankingEntry = await this.prisma.playerRankingEntry.findUnique({
      where: {
        rankingId_userId: { rankingId: tournament.rankingId, userId: cmd.userId },
      },
    });
    const rating = rankingEntry?.rating ?? null;

    const requiresApproval = tournament.registrationApproval === 'committee';
    const initialStatus = requiresApproval ? 'pending_approval' : 'pending_seeding';

    let categoryId: string | null = null;
    if (!requiresApproval && tournament.categories.length > 0) {
      categoryId = this.allocator.allocate(rating, tournament.categories);
    }

    if (existing) {
      return this.prisma.tournamentEntry.update({
        where: { id: existing.id },
        data: {
          status: initialStatus,
          categoryId,
          categorySource: 'auto',
          ratingAtEntry: rating,
          isWildCard: false,
          withdrawnAt: null,
          registeredAt: now,
        },
      });
    }

    return this.prisma.tournamentEntry.create({
      data: {
        tournamentId: cmd.tournamentId,
        userId: cmd.userId,
        status: initialStatus,
        categoryId,
        categorySource: 'auto',
        ratingAtEntry: rating,
      },
    });
  }
}
