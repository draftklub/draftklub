import { Controller, Post, Get, Param, Body, Query, UseGuards } from '@nestjs/common';
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
import { DiscoverKlubsQuerySchema } from './dtos/discover-klubs.dto';
import { CheckSlugQuerySchema } from './dtos/check-slug.dto';

@Controller('klubs')
@UseGuards(FirebaseAuthGuard, PolicyGuard)
export class KlubController {
  constructor(private readonly klubFacade: KlubFacade) {}

  @Post()
  @RequirePolicy('klub.create')
  async createKlub(@Body() body: unknown, @CurrentUser() user: AuthenticatedUser) {
    const dto = CreateKlubSchema.parse(body);
    return this.klubFacade.createKlub({ ...dto, createdById: user.userId });
  }

  @Get()
  @RequirePolicy('klub.list')
  async listKlubs() {
    return this.klubFacade.listKlubs();
  }

  /**
   * Discovery público: lista Klubs com `discoverable=true`. Filtros
   * opcionais por nome/UF/esporte. Sort tier-based (mesma cidade do
   * user > mesmo estado > resto, alfabético dentro). Liberado pra
   * qualquer auth user via PUBLIC_AUTHENTICATED_ACTIONS.
   *
   * IMPORTANTE: rota literal — DEVE ficar antes de `:id` pra Nest
   * matchear path antes de path-param.
   */
  @Get('discover')
  @RequirePolicy('klub.discover')
  async discoverKlubs(@Query() query: unknown, @CurrentUser() user: AuthenticatedUser) {
    const dto = DiscoverKlubsQuerySchema.parse(query);
    return this.klubFacade.discoverKlubs({ ...dto, userId: user.userId });
  }

  /**
   * Preview de slug pro /criar-klub (Sprint D PR1). Calcula
   * `nome+bairro+cidade` server-side e retorna se está livre. NÃO
   * bloqueia submit em caso de conflito — admin desambigua na PR2.
   *
   * Rota literal: DEVE ficar antes de `:id`.
   */
  @Get('check-slug')
  @RequirePolicy('klub.check-slug')
  async checkSlug(@Query() query: unknown) {
    const dto = CheckSlugQuerySchema.parse(query);
    return this.klubFacade.checkSlug(dto);
  }

  /**
   * Preview de CNPJ lookup pra autopopular endereço no /criar-klub. Backend
   * delega pra BrasilAPI; falha silenciosa retorna `null` (frontend cai
   * em manual). Aberto pra qualquer auth user — não vaza dado próprio
   * da plataforma.
   */
  @Get('cnpj-lookup')
  @RequirePolicy('klub.cnpj-lookup')
  async cnpjLookup(@Query('cnpj') cnpj: string) {
    if (!cnpj || !/^\d{14}$/.test(cnpj)) {
      return null;
    }
    return this.klubFacade.lookupCnpj(cnpj);
  }

  @Get('slug/:slug')
  async getKlubBySlug(@Param('slug') slug: string, @CurrentUser() user: AuthenticatedUser) {
    return this.klubFacade.getKlubBySlug(slug, user.userId);
  }

  /**
   * Aceitar convite por link compartilhado. Liberado pra qualquer user
   * autenticado via PUBLIC_AUTHENTICATED_ACTIONS no PolicyEngine.
   */
  @Post('slug/:slug/join')
  @RequirePolicy('klub.join_via_link')
  async joinKlubBySlug(@Param('slug') slug: string, @CurrentUser() user: AuthenticatedUser) {
    return this.klubFacade.joinKlubBySlug(slug, user.userId);
  }

  @Get(':id')
  async getKlub(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.klubFacade.getKlubById(id, user.userId);
  }

  @Post(':id/members')
  @RequirePolicy('klub.members.add', (req) => ({
    klubId: (req as { params: { id: string } }).params.id,
  }))
  async addMember(@Param('id') klubId: string, @Body() body: unknown) {
    const dto = AddMemberSchema.parse(body);
    return this.klubFacade.addMember({ klubId, ...dto });
  }

  @Post(':id/media')
  @RequirePolicy('klub.media.add', (req) => ({
    klubId: (req as { params: { id: string } }).params.id,
  }))
  async addMedia(@Param('id') klubId: string, @Body() body: unknown) {
    const dto = AddMediaSchema.parse(body);
    return this.klubFacade.addMedia(klubId, dto);
  }

  @Post(':id/sport-interests')
  @RequirePolicy('klub.sportInterests.add', (req) => ({
    klubId: (req as { params: { id: string } }).params.id,
  }))
  async addSportInterest(@Param('id') klubId: string, @Body() body: unknown) {
    const dto = AddSportInterestSchema.parse(body);
    return this.klubFacade.addSportInterest(klubId, dto.sportName);
  }
}
