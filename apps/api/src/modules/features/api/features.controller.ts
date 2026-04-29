import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { CurrentUser } from '../../../shared/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.interface';
import { isPlatformLevel } from '../../../shared/auth/role-helpers';
import { ListFeaturesHandler } from '../application/queries/list-features.handler';
import { PatchFeatureHandler } from '../application/commands/patch-feature.handler';
import { PatchFeatureSchema } from './dtos/patch-feature.dto';

@Controller('features')
@UseGuards(FirebaseAuthGuard)
export class FeaturesController {
  constructor(
    private readonly listHandler: ListFeaturesHandler,
    private readonly patchHandler: PatchFeatureHandler,
  ) {}

  /**
   * GET /features — lista features com `enabled` já resolvido para o user
   * atual (tier do user vs tier da feature). Cache-Control 5 min privado.
   */
  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.listHandler.execute(user);
  }

  /**
   * PATCH /features/:id — atualiza `tier` e/ou `enabled`. Restrito a
   * PLATFORM_OWNER / PLATFORM_ADMIN. Grava audit trail com changedBy = email.
   */
  @Patch(':id')
  @HttpCode(200)
  async patch(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user.roleAssignments.some((r) => isPlatformLevel(r.role))) {
      throw new ForbiddenException('Apenas admins de plataforma podem alterar feature gates');
    }
    const dto = PatchFeatureSchema.parse(body);
    return this.patchHandler.execute({ id, changedBy: user.email, ...dto });
  }
}
