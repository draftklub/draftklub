import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { PolicyGuard } from '../../../shared/auth/policy.guard';
import { RequirePolicy } from '../../../shared/auth/require-policy.decorator';
import { CurrentUser } from '../../../shared/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.interface';
import { uuidString } from '../../../shared/validation/uuid-string';
import { KlubFacade } from '../public/klub.facade';

const ReasonBodySchema = z.object({ reason: z.string().max(500).optional() });
const CreateDirectBodySchema = z.object({ userId: uuidString() });

@Controller('klubs/:klubId/sports/:sportCode/enrollments')
@UseGuards(FirebaseAuthGuard, PolicyGuard)
export class EnrollmentScopeController {
  constructor(private readonly facade: KlubFacade) {}

  @Post()
  async request(
    @Param('klubId') klubId: string,
    @Param('sportCode') sportCode: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.facade.requestEnrollment({ userId: user.userId, klubId, sportCode });
  }

  @Post('admin')
  @RequirePolicy('klub.members.add', (req) => ({
    klubId: (req as { params: { klubId: string } }).params.klubId,
  }))
  async createDirect(
    @Param('klubId') klubId: string,
    @Param('sportCode') sportCode: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dto = CreateDirectBodySchema.parse(body);
    return this.facade.createEnrollmentDirect({
      userId: dto.userId,
      klubId,
      sportCode,
      approvedById: user.userId,
    });
  }

  @Get()
  @RequirePolicy('klub.members.read', (req) => ({
    klubId: (req as { params: { klubId: string } }).params.klubId,
  }))
  async list(@Param('klubId') klubId: string, @Param('sportCode') sportCode: string) {
    return this.facade.listEnrollmentsByProfile(klubId, sportCode);
  }
}

@Controller('enrollments/:enrollmentId')
@UseGuards(FirebaseAuthGuard, PolicyGuard)
export class EnrollmentActionsController {
  constructor(private readonly facade: KlubFacade) {}

  @Patch('approve')
  async approve(
    @Param('enrollmentId') enrollmentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.facade.approveEnrollment({ enrollmentId, approvedById: user.userId });
  }

  @Patch('reject')
  async reject(
    @Param('enrollmentId') enrollmentId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dto = ReasonBodySchema.parse(body ?? {});
    return this.facade.rejectEnrollment({
      enrollmentId,
      rejectedById: user.userId,
      reason: dto.reason,
    });
  }

  @Patch('suspend')
  async suspend(
    @Param('enrollmentId') enrollmentId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dto = ReasonBodySchema.parse(body ?? {});
    return this.facade.suspendEnrollment({
      enrollmentId,
      suspendedById: user.userId,
      reason: dto.reason,
    });
  }

  @Patch('reactivate')
  async reactivate(
    @Param('enrollmentId') enrollmentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.facade.reactivateEnrollment({ enrollmentId, approvedById: user.userId });
  }

  @Delete()
  async cancel(
    @Param('enrollmentId') enrollmentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.facade.cancelEnrollment({ enrollmentId, cancelledById: user.userId });
  }
}

@Controller('users/:userId/enrollments')
@UseGuards(FirebaseAuthGuard)
export class EnrollmentsByUserController {
  constructor(private readonly facade: KlubFacade) {}

  @Get()
  async list(@Param('userId') userId: string) {
    return this.facade.listEnrollmentsByUser(userId);
  }
}

/**
 * Sprint Polish PR-H3 — versão `/me` pra evitar 2 calls (getMe + list).
 * Usado pela sidebar pra cruzar enrollments com modalidades de cada Klub.
 */
@Controller('me/enrollments')
@UseGuards(FirebaseAuthGuard)
export class MeEnrollmentsController {
  constructor(private readonly facade: KlubFacade) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.facade.listEnrollmentsByUser(user.userId);
  }
}
