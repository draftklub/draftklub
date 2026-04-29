import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  type CursorPage,
  type CursorPaginationParams,
  buildCursorPage,
  decodeCursor,
} from '../../../../shared/pagination/cursor';

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

interface BookingCursor extends Record<string, unknown> {
  startsAt: string; // ISO
  id: string;
}

/**
 * Sprint Polish PR-B + Sprint N batch 4 — lista reservas do user logado
 * em todos os Klubs com cursor pagination.
 *
 * Usa OR (primary_player) + JSONB containment (`array_contains`)
 * pra capturar bookings onde o user é otherPlayer também.
 *
 * Booking não tem `klub` relation no Prisma (sem FK no schema), então
 * pesca Klubs em batch num findMany separado e faz join em JS — barato
 * porque distinct(klubId) costuma ser pequeno.
 *
 * Cursor: { startsAt, id }. Ordering: startsAt DESC, id DESC (tiebreaker).
 * Cliente pede `limit=N`, recebe `{ items, nextCursor }`. Cursor opaco
 * (base64 JSON). Soft-deleted ignorado.
 */
@Injectable()
export class GetMyBookingsHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    userId: string,
    params: CursorPaginationParams = { limit: 50 },
  ): Promise<CursorPage<MyBookingItem>> {
    const limit = params.limit;
    const cursor = decodeCursor<BookingCursor>(params.cursor);

    // Keyset: WHERE (startsAt, id) < (cursor.startsAt, cursor.id) — em DESC order.
    // Prisma não tem keyset nativo, usamos OR chain equivalente.
    const cursorWhere = cursor
      ? {
          OR: [
            { startsAt: { lt: new Date(cursor.startsAt) } },
            { startsAt: new Date(cursor.startsAt), id: { lt: cursor.id } },
          ],
        }
      : {};

    const rows = await this.prisma.booking.findMany({
      where: {
        OR: [{ primaryPlayerId: userId }, { otherPlayers: { array_contains: [{ userId }] } }],
        deletedAt: null,
        ...cursorWhere,
      },
      include: {
        space: { select: { id: true, name: true, type: true } },
      },
      orderBy: [{ startsAt: 'desc' }, { id: 'desc' }],
      take: limit + 1, // pesca limit+1 pra detectar nextCursor
    });
    if (rows.length === 0) return { items: [], nextCursor: null };

    const klubIds = [...new Set(rows.map((r) => r.klubId))];
    const klubs = await this.prisma.klub.findMany({
      where: { id: { in: klubIds } },
      select: { id: true, slug: true, name: true },
    });
    const byId = new Map(klubs.map((k) => [k.id, k]));

    const mapped = rows
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

    return buildCursorPage(mapped, limit, (item) => ({
      startsAt: item.startsAt.toISOString(),
      id: item.id,
    }));
  }
}
