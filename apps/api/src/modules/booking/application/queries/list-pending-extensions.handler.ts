import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import type { BookingExtension } from '../commands/extend-booking.handler';

export interface PendingExtensionItem {
  bookingId: string;
  spaceName: string | null;
  primaryPlayerId: string | null;
  primaryPlayerName: string | null;
  startsAt: Date;
  endsAt: Date | null;
  extension: BookingExtension;
  requestedByName: string | null;
}

/**
 * Sprint Polish PR-C — lista extensões pendentes de aprovação do Klub.
 * Útil pra página admin `/k/:slug/extensions-pending`. Usa JSONB
 * containment (`array_contains [{status:'pending'}]`) pra filtrar bookings.
 *
 * Retorna 1 entry por extension pendente (booking pode ter múltiplas).
 */
@Injectable()
export class ListPendingExtensionsHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(klubId: string): Promise<PendingExtensionItem[]> {
    const bookings = await this.prisma.booking.findMany({
      where: {
        klubId,
        extensions: { array_contains: [{ status: 'pending' }] },
        deletedAt: null,
      },
      include: {
        space: { select: { name: true } },
      },
      orderBy: { startsAt: 'asc' },
    });
    if (bookings.length === 0) return [];

    const userIds = new Set<string>();
    for (const b of bookings) {
      if (b.primaryPlayerId) userIds.add(b.primaryPlayerId);
      const exts = (b.extensions as unknown as BookingExtension[]) ?? [];
      for (const ext of exts) {
        if (ext.status === 'pending' && ext.requestedById) userIds.add(ext.requestedById);
      }
    }
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...userIds] } },
      select: { id: true, fullName: true },
    });
    const nameById = new Map(users.map((u) => [u.id, u.fullName]));

    const out: PendingExtensionItem[] = [];
    for (const b of bookings) {
      const exts = (b.extensions as unknown as BookingExtension[]) ?? [];
      for (const ext of exts) {
        if (ext.status !== 'pending') continue;
        out.push({
          bookingId: b.id,
          spaceName: b.space?.name ?? null,
          primaryPlayerId: b.primaryPlayerId,
          primaryPlayerName: b.primaryPlayerId ? (nameById.get(b.primaryPlayerId) ?? null) : null,
          startsAt: b.startsAt,
          endsAt: b.endsAt,
          extension: ext,
          requestedByName: nameById.get(ext.requestedById) ?? null,
        });
      }
    }
    return out;
  }
}
