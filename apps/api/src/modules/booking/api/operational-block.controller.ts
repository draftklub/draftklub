import { Controller, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../../shared/auth/firebase-auth.guard';
import { PolicyGuard } from '../../../shared/auth/policy.guard';
import { RequirePolicy } from '../../../shared/auth/require-policy.decorator';
import { CurrentUser } from '../../../shared/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.interface';
import { BookingFacade } from '../public/booking.facade';
import {
  CreateOperationalBlockSchema,
  CloseOperationalBlockSchema,
} from './dtos/create-operational-block.dto';

@Controller('klubs/:klubId/operational-blocks')
@UseGuards(FirebaseAuthGuard, PolicyGuard)
export class OperationalBlockController {
  constructor(private readonly facade: BookingFacade) {}

  @Post()
  @RequirePolicy('booking.approve', (req) => ({
    klubId: (req as { params: { klubId: string } }).params.klubId,
  }))
  async create(
    @Param('klubId') klubId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dto = CreateOperationalBlockSchema.parse(body);
    return this.facade.createOperationalBlock({
      klubId,
      spaceId: dto.spaceId,
      blockType: dto.blockType,
      startsAt: new Date(dto.startsAt),
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      reason: dto.reason,
      notes: dto.notes,
      createdById: user.userId,
      recurrence: dto.recurrence
        ? {
            frequency: dto.recurrence.frequency,
            interval: dto.recurrence.interval,
            daysOfWeek: dto.recurrence.daysOfWeek,
            endsOn: new Date(dto.recurrence.endsOn),
            durationMinutes: dto.recurrence.durationMinutes,
          }
        : undefined,
    });
  }
}

@Controller('operational-blocks/:bookingId')
@UseGuards(FirebaseAuthGuard, PolicyGuard)
export class OperationalBlockActionsController {
  constructor(private readonly facade: BookingFacade) {}

  @Patch('close')
  @RequirePolicy('booking.approve', { resolveKlubIdFrom: 'booking:bookingId' })
  async close(
    @Param('bookingId') bookingId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const dto = CloseOperationalBlockSchema.parse(body);
    return this.facade.closeOperationalBlock({
      bookingId,
      closedById: user.userId,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
    });
  }
}
