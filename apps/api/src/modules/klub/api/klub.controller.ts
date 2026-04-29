import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { CurrentUser } from '../../../shared/auth/current-user.decorator';
import { RequirePolicy } from '../../../shared/auth/require-policy.decorator';
import { PolicyGuard } from '../../../shared/auth/policy.guard';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.interface';
import { KlubFacade } from '../public/klub.facade';
import { CreateKlubDto, CreateKlubSchema } from './dtos/create-klub.dto';
import { UpdateKlubSchema, DeactivateKlubSchema } from './dtos/update-klub.dto';
import { AddMemberSchema } from './dtos/add-member.dto';
import { AddMediaSchema } from './dtos/add-media.dto';
import { AddSportInterestSchema } from './dtos/add-sport-interest.dto';
import { DiscoverKlubsQuerySchema } from './dtos/discover-klubs.dto';
import { CheckSlugQuerySchema } from './dtos/check-slug.dto';
import {
  ListMembershipRequestsQuerySchema,
  RejectMembershipRequestSchema,
  RequestMembershipSchema,
} from './dtos/membership-request.dto';

@Controller('klubs')
@UseGuards(FirebaseAuthGuard, PolicyGuard)
export class KlubController {
  constructor(private readonly klubFacade: KlubFacade) {}

  @Post()
  @RequirePolicy('klub.create')
  async createKlub(@Body() body: CreateKlubDto, @CurrentUser() user: AuthenticatedUser) {
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

  /**
   * Sprint C — solicitar entrada em Klub privado. Backend cria
   * MembershipRequest pending; KLUB_ADMIN decide via /klubs/:id/membership-requests.
   * Mesma policy `klub.join_via_link` (qualquer auth user pode pedir).
   */
  @Post('slug/:slug/request-join')
  @RequirePolicy('klub.join_via_link')
  async requestJoinBySlug(
    @Param('slug') slug: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dto = RequestMembershipSchema.parse(body);
    return this.klubFacade.requestMembership({
      klubSlug: slug,
      userId: user.userId,
      message: dto.message,
      attachmentUrl: dto.attachmentUrl,
    });
  }

  @Get(':id')
  async getKlub(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.klubFacade.getKlubById(id, user.userId);
  }

  /**
   * Edita Klub. KLUB_ADMIN edita campos user-facing (identidade, contato,
   * endereço, amenities, visibilidade). SUPER_ADMIN adicionalmente pode
   * mexer em campos sensíveis (legalName, plan, status, limites). Handler
   * valida e rejeita campos super-admin se não for SUPER_ADMIN.
   */
  @Patch(':id')
  @RequirePolicy('klub.update', (req) => ({
    klubId: (req as { params: { id: string } }).params.id,
  }))
  async updateKlub(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dto = UpdateKlubSchema.parse(body);
    const isSuperAdmin = user.roleAssignments.some((r) => r.role === 'PLATFORM_OWNER');
    return this.klubFacade.updateKlub({ klubId: id, patch: dto, isSuperAdmin });
  }

  /**
   * Desativa Klub (soft delete + status='suspended'). SUPER_ADMIN-only —
   * action `klub.deactivate` sem klubId no resource impede KLUB_ADMIN
   * (scopeMatches falha pra assignments scopeados quando resource.klubId
   * é undefined).
   */
  @Delete(':id')
  @RequirePolicy('klub.deactivate')
  async deactivateKlub(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dto = DeactivateKlubSchema.parse(body ?? {});
    return this.klubFacade.deactivateKlub({
      klubId: id,
      decidedById: user.userId,
      reason: dto.reason,
    });
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

  // ─── Sprint C: membership requests (KLUB_ADMIN per-klub) ────

  @Get(':id/membership-requests')
  @RequirePolicy('klub.membershipRequests.read', (req) => ({
    klubId: (req as { params: { id: string } }).params.id,
  }))
  async listMembershipRequests(@Param('id') klubId: string, @Query() query: unknown) {
    const dto = ListMembershipRequestsQuerySchema.parse(query);
    return this.klubFacade.listMembershipRequests({ klubId, ...dto });
  }

  @Post(':id/membership-requests/:reqId/approve')
  @RequirePolicy('klub.membershipRequests.decide', (req) => ({
    klubId: (req as { params: { id: string } }).params.id,
  }))
  async approveMembershipRequest(
    @Param('id') klubId: string,
    @Param('reqId') reqId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.klubFacade.approveMembershipRequest({
      klubId,
      requestId: reqId,
      decidedById: user.userId,
    });
  }

  @Post(':id/membership-requests/:reqId/reject')
  @RequirePolicy('klub.membershipRequests.decide', (req) => ({
    klubId: (req as { params: { id: string } }).params.id,
  }))
  async rejectMembershipRequest(
    @Param('id') klubId: string,
    @Param('reqId') reqId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dto = RejectMembershipRequestSchema.parse(body);
    return this.klubFacade.rejectMembershipRequest({
      klubId,
      requestId: reqId,
      decidedById: user.userId,
      reason: dto.reason,
    });
  }
}
