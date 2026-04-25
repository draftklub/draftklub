import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  CreateBookingHandler,
  type CreateBookingCommand,
} from '../application/commands/create-booking.handler';
import {
  ApproveBookingHandler,
  type ApproveBookingCommand,
} from '../application/commands/approve-booking.handler';
import {
  RejectBookingHandler,
  type RejectBookingCommand,
} from '../application/commands/reject-booking.handler';
import {
  CancelBookingHandler,
  type CancelBookingCommand,
} from '../application/commands/cancel-booking.handler';
import { GetSpaceAvailabilityHandler } from '../application/queries/get-space-availability.handler';
import { GetKlubCalendarHandler } from '../application/queries/get-klub-calendar.handler';
import {
  ListBookingsHandler,
  type ListBookingsFilters,
} from '../application/queries/list-bookings.handler';
import { GetBookingHandler } from '../application/queries/get-booking.handler';
import {
  CreateBookingSeriesHandler,
  type CreateBookingSeriesCommand,
} from '../application/commands/create-booking-series.handler';
import {
  CancelBookingSeriesHandler,
  type CancelBookingSeriesCommand,
} from '../application/commands/cancel-booking-series.handler';
import {
  CreateOperationalBlockHandler,
  type CreateOperationalBlockCommand,
} from '../application/commands/create-operational-block.handler';
import {
  CloseOperationalBlockHandler,
  type CloseOperationalBlockCommand,
} from '../application/commands/close-operational-block.handler';
import { NotFoundException } from '@nestjs/common';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class BookingFacade {
  constructor(
    private readonly prisma: PrismaService,
    private readonly createHandler: CreateBookingHandler,
    private readonly approveHandler: ApproveBookingHandler,
    private readonly rejectHandler: RejectBookingHandler,
    private readonly cancelHandler: CancelBookingHandler,
    private readonly availabilityHandler: GetSpaceAvailabilityHandler,
    private readonly calendarHandler: GetKlubCalendarHandler,
    private readonly listHandler: ListBookingsHandler,
    private readonly getHandler: GetBookingHandler,
    private readonly createSeriesHandler: CreateBookingSeriesHandler,
    private readonly cancelSeriesHandler: CancelBookingSeriesHandler,
    private readonly createBlockHandler: CreateOperationalBlockHandler,
    private readonly closeBlockHandler: CloseOperationalBlockHandler,
  ) {}

  async createBooking(cmd: CreateBookingCommand) {
    return this.createHandler.execute(cmd);
  }

  async approveBooking(cmd: ApproveBookingCommand) {
    return this.approveHandler.execute(cmd);
  }

  async rejectBooking(cmd: RejectBookingCommand) {
    return this.rejectHandler.execute(cmd);
  }

  async cancelBooking(cmd: CancelBookingCommand) {
    return this.cancelHandler.execute(cmd);
  }

  async getSpaceAvailability(spaceId: string, date: string) {
    return this.availabilityHandler.execute(spaceId, date);
  }

  async getKlubCalendar(klubId: string, date: string) {
    return this.calendarHandler.execute(klubId, date);
  }

  async listBookings(filters: ListBookingsFilters) {
    return this.listHandler.execute(filters);
  }

  async getBooking(bookingId: string) {
    return this.getHandler.execute(bookingId);
  }

  async createBookingSeries(cmd: CreateBookingSeriesCommand) {
    return this.createSeriesHandler.execute(cmd);
  }

  async cancelBookingSeries(cmd: CancelBookingSeriesCommand) {
    return this.cancelSeriesHandler.execute(cmd);
  }

  async getBookingSeries(seriesId: string) {
    const series = await this.prisma.bookingSeries.findUnique({
      where: { id: seriesId },
    });
    if (!series) throw new NotFoundException('Series not found');
    return series;
  }

  async createOperationalBlock(cmd: CreateOperationalBlockCommand) {
    return this.createBlockHandler.execute(cmd);
  }

  async closeOperationalBlock(cmd: CloseOperationalBlockCommand) {
    return this.closeBlockHandler.execute(cmd);
  }

  async userIsStaffOfKlub(userId: string, klubId: string): Promise<boolean> {
    if (!userId || !klubId) return false;
    if (!UUID_REGEX.test(userId) || !UUID_REGEX.test(klubId)) return false;

    const role = await this.prisma.roleAssignment.findFirst({
      where: {
        userId,
        OR: [
          { role: 'SUPER_ADMIN' },
          {
            scopeKlubId: klubId,
            role: { in: ['KLUB_ADMIN', 'STAFF'] },
          },
        ],
      },
    });
    return role !== null;
  }
}
