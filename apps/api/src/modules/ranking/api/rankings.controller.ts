import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { PolicyGuard } from '../../../shared/auth/policy.guard';
import { RequirePolicy } from '../../../shared/auth/require-policy.decorator';
import { CurrentUser } from '../../../shared/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.interface';
import { CursorPaginationSchema } from '../../../shared/pagination/cursor';
import { EtagInterceptor } from '../../../shared/etag/etag.interceptor';
import { RankingFacade } from '../public/ranking.facade';
import { CreateRankingDto, CreateRankingSchema } from './dtos/create-ranking.dto';
import { EnrollPlayerSchema } from './dtos/enroll-player.dto';

@Controller('klubs/:klubId/sports/:sportCode/rankings')
@UseGuards(FirebaseAuthGuard, PolicyGuard)
export class RankingsController {
  constructor(private readonly facade: RankingFacade) {}

  @Post()
  @RequirePolicy('ranking.create', (req) => ({
    klubId: (req as { params: { klubId: string } }).params.klubId,
  }))
  async createRanking(
    @Param('klubId') klubId: string,
    @Param('sportCode') sportCode: string,
    @Body() body: CreateRankingDto,
  ) {
    const dto = CreateRankingSchema.parse(body);
    return this.facade.createRanking({ klubId, sportCode, ...dto });
  }

  @Get()
  async listRankings(@Param('klubId') klubId: string, @Param('sportCode') sportCode: string) {
    return this.facade.listRankings(klubId, sportCode);
  }

  @Get(':rankingId')
  @UseInterceptors(EtagInterceptor)
  async getRanking(@Param('rankingId') rankingId: string, @Query() query: Record<string, unknown>) {
    const params = CursorPaginationSchema.parse(query);
    return this.facade.getRanking(rankingId, params);
  }

  @Post(':rankingId/entries')
  @RequirePolicy('ranking.enroll', (req) => ({
    klubId: (req as { params: { klubId: string } }).params.klubId,
  }))
  async enrollPlayer(
    @Param('rankingId') rankingId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dto = EnrollPlayerSchema.parse(body);
    return this.facade.enrollPlayer({
      rankingId,
      userId: dto.userId ?? user.userId,
      initialRating: dto.initialRating,
    });
  }
}
