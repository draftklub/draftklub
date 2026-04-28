import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { CurrentUser } from '../../../shared/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.interface';
import { uuidString } from '../../../shared/validation/uuid-string';
import { GrantRoleHandler } from '../application/commands/grant-role.handler';
import { RevokeRoleHandler } from '../application/commands/revoke-role.handler';
import {
  ListRoleAssignmentsHandler,
  type RoleAssignmentListItem,
} from '../application/queries/list-role-assignments.handler';
import {
  GrantKlubRoleSchema,
  GrantPlatformRoleSchema,
} from './dtos/role-assignment.dto';

/**
 * Sprint Polish PR-J2 — endpoints REST pra gestão de role assignments.
 *
 * Não usa `PolicyGuard` no nível do método porque a verificação depende
 * de `targetRole`, que sai do body (POST) ou do banco (DELETE). A
 * autorização é feita dentro de cada handler usando `PolicyEngine.can()`
 * com `ResourceContext.targetRole` populado.
 */
@Controller()
@UseGuards(FirebaseAuthGuard)
export class RoleAssignmentsController {
  constructor(
    private readonly listHandler: ListRoleAssignmentsHandler,
    private readonly grantHandler: GrantRoleHandler,
    private readonly revokeHandler: RevokeRoleHandler,
  ) {}

  // ─── Platform-level (scopeKlubId IS NULL) ────────────────────────────

  @Get('platform/role-assignments')
  async listPlatform(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RoleAssignmentListItem[]> {
    return this.listHandler.execute({ caller: user, scopeKlubId: null });
  }

  @Post('platform/role-assignments')
  async grantPlatform(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ): Promise<{ id: string; userId: string }> {
    const dto = GrantPlatformRoleSchema.parse(body);
    return this.grantHandler.execute({
      caller: user,
      targetEmail: dto.email,
      targetRole: 'PLATFORM_ADMIN',
      scopeKlubId: null,
      scopeSportId: null,
    });
  }

  @Delete('platform/role-assignments/:id')
  @HttpCode(204)
  async revokePlatform(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    const assignmentId = uuidString().parse(id);
    await this.revokeHandler.execute({
      caller: user,
      assignmentId,
      expectedScopeKlubId: null,
    });
  }

  // ─── Klub-scoped (scopeKlubId = :klubId) ─────────────────────────────

  @Get('klubs/:klubId/role-assignments')
  async listKlub(
    @CurrentUser() user: AuthenticatedUser,
    @Param('klubId') klubId: string,
  ): Promise<RoleAssignmentListItem[]> {
    const scopeKlubId = uuidString().parse(klubId);
    return this.listHandler.execute({ caller: user, scopeKlubId });
  }

  @Post('klubs/:klubId/role-assignments')
  async grantKlub(
    @CurrentUser() user: AuthenticatedUser,
    @Param('klubId') klubId: string,
    @Body() body: unknown,
  ): Promise<{ id: string; userId: string }> {
    const scopeKlubId = uuidString().parse(klubId);
    const dto = GrantKlubRoleSchema.parse(body);
    return this.grantHandler.execute({
      caller: user,
      targetEmail: dto.email,
      targetRole: dto.role,
      scopeKlubId,
      scopeSportId: dto.scopeSportId ?? null,
    });
  }

  @Delete('klubs/:klubId/role-assignments/:id')
  @HttpCode(204)
  async revokeKlub(
    @CurrentUser() user: AuthenticatedUser,
    @Param('klubId') klubId: string,
    @Param('id') id: string,
  ): Promise<void> {
    const scopeKlubId = uuidString().parse(klubId);
    const assignmentId = uuidString().parse(id);
    await this.revokeHandler.execute({
      caller: user,
      assignmentId,
      expectedScopeKlubId: scopeKlubId,
    });
  }
}
