import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { CategoryAllocatorService } from './domain/services/category-allocator.service';
import { TournamentValidatorService } from './domain/services/tournament-validator.service';
import { CreatePointsSchemaHandler } from './application/commands/create-points-schema.handler';
import { CreateTournamentHandler } from './application/commands/create-tournament.handler';
import { RegisterEntryHandler } from './application/commands/register-entry.handler';
import { WithdrawEntryHandler } from './application/commands/withdraw-entry.handler';
import { ApproveEntryHandler } from './application/commands/approve-entry.handler';
import { MoveEntryCategoryHandler } from './application/commands/move-entry-category.handler';
import { ListPointsSchemasHandler } from './application/queries/list-points-schemas.handler';
import { ListTournamentsHandler } from './application/queries/list-tournaments.handler';
import { GetTournamentHandler } from './application/queries/get-tournament.handler';
import { ListEntriesHandler } from './application/queries/list-entries.handler';
import { CompetitionFacade } from './public/competition.facade';
import { PointsSchemasController } from './api/points-schemas.controller';
import { TournamentsController } from './api/tournaments.controller';
import { TournamentEntriesController } from './api/tournament-entries.controller';

@Module({
  imports: [IdentityModule],
  controllers: [
    PointsSchemasController,
    TournamentsController,
    TournamentEntriesController,
  ],
  providers: [
    CategoryAllocatorService,
    TournamentValidatorService,
    CreatePointsSchemaHandler,
    CreateTournamentHandler,
    RegisterEntryHandler,
    WithdrawEntryHandler,
    ApproveEntryHandler,
    MoveEntryCategoryHandler,
    ListPointsSchemasHandler,
    ListTournamentsHandler,
    GetTournamentHandler,
    ListEntriesHandler,
    CompetitionFacade,
  ],
  exports: [CompetitionFacade],
})
export class CompetitionModule {}
