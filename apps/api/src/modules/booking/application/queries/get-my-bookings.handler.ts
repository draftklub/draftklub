import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface MyBookingExtension {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  extendedTo: string;
  requestedById: string;
}

export interface MyBookingItem {
  id: string;
  startsAt: Date;
  endsAt: Date | null;
  status: string;
  notes: string | null;
  matchType: string | null;
  bookingType: string;
  primaryPlayerId: string | null;
  klub: { id: string; slug: string; name: string };
  space: { id: string; name: string; type: string };
  /** Sprint Polish PR-I1 — extensões do booking. UI usa pra badge "extensão pendente". */
  extensions: MyBookingExtension[];
}

/**
 * Sprint Polish PR-B — lista reservas do user logado em todos os Klubs.
 * Usa OR (primary_player) + JSONB containment (`array_contains`)
 * pra capturar bookings onde o user é otherPlayer também.
 *
 * Booking não tem `klub` relation no Prisma (sem FK no schema), então
 * pesca Klubs em batch num findMany separado e faz join em JS — barato
 * porque distinct(klubId) costuma ser pequeno.
 *
 * Soft-deleted ignorado. Sem paginação no MVP — assume volume baixo
 * por user; revisitar quando passar de ~200 reservas históricas.
 */
@Injectable()
export class GetMyBookingsHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string): Promise<MyBookingItem[]> {
    const rows = await this.prisma.booking.findMany({
      where: {
        OR: [{ primaryPlayerId: userId }, { otherPlayers: { array_contains: [{ userId }] } }],
        deletedAt: null,
      },
      include: {
        space: { select: { id: true, name: true, type: true } },
      },
      orderBy: { startsAt: 'desc' },
    });
    if (rows.length === 0) return [];

    const klubIds = [...new Set(rows.map((r) => r.klubId))];
    const klubs = await this.prisma.klub.findMany({
      where: { id: { in: klubIds } },
      select: { id: true, slug: true, name: true },
    });
    const byId = new Map(klubs.map((k) => [k.id, k]));

    return rows
      .map((b) => {
        const klub = byId.get(b.klubId);
        if (!klub) return null;
        const exts =
          (b.extensions as
            | { id?: string; status?: string; extendedTo?: string; requestedById?: string }[]
            | null) ?? [];
        const extensions: MyBookingExtension[] = exts
          .filter(
            (e): e is MyBookingExtension =>
              typeof e.id === 'string' &&
              (e.status === 'pending' || e.status === 'approved' || e.status === 'rejected') &&
              typeof e.extendedTo === 'string' &&
              typeof e.requestedById === 'string',
          )
          .map((e) => ({
            id: e.id,
            status: e.status,
            extendedTo: e.extendedTo,
            requestedById: e.requestedById,
          }));
        return {
          id: b.id,
          startsAt: b.startsAt,
          endsAt: b.endsAt,
          status: b.status,
          notes: b.notes,
          matchType: b.matchType,
          bookingType: b.bookingType,
          primaryPlayerId: b.primaryPlayerId,
          klub,
          space: b.space,
          extensions,
        };
      })
      .filter((x): x is MyBookingItem => x !== null);
  }
}
