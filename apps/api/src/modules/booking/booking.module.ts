import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { SeriesGeneratorService } from './domain/services/series-generator.service';
import { HourBandResolverService } from './domain/services/hour-band-resolver.service';
import { CreateBookingHandler } from './application/commands/create-booking.handler';
import { ApproveBookingHandler } from './application/commands/approve-booking.handler';
import { RejectBookingHandler } from './application/commands/reject-booking.handler';
import { CancelBookingHandler } from './application/commands/cancel-booking.handler';
import { CreateBookingSeriesHandler } from './application/commands/create-booking-series.handler';
import { CancelBookingSeriesHandler } from './application/commands/cancel-booking-series.handler';
import { CreateOperationalBlockHandler } from './application/commands/create-operational-block.handler';
import { CloseOperationalBlockHandler } from './application/commands/close-operational-block.handler';
import { ExtendBookingHandler } from './application/commands/extend-booking.handler';
import { ApproveExtensionHandler } from './application/commands/approve-extension.handler';
import { RejectExtensionHandler } from './application/commands/reject-extension.handler';
import { GetSpaceAvailabilityHandler } from './application/queries/get-space-availability.handler';
import { GetKlubCalendarHandler } from './application/queries/get-klub-calendar.handler';
import { ListBookingsHandler } from './application/queries/list-bookings.handler';
import { GetBookingHandler } from './application/queries/get-booking.handler';
import { BookingFacade } from './public/booking.facade';
import { BookingController } from './api/booking.controller';
import { BookingActionsController } from './api/booking-actions.controller';
import { SpaceAvailabilityController } from './api/space-availability.controller';
import { KlubCalendarController } from './api/klub-calendar.controller';
import {
  BookingSeriesController,
  BookingSeriesActionsController,
} from './api/booking-series.controller';
import {
  OperationalBlockController,
  OperationalBlockActionsController,
} from './api/operational-block.controller';
import {
  BookingExtensionController,
  BookingExtensionActionsController,
} from './api/booking-extension.controller';

@Module({
  imports: [IdentityModule],
  controllers: [
    BookingController,
    BookingActionsController,
    SpaceAvailabilityController,
    KlubCalendarController,
    BookingSeriesController,
    BookingSeriesActionsController,
    OperationalBlockController,
    OperationalBlockActionsController,
    BookingExtensionController,
    BookingExtensionActionsController,
  ],
  providers: [
    SeriesGeneratorService,
    HourBandResolverService,
    CreateBookingHandler,
    ApproveBookingHandler,
    RejectBookingHandler,
    CancelBookingHandler,
    CreateBookingSeriesHandler,
    CancelBookingSeriesHandler,
    CreateOperationalBlockHandler,
    CloseOperationalBlockHandler,
    ExtendBookingHandler,
    ApproveExtensionHandler,
    RejectExtensionHandler,
    GetSpaceAvailabilityHandler,
    GetKlubCalendarHandler,
    ListBookingsHandler,
    GetBookingHandler,
    BookingFacade,
  ],
  exports: [BookingFacade],
})
export class BookingModule {}
