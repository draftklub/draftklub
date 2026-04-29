import { Controller, Post, Headers, ForbiddenException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { RankingFacade } from '../public/ranking.facade';

function safeCompare(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

@Controller('jobs')
export class InternalJobsController {
  constructor(private readonly facade: RankingFacade) {}

  @Post('recompute-temporal-rankings')
  async recomputeTemporal(@Headers('x-api-key') apiKey: string | undefined) {
    const expected = process.env.INTERNAL_JOB_API_KEY;
    if (!safeCompare(apiKey, expected)) {
      throw new ForbiddenException('Invalid API key');
    }
    return this.facade.recomputeAllTemporalRankings();
  }
}
