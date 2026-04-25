import { Module } from '@nestjs/common';
import { CreateRankingHandler } from './application/commands/create-ranking.handler';
import { EnrollPlayerHandler } from './application/commands/enroll-player.handler';
import { SubmitMatchHandler } from './application/commands/submit-match.handler';
import { ConfirmMatchHandler } from './application/commands/confirm-match.handler';
import { UpdateRankingHandler } from './application/commands/update-ranking.handler';
import { ListRankingsHandler } from './application/queries/list-rankings.handler';
import { GetRankingHandler } from './application/queries/get-ranking.handler';
import { RatingCalculatorService } from './domain/rating-calculator.service';
import { RankingRecomputeService } from './domain/services/ranking-recompute.service';
import { RankingFacade } from './public/ranking.facade';
import { RankingsController } from './api/rankings.controller';
import { MatchesController } from './api/matches.controller';
import { RankingsAdminController } from './api/rankings-admin.controller';
import { InternalJobsController } from './api/internal-jobs.controller';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [IdentityModule],
  controllers: [
    RankingsController,
    MatchesController,
    RankingsAdminController,
    InternalJobsController,
  ],
  providers: [
    CreateRankingHandler,
    EnrollPlayerHandler,
    SubmitMatchHandler,
    ConfirmMatchHandler,
    UpdateRankingHandler,
    ListRankingsHandler,
    GetRankingHandler,
    RatingCalculatorService,
    RankingRecomputeService,
    RankingFacade,
  ],
  exports: [RankingFacade, RatingCalculatorService, RankingRecomputeService],
})
export class RankingModule {}
