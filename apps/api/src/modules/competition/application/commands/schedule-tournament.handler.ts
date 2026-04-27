import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  ScheduleDistributorService,
  type DistributionResult,
} from '../../domain/services/schedule-distributor.service';
import { ScheduleConfigSchema, type ScheduleConfig } from '../../api/dtos/schedule-config.dto';

export interface ScheduleTournamentCommand {
  tournamentId: string;
  config?: ScheduleConfig;
}

@Injectable()
export class ScheduleTournamentHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly distributor: ScheduleDistributorService,
  ) {}

  async execute(cmd: ScheduleTournamentCommand): Promise<DistributionResult> {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: cmd.tournamentId },
      select: { id: true },
    });
    if (!tournament) throw new NotFoundException('Tournament not found');

    if (cmd.config) {
      const validated = ScheduleConfigSchema.parse(cmd.config);
      await this.prisma.tournament.update({
        where: { id: cmd.tournamentId },
        data: { scheduleConfig: validated },
      });
    }

    return this.distributor.distribute(cmd.tournamentId);
  }
}
