import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { CurrentUser } from '../../../shared/auth/current-user.decorator';
import { RequirePolicy } from '../../../shared/auth/require-policy.decorator';
import { PolicyGuard } from '../../../shared/auth/policy.guard';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.interface';
import { KlubFacade } from '../public/klub.facade';
import { CreateKlubSchema } from './dtos/create-klub.dto';
import { AddMemberSchema } from './dtos/add-member.dto';
import { AddMediaSchema } from './dtos/add-media.dto';
import { AddSportInterestSchema } from './dtos/add-sport-interest.dto';

@Controller('klubs')
@UseGuards(FirebaseAuthGuard, PolicyGuard)
export class KlubController {
  constructor(private readonly klubFacade: KlubFacade) {}

  @Post()
  @RequirePolicy('klub.create')
  async createKlub(
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dto = CreateKlubSchema.parse(body);
    return this.klubFacade.createKlub({ ...dto, createdById: user.userId });
  }

  @Get()
  @RequirePolicy('klub.list')
  async listKlubs() {
    return this.klubFacade.listKlubs();
  }

  @Get('slug/:slug')
  async getKlubBySlug(@Param('slug') slug: string) {
    return this.klubFacade.getKlubBySlug(slug);
  }

  /**
   * Aceitar convite por link compartilhado. Liberado pra qualquer user
   * autenticado via PUBLIC_AUTHENTICATED_ACTIONS no PolicyEngine.
   */
  @Post('slug/:slug/join')
  @RequirePolicy('klub.join_via_link')
  async joinKlubBySlug(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.klubFacade.joinKlubBySlug(slug, user.userId);
  }

  @Get(':id')
  async getKlub(@Param('id') id: string) {
    return this.klubFacade.getKlubById(id);
  }

  @Post(':id/members')
  @RequirePolicy('klub.members.add', (req) => ({ klubId: (req as { params: { id: string } }).params.id }))
  async addMember(
    @Param('id') klubId: string,
    @Body() body: unknown,
  ) {
    const dto = AddMemberSchema.parse(body);
    return this.klubFacade.addMember({ klubId, ...dto });
  }

  @Post(':id/media')
  @RequirePolicy('klub.media.add', (req) => ({ klubId: (req as { params: { id: string } }).params.id }))
  async addMedia(
    @Param('id') klubId: string,
    @Body() body: unknown,
  ) {
    const dto = AddMediaSchema.parse(body);
    return this.klubFacade.addMedia(klubId, dto);
  }

  @Post(':id/sport-interests')
  @RequirePolicy('klub.sportInterests.add', (req) => ({ klubId: (req as { params: { id: string } }).params.id }))
  async addSportInterest(
    @Param('id') klubId: string,
    @Body() body: unknown,
  ) {
    const dto = AddSportInterestSchema.parse(body);
    return this.klubFacade.addSportInterest(klubId, dto.sportName);
  }
}
