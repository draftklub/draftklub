import { Injectable } from '@nestjs/common';
import type { KlubAccessMode, KlubDiscoveryResult } from '@draftklub/shared-types';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface DiscoverKlubsCommand {
  q?: string;
  state?: string;
  sport?: string;
  limit?: number;
  /** city/state do user — usados pra ordenar por proximidade alfabético dentro do tier. */
  userCity?: string | null;
  userState?: string | null;
}

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 50;

/**
 * Lista Klubs públicos (`discoverable=true`) filtrados por nome, UF e
 * esporte ativo. Sort tier-based:
 *
 * - Tier 0: mesma cidade do user
 * - Tier 1: mesmo estado, cidade diferente
 * - Tier 2: outro estado
 *
 * Dentro de cada tier, alfabético por nome (ASC). Tier-aware sort feito
 * em memória após query Prisma — sem escala explosiva (limit ≤ 50).
 *
 * Sprint B: sem geo (lat/lng/distance). Sprint B+1 adiciona radius
 * Haversine.
 */
@Injectable()
export class DiscoverKlubsHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: DiscoverKlubsCommand): Promise<KlubDiscoveryResult[]> {
    const limit = Math.min(cmd.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    const where: Record<string, unknown> = {
      discoverable: true,
      deletedAt: null,
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

    const klubs = await this.prisma.klub.findMany({
      where,
      include: {
        sportProfiles: {
          where: { status: 'active' },
          select: { sportCode: true },
        },
      },
      orderBy: { name: 'asc' },
      take: limit,
    });

    const tierOf = (city: string | null, state: string | null): number => {
      if (cmd.userCity && city && cmd.userCity === city) return 0;
      if (cmd.userState && state && cmd.userState === state) return 1;
      return 2;
    };

    const ranked = klubs
      .map((k) => ({
        klub: k,
        tier: tierOf(k.city, k.state),
      }))
      .sort((a, b) => {
        if (a.tier !== b.tier) return a.tier - b.tier;
        return a.klub.name.localeCompare(b.klub.name, 'pt-BR');
      });

    return ranked.map(({ klub }) => ({
      id: klub.id,
      name: klub.name,
      slug: klub.slug,
      type: klub.type as KlubDiscoveryResult['type'],
      status: klub.status as KlubDiscoveryResult['status'],
      city: klub.city,
      state: klub.state,
      sports: klub.sportProfiles.map((s) => s.sportCode),
      accessMode: (klub.accessMode as KlubAccessMode) ?? 'public',
    }));
  }
}
