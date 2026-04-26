import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export type Visibility = 'full' | 'limited';

export interface ViewerRole {
  role: string;
  scopeKlubId?: string | null;
  scopeSportId?: string | null;
}

export interface BookingVisibilityContext {
  viewerId: string;
  viewerRoles: ViewerRole[];
  bookingKlubId: string;
  bookingPrimaryPlayerId: string | null;
  bookingOtherPlayerIds: string[];
  bookingType: string;
  spaceSportCode?: string | null;
}

@Injectable()
export class BookingVisibilityService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(ctx: BookingVisibilityContext): Promise<Visibility> {
    if (
      ctx.viewerId === ctx.bookingPrimaryPlayerId ||
      ctx.bookingOtherPlayerIds.includes(ctx.viewerId)
    ) {
      return 'full';
    }

    if (ctx.viewerRoles.some((r) => r.role === 'SUPER_ADMIN')) return 'full';

    if (
      ctx.viewerRoles.some(
        (r) => r.role === 'KLUB_ADMIN' && r.scopeKlubId === ctx.bookingKlubId,
      )
    ) {
      return 'full';
    }

    if (
      ctx.viewerRoles.some(
        (r) => r.role === 'STAFF' && r.scopeKlubId === ctx.bookingKlubId,
      )
    ) {
      return 'full';
    }

    if (ctx.spaceSportCode) {
      const isCommitteeOfSport = ctx.viewerRoles.some(
        (r) =>
          r.role === 'SPORTS_COMMITTEE' &&
          r.scopeKlubId === ctx.bookingKlubId &&
          r.scopeSportId === ctx.spaceSportCode,
      );
      if (isCommitteeOfSport) return 'full';
    }

    // Membership do mesmo Klub: full (MVP - PlayerSportEnrollment ainda nao existe).
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId: ctx.viewerId,
        klubId: ctx.bookingKlubId,
        status: 'active',
      },
      select: { id: true },
    });
    if (membership) return 'full';

    return 'limited';
  }
}
