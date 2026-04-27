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
      ctx.viewerRoles.some((r) => r.role === 'KLUB_ADMIN' && r.scopeKlubId === ctx.bookingKlubId)
    ) {
      return 'full';
    }

    if (ctx.viewerRoles.some((r) => r.role === 'STAFF' && r.scopeKlubId === ctx.bookingKlubId)) {
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

    // PlayerSportEnrollment ativo na modalidade do booking -> full (W2.3).
    if (ctx.spaceSportCode && ctx.viewerId) {
      const profile = await this.prisma.klubSportProfile.findFirst({
        where: { klubId: ctx.bookingKlubId, sportCode: ctx.spaceSportCode },
        select: { id: true },
      });
      if (profile) {
        const enrollment = await this.prisma.playerSportEnrollment.findUnique({
          where: {
            userId_klubSportProfileId: {
              userId: ctx.viewerId,
              klubSportProfileId: profile.id,
            },
          },
          select: { status: true },
        });
        if (enrollment?.status === 'active') return 'full';
      }
    }

    return 'limited';
  }
}
