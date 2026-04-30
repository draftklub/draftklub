import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  HourBandResolverService,
  type HourBand,
} from '../../domain/services/hour-band-resolver.service';

export interface ExtendBookingCommand {
  bookingId: string;
  additionalMinutes: number;
  notes?: string;
  requestedById: string;
  isStaff: boolean;
}

export interface BookingExtension {
  id: string;
  extendedFrom: string;
  extendedTo: string;
  mode: 'player' | 'staff_approval' | 'staff_only';
  status: 'approved' | 'pending' | 'rejected';
  requestedById: string;
  requestedAt: string;
  decidedById?: string;
  decidedAt?: string;
  decisionReason?: string;
}

@Injectable()
export class ExtendBookingHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hourBandResolver: HourBandResolverService,
  ) {}

  async execute(cmd: ExtendBookingCommand) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: cmd.bookingId },
      include: { space: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    const space = booking.space;

    const klub = await this.prisma.klub.findUnique({
      where: { id: booking.klubId },
      include: { config: true },
    });
    const config = klub?.config;
    if (!config) throw new BadRequestException('Klub config missing');

    const blockTypes = ['maintenance', 'weather_closed', 'staff_blocked'];
    if (blockTypes.includes(booking.bookingType)) {
      throw new BadRequestException('Cannot extend operational blocks');
    }
    if (booking.status !== 'confirmed') {
      throw new BadRequestException(`Cannot extend booking in status '${booking.status}'`);
    }
    if (!booking.endsAt) {
      throw new BadRequestException('Cannot extend booking without endsAt');
    }

    const mode = config.extensionMode;
    if (mode === 'disabled') {
      throw new BadRequestException('This Klub has extension disabled');
    }

    const isPrimaryPlayer = booking.primaryPlayerId === cmd.requestedById;
    const otherPlayers = (booking.otherPlayers as { userId?: string }[] | null) ?? [];
    const isInOtherPlayers = otherPlayers.some((p) => p.userId === cmd.requestedById);
    const isParticipant = isPrimaryPlayer || isInOtherPlayers;

    if (!cmd.isStaff && !isParticipant) {
      throw new ForbiddenException('Only participants or staff can request extension');
    }
    if (mode === 'staff_only' && !cmd.isStaff) {
      throw new ForbiddenException('This Klub allows only staff to extend');
    }

    if (cmd.additionalMinutes % space.slotGranularityMinutes !== 0) {
      throw new BadRequestException(
        `Extension must be a multiple of ${space.slotGranularityMinutes} minutes`,
      );
    }

    if (mode === 'player' && !cmd.isStaff) {
      const now = new Date();
      if (now < booking.endsAt) {
        throw new BadRequestException(
          'Player can only request extension at or after booking endsAt',
        );
      }
    }

    const newEndsAt = new Date(booking.endsAt.getTime() + cmd.additionalMinutes * 60_000);

    const spaceConflict = await this.prisma.booking.findFirst({
      where: {
        spaceId: booking.spaceId,
        id: { not: booking.id },
        status: { in: ['pending', 'confirmed'] },
        startsAt: { lt: newEndsAt },
        endsAt: { gt: booking.endsAt },
      },
    });
    if (spaceConflict) {
      throw new ConflictException({
        type: 'space_conflict',
        conflictingBookingId: spaceConflict.id,
        message: 'Space is not available for the extension period',
      });
    }

    const { crosses, finalBand } = this.hourBandResolver.intervalCrossesBandBoundary(
      booking.endsAt,
      newEndsAt,
      (space.hourBands as unknown as HourBand[]) ?? [],
    );

    if (crosses && finalBand) {
      if (otherPlayers.length > 0 && !this.hourBandResolver.bandAllowsGuests(finalBand)) {
        throw new BadRequestException(
          `Extension crosses into '${finalBand.type}' band which does not allow guests`,
        );
      }
    }

    const extensionStatus: BookingExtension['status'] =
      mode === 'staff_approval' && !cmd.isStaff ? 'pending' : 'approved';

    const newExtension: BookingExtension = {
      id: randomUUID(),
      extendedFrom: booking.endsAt.toISOString(),
      extendedTo: newEndsAt.toISOString(),
      mode,
      status: extensionStatus,
      requestedById: cmd.requestedById,
      requestedAt: new Date().toISOString(),
      ...(extensionStatus === 'approved'
        ? {
            decidedById: cmd.requestedById,
            decidedAt: new Date().toISOString(),
          }
        : {}),
      ...(cmd.notes ? { decisionReason: cmd.notes } : {}),
    };

    const existing = (booking.extensions as unknown as BookingExtension[]) ?? [];
    const updatedExtensions = [...existing, newExtension];

    return this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        endsAt: extensionStatus === 'approved' ? newEndsAt : booking.endsAt,
        extensions: updatedExtensions as unknown as Prisma.InputJsonValue,
      },
    });
  }
}
