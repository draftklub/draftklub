import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { RankingModule } from '../ranking/ranking.module';
import { CategoryAllocatorService } from './domain/services/category-allocator.service';
import { TournamentValidatorService } from './domain/services/tournament-validator.service';
import { BracketGeneratorService } from './domain/services/bracket-generator.service';
import { PrequalifierGeneratorService } from './domain/services/prequalifier-generator.service';
import { TournamentProgressionService } from './domain/services/tournament-progression.service';
import { KnockoutStrategy } from './domain/services/strategies/knockout.strategy';
import { RoundRobinStrategy } from './domain/services/strategies/round-robin.strategy';
import { CreatePointsSchemaHandler } from './application/commands/create-points-schema.handler';
import { CreateTournamentHandler } from './application/commands/create-tournament.handler';
import { RegisterEntryHandler } from './application/commands/register-entry.handler';
import { WithdrawEntryHandler } from './application/commands/withdraw-entry.handler';
import { ApproveEntryHandler } from './application/commands/approve-entry.handler';
import { MoveEntryCategoryHandler } from './application/commands/move-entry-category.handler';
import { DrawTournamentHandler } from './application/commands/draw-tournament.handler';
import { ReportTournamentMatchHandler } from './application/commands/report-tournament-match.handler';
import { ConfirmTournamentMatchHandler } from './application/commands/confirm-tournament-match.handler';
import { EditTournamentMatchResultHandler } from './application/commands/edit-tournament-match-result.handler';
import { ApplyWalkoverHandler } from './application/commands/apply-walkover.handler';
import { ApplyDoubleWalkoverHandler } from './application/commands/apply-double-walkover.handler';
import { UpdateReportingModeHandler } from './application/commands/update-reporting-mode.handler';
import { ListPointsSchemasHandler } from './application/queries/list-points-schemas.handler';
import { ListTournamentsHandler } from './application/queries/list-tournaments.handler';
import { GetTournamentHandler } from './application/queries/get-tournament.handler';
import { ListEntriesHandler } from './application/queries/list-entries.handler';
import { GetBracketHandler } from './application/queries/get-bracket.handler';
import { CompetitionFacade } from './public/competition.facade';
import { PointsSchemasController } from './api/points-schemas.controller';
import { TournamentsController } from './api/tournaments.controller';
import { TournamentEntriesController } from './api/tournament-entries.controller';
import { TournamentDrawController } from './api/tournament-draw.controller';
import { TournamentMatchesController } from './api/tournament-matches.controller';

@Module({
  imports: [IdentityModule, RankingModule],
  controllers: [
    PointsSchemasController,
    TournamentsController,
    TournamentEntriesController,
    TournamentDrawController,
    TournamentMatchesController,
  ],
  providers: [
    CategoryAllocatorService,
    TournamentValidatorService,
    BracketGeneratorService,
    PrequalifierGeneratorService,
    TournamentProgressionService,
    KnockoutStrategy,
    RoundRobinStrategy,
    CreatePointsSchemaHandler,
    CreateTournamentHandler,
    RegisterEntryHandler,
    WithdrawEntryHandler,
    ApproveEntryHandler,
    MoveEntryCategoryHandler,
    DrawTournamentHandler,
    ReportTournamentMatchHandler,
    ConfirmTournamentMatchHandler,
    EditTournamentMatchResultHandler,
    ApplyWalkoverHandler,
    ApplyDoubleWalkoverHandler,
    UpdateReportingModeHandler,
    ListPointsSchemasHandler,
    ListTournamentsHandler,
    GetTournamentHandler,
    ListEntriesHandler,
    GetBracketHandler,
    CompetitionFacade,
  ],
  exports: [CompetitionFacade],
})
export class CompetitionModule {}
