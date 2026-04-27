import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { PolicyGuard } from '../../../shared/auth/policy.guard';
import { RequirePolicy } from '../../../shared/auth/require-policy.decorator';
import { CurrentUser } from '../../../shared/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.interface';
import { CompetitionFacade } from '../public/competition.facade';
import { CreatePointsSchemaSchema } from './dtos/create-points-schema.dto';

@Controller('klubs/:klubId/sports/:sportCode/points-schemas')
@UseGuards(FirebaseAuthGuard, PolicyGuard)
export class PointsSchemasController {
  constructor(private readonly facade: CompetitionFacade) {}

  @Get()
  async list(@Param('klubId') klubId: string, @Param('sportCode') sportCode: string) {
    return this.facade.listPointsSchemas(klubId, sportCode);
  }

  @Post()
  @RequirePolicy('tournament.manage', (req) => ({
    klubId: (req as { params: { klubId: string } }).params.klubId,
  }))
  async create(
    @Param('klubId') klubId: string,
    @Param('sportCode') sportCode: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dto = CreatePointsSchemaSchema.parse(body);
    return this.facade.createPointsSchema({
      klubId,
      sportCode,
      ...dto,
      createdById: user.userId,
    });
  }
}
