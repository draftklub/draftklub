import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  BookingVisibilityService,
  type ViewerRole,
} from '../../domain/services/booking-visibility.service';
import {
  presentBooking,
  type BookingResponseFull,
  type BookingResponseLimited,
  type TournamentInfo,
} from '../../api/presenters/booking.presenter';

export interface GetBookingForViewerQuery {
  bookingId: string;
  viewerId: string;
}

@Injectable()
export class GetBookingHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibilityService: BookingVisibilityService,
  ) {}

  /**
   * Retorna booking raw (sem presenter). Uso interno: cancel/extend/series.
   */
  async execute(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        space: { select: { id: true, name: true, type: true, sportCode: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  /**
   * Retorna booking com presenter aplicado (full | limited).
   * Uso externo: GET /bookings/:id.
   */
  async executeForViewer(
    query: GetBookingForViewerQuery,
  ): Promise<BookingResponseFull | BookingResponseLimited> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: query.bookingId },
      include: {
        space: { select: { id: true, name: true, type: true, sportCode: true } },
        tournamentMatch: {
          include: { tournament: { select: { name: true } } },
        },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const viewerRoles = await this.loadViewerRoles(query.viewerId);

    const otherPlayerIds = ((booking.otherPlayers as { userId?: string }[] | null) ?? [])
      .map((p) => p.userId)
      .filter((id): id is string => Boolean(id));

    const visibility = await this.visibilityService.resolve({
      viewerId: query.viewerId,
      viewerRoles,
      bookingKlubId: booking.klubId,
      bookingPrimaryPlayerId: booking.primaryPlayerId,
      bookingOtherPlayerIds: otherPlayerIds,
      bookingType: booking.bookingType,
      spaceSportCode: booking.space.sportCode,
    });

    const tournamentInfo: TournamentInfo | undefined = booking.tournamentMatch
      ? {
          tournamentName: booking.tournamentMatch.tournament.name,
          phase: booking.tournamentMatch.phase,
          matchKind: booking.tournamentMatch.matchKind,
        }
      : undefined;

    return presentBooking(booking, visibility, tournamentInfo);
  }

  private async loadViewerRoles(userId: string): Promise<ViewerRole[]> {
    if (!userId) return [];
    return this.prisma.roleAssignment.findMany({
      where: { userId },
      select: { role: true, scopeKlubId: true, scopeSportId: true },
    });
  }
}
