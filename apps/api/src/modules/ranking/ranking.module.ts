import { Module } from '@nestjs/common';
import { CreateRankingHandler } from './application/commands/create-ranking.handler';
import { EnrollPlayerHandler } from './application/commands/enroll-player.handler';
import { SubmitMatchHandler } from './application/commands/submit-match.handler';
import { ConfirmMatchHandler } from './application/commands/confirm-match.handler';
import { ListRankingsHandler } from './application/queries/list-rankings.handler';
import { GetRankingHandler } from './application/queries/get-ranking.handler';
import { RatingCalculatorService } from './domain/rating-calculator.service';
import { RankingFacade } from './public/ranking.facade';
import { RankingsController } from './api/rankings.controller';
import { MatchesController } from './api/matches.controller';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [IdentityModule],
  controllers: [RankingsController, MatchesController],
  providers: [
    CreateRankingHandler,
    EnrollPlayerHandler,
    SubmitMatchHandler,
    ConfirmMatchHandler,
    ListRankingsHandler,
    GetRankingHandler,
    RatingCalculatorService,
    RankingFacade,
  ],
  exports: [RankingFacade, RatingCalculatorService],
})
export class RankingModule {}
