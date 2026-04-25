import {
  Controller,
  Post,
  Headers,
  ForbiddenException,
} from '@nestjs/common';
import { RankingFacade } from '../public/ranking.facade';

@Controller('jobs')
export class InternalJobsController {
  constructor(private readonly facade: RankingFacade) {}

  @Post('recompute-temporal-rankings')
  async recomputeTemporal(
    @Headers('x-api-key') apiKey: string | undefined,
  ) {
    const expected = process.env.INTERNAL_JOB_API_KEY;
    if (!expected || apiKey !== expected) {
      throw new ForbiddenException('Invalid API key');
    }
    return this.facade.recomputeAllTemporalRankings();
  }
}
