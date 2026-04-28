import { Injectable } from '@nestjs/common';
import type { KlubAccessMode, KlubDiscoveryResult } from '@draftklub/shared-types';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export type DiscoveryPeriod = 'morning' | 'afternoon' | 'evening';

export interface DiscoverKlubsCommand {
  q?: string;
  state?: string;
  sport?: string;
  limit?: number;
  /** city/state do user — usados pra ordenar por proximidade alfabético dentro do tier (fallback quando não há geo). */
  userCity?: string | null;
  userState?: string | null;
  /** Geo do user (browser geolocation ou fallback CEP). Quando presente,
   *  sort vira distance ASC (Haversine) em vez de tier-based. */
  lat?: number;
  lng?: number;
  /** Raio em km. Se omitido com lat/lng setados, sort por distância sem cap. */
  radiusKm?: number;
  /** Sprint B+3 — filtra Klubs com Spaces operando no período. */
  period?: DiscoveryPeriod;
}

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 50;
const EARTH_RADIUS_KM = 6371;

const PERIOD_RANGES: Record<DiscoveryPeriod, [number, number]> = {
  morning: [6, 12],
  afternoon: [12, 18],
  evening: [18, 23],
};

/**
 * Lista Klubs públicos (`discoverable=true`) filtrados por nome, UF e
 * esporte ativo.
 *
 * Ordenação:
 * - Com `lat`/`lng`: distance ASC (Haversine). `radiusKm` filtra
 *   resultados fora do raio. Klubs sem lat/lng vão pro fim.
 * - Sem geo: tier-based (mesma cidade > mesmo estado > resto), alfabético
 *   dentro de cada tier.
 *
 * Sort feito em memória (limit ≤ 50). PostGIS pode entrar em sprint
 * futuro se base crescer.
 */
@Injectable()
export class DiscoverKlubsHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: DiscoverKlubsCommand): Promise<KlubDiscoveryResult[]> {
    const limit = Math.min(cmd.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const userLat = cmd.lat;
    const userLng = cmd.lng;
    const radiusKm = cmd.radiusKm;
    const hasGeo = typeof userLat === 'number' && typeof userLng === 'number';

    const where: Record<string, unknown> = {
      discoverable: true,
      deletedAt: null,
      reviewStatus: 'approved',
      status: { in: ['active', 'trial'] },
    };

    if (cmd.q) {
      where.name = { contains: cmd.q, mode: 'insensitive' };
    }
    if (cmd.state) {
      where.state = cmd.state;
    }
    if (cmd.sport) {
      where.sportProfiles = {
        some: { sportCode: cmd.sport, status: 'active' },
      };
    }

    // Quando geo + radiusKm: pegamos mais que `limit` pra ter margem
    // pós-filtro Haversine. Cap em MAX_LIMIT*2 pra não explodir.
    const fetchTake = hasGeo ? Math.min(limit * 3, MAX_LIMIT * 3) : limit;

    const klubsRaw = await this.prisma.klub.findMany({
      where,
      include: {
        sportProfiles: {
          where: { status: 'active' },
          select: { sportCode: true },
        },
      },
      orderBy: { name: 'asc' },
      take: fetchTake,
    });

    let klubs = klubsRaw;
    if (cmd.period) {
      const [periodStart, periodEnd] = PERIOD_RANGES[cmd.period];
      const klubIds = klubsRaw.map((k) => k.id);
      // Carrega spaces ativos de todos os klubs candidatos numa query.
      const spaces = await this.prisma.space.findMany({
        where: {
          klubId: { in: klubIds },
          deletedAt: null,
          status: 'active',
          bookingActive: true,
        },
        select: { klubId: true, hourBands: true },
      });
      const matchingKlubIds = new Set<string>();
      for (const space of spaces) {
        const bands =
          (space.hourBands as unknown as { startHour: number; endHour: number }[]) ?? [];
        const operatesInPeriod = bands.some(
          (b) =>
            typeof b.startHour === 'number' &&
            typeof b.endHour === 'number' &&
            // banda intersecta período: max(start) < min(end)
            Math.max(b.startHour, periodStart) < Math.min(b.endHour, periodEnd),
        );
        if (operatesInPeriod) matchingKlubIds.add(space.klubId);
      }
      klubs = klubsRaw.filter((k) => matchingKlubIds.has(k.id));
    }

    if (hasGeo && typeof userLat === 'number' && typeof userLng === 'number') {
      const withDistance = klubs.map((k) => {
        const kLat = k.latitude !== null ? Number(k.latitude) : null;
        const kLng = k.longitude !== null ? Number(k.longitude) : null;
        const dist =
          kLat !== null && kLng !== null && Number.isFinite(kLat) && Number.isFinite(kLng)
            ? haversineKm(userLat, userLng, kLat, kLng)
            : null;
        return { klub: k, kLat, kLng, dist };
      });

      const filtered =
        typeof radiusKm === 'number'
          ? withDistance.filter((x) => x.dist !== null && x.dist <= radiusKm)
          : withDistance;

      const sorted = filtered.sort((a, b) => {
        if (a.dist === null && b.dist === null)
          return a.klub.name.localeCompare(b.klub.name, 'pt-BR');
        if (a.dist === null) return 1;
        if (b.dist === null) return -1;
        return a.dist - b.dist;
      });

      return sorted.slice(0, limit).map(({ klub, kLat, kLng, dist }) => ({
        id: klub.id,
        name: klub.name,
        slug: klub.slug,
        type: klub.type as KlubDiscoveryResult['type'],
        status: klub.status as KlubDiscoveryResult['status'],
        city: klub.city,
        state: klub.state,
        sports: klub.sportProfiles.map((s) => s.sportCode),
        accessMode: (klub.accessMode as KlubAccessMode) ?? 'public',
        latitude: kLat,
        longitude: kLng,
        distanceKm: dist !== null ? Math.round(dist * 10) / 10 : null,
      }));
    }

    const tierOf = (city: string | null, state: string | null): number => {
      if (cmd.userCity && city && cmd.userCity === city) return 0;
      if (cmd.userState && state && cmd.userState === state) return 1;
      return 2;
    };

    const ranked = klubs
      .map((k) => ({ klub: k, tier: tierOf(k.city, k.state) }))
      .sort((a, b) => {
        if (a.tier !== b.tier) return a.tier - b.tier;
        return a.klub.name.localeCompare(b.klub.name, 'pt-BR');
      });

    return ranked.slice(0, limit).map(({ klub }) => ({
      id: klub.id,
      name: klub.name,
      slug: klub.slug,
      type: klub.type as KlubDiscoveryResult['type'],
      status: klub.status as KlubDiscoveryResult['status'],
      city: klub.city,
      state: klub.state,
      sports: klub.sportProfiles.map((s) => s.sportCode),
      accessMode: (klub.accessMode as KlubAccessMode) ?? 'public',
      latitude: klub.latitude !== null ? Number(klub.latitude) : null,
      longitude: klub.longitude !== null ? Number(klub.longitude) : null,
      distanceKm: null,
    }));
  }
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}
