import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { CurrentUser } from '../../../shared/auth/current-user.decorator';
import { RequirePolicy } from '../../../shared/auth/require-policy.decorator';
import { PolicyGuard } from '../../../shared/auth/policy.guard';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.interface';
import { KlubFacade } from '../public/klub.facade';
import {
  ListPendingKlubsQuerySchema,
  RejectKlubSchema,
  UpdatePendingKlubSchema,
} from './dtos/admin-klub.dto';

/**
 * Sprint D PR2 — área de admin de cadastros. SUPER_ADMIN-only via
 * `klub.review` policy (PolicyEngine bypassa SUPER_ADMIN; outros roles
 * caem fora porque action `klub.review` não tem regra de domínio).
 */
@Controller('admin/klubs')
@UseGuards(FirebaseAuthGuard, PolicyGuard)
export class AdminKlubController {
  constructor(private readonly klubFacade: KlubFacade) {}

  @Get('pending')
  @RequirePolicy('klub.review')
  async listPending(@Query() query: unknown) {
    const dto = ListPendingKlubsQuerySchema.parse(query);
    return this.klubFacade.listPendingKlubs(dto);
  }

  @Get(':id')
  @RequirePolicy('klub.review')
  async getDetail(@Param('id') id: string) {
    return this.klubFacade.getPendingKlub(id);
  }

  @Patch(':id')
  @RequirePolicy('klub.review')
  async update(@Param('id') id: string, @Body() body: unknown) {
    const dto = UpdatePendingKlubSchema.parse(body);
    return this.klubFacade.updatePendingKlub({ klubId: id, patch: dto });
  }

  @Post(':id/approve')
  @RequirePolicy('klub.review')
  async approve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.klubFacade.approveKlub({ klubId: id, decidedById: user.userId });
  }

  @Post(':id/reject')
  @RequirePolicy('klub.review')
  async reject(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dto = RejectKlubSchema.parse(body);
    return this.klubFacade.rejectKlub({
      klubId: id,
      decidedById: user.userId,
      reason: dto.reason,
    });
  }
}
