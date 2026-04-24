import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  CreatePointsSchemaHandler,
  type CreatePointsSchemaCommand,
} from '../application/commands/create-points-schema.handler';
import {
  CreateTournamentHandler,
  type CreateTournamentCommand,
} from '../application/commands/create-tournament.handler';
import {
  RegisterEntryHandler,
  type RegisterEntryCommand,
} from '../application/commands/register-entry.handler';
import {
  WithdrawEntryHandler,
  type WithdrawEntryCommand,
} from '../application/commands/withdraw-entry.handler';
import {
  ApproveEntryHandler,
  type ApproveEntryCommand,
} from '../application/commands/approve-entry.handler';
import {
  MoveEntryCategoryHandler,
  type MoveEntryCategoryCommand,
} from '../application/commands/move-entry-category.handler';
import { ListPointsSchemasHandler } from '../application/queries/list-points-schemas.handler';
import { ListTournamentsHandler } from '../application/queries/list-tournaments.handler';
import { GetTournamentHandler } from '../application/queries/get-tournament.handler';
import { ListEntriesHandler } from '../application/queries/list-entries.handler';

export interface CreatePointsSchemaInput extends Omit<CreatePointsSchemaCommand, 'klubSportId'> {
  klubId: string;
  sportCode: string;
}

export interface CreateTournamentInput extends Omit<CreateTournamentCommand, 'klubSportId'> {
  klubId: string;
  sportCode: string;
}

@Injectable()
export class CompetitionFacade {
  constructor(
    private readonly prisma: PrismaService,
    private readonly createPointsSchemaHandler: CreatePointsSchemaHandler,
    private readonly createTournamentHandler: CreateTournamentHandler,
    private readonly registerEntryHandler: RegisterEntryHandler,
    private readonly withdrawEntryHandler: WithdrawEntryHandler,
    private readonly approveEntryHandler: ApproveEntryHandler,
    private readonly moveEntryCategoryHandler: MoveEntryCategoryHandler,
    private readonly listPointsSchemasHandler: ListPointsSchemasHandler,
    private readonly listTournamentsHandler: ListTournamentsHandler,
    private readonly getTournamentHandler: GetTournamentHandler,
    private readonly listEntriesHandler: ListEntriesHandler,
  ) {}

  private async resolveKlubSport(klubId: string, sportCode: string) {
    const profile = await this.prisma.klubSportProfile.findUnique({
      where: { klubId_sportCode: { klubId, sportCode } },
    });
    if (!profile) {
      throw new NotFoundException(`Sport '${sportCode}' not active in Klub ${klubId}`);
    }
    return profile;
  }

  async listPointsSchemas(klubId: string, sportCode: string) {
    const profile = await this.resolveKlubSport(klubId, sportCode);
    return this.listPointsSchemasHandler.execute(profile.id);
  }

  async createPointsSchema(cmd: CreatePointsSchemaInput) {
    const profile = await this.resolveKlubSport(cmd.klubId, cmd.sportCode);
    return this.createPointsSchemaHandler.execute({
      klubSportId: profile.id,
      name: cmd.name,
      description: cmd.description,
      points: cmd.points,
      createdById: cmd.createdById,
    });
  }

  async listTournaments(klubId: string, sportCode: string) {
    const profile = await this.resolveKlubSport(klubId, sportCode);
    return this.listTournamentsHandler.execute(profile.id);
  }

  async getTournament(id: string) {
    return this.getTournamentHandler.execute(id);
  }

  async createTournament(cmd: CreateTournamentInput) {
    const profile = await this.resolveKlubSport(cmd.klubId, cmd.sportCode);
    const { klubId: _klubId, sportCode: _sportCode, ...rest } = cmd;
    return this.createTournamentHandler.execute({
      ...rest,
      klubSportId: profile.id,
    });
  }

  async listEntries(tournamentId: string) {
    return this.listEntriesHandler.execute(tournamentId);
  }

  async registerEntry(cmd: RegisterEntryCommand) {
    return this.registerEntryHandler.execute(cmd);
  }

  async withdrawEntry(cmd: WithdrawEntryCommand) {
    return this.withdrawEntryHandler.execute(cmd);
  }

  async approveEntry(cmd: ApproveEntryCommand) {
    return this.approveEntryHandler.execute(cmd);
  }

  async moveEntryCategory(cmd: MoveEntryCategoryCommand) {
    return this.moveEntryCategoryHandler.execute(cmd);
  }
}
