import { Injectable } from '@nestjs/common';
import type { KlubReviewStatus } from '@draftklub/shared-types';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface ListPendingKlubsCommand {
  /** Filtro por tipo de identidade legal — admin tem listas separadas. */
  type?: 'pj' | 'pf';
  /** Filtro pelo status da revisão. Default 'pending'. */
  status?: KlubReviewStatus;
  /** Busca em nome do Klub. */
  q?: string;
  page?: number;
  limit?: number;
}

export interface PendingKlubItem {
  id: string;
  name: string;
  slug: string;
  type: string;
  entityType: 'pj' | 'pf' | null;
  documentHint: string | null;
  legalName: string | null;
  city: string | null;
  state: string | null;
  cnpjStatus: string | null;
  reviewStatus: KlubReviewStatus;
  createdAt: string;
  createdBy: {
    id: string;
    fullName: string;
    email: string;
    documentNumber: string | null;
  } | null;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Lista paginada de cadastros pra revisão pelo SUPER_ADMIN. Tabs separam
 * PJ × PF. Filtra por nome (case-insensitive) e por status (pending por
 * default; UI tem aba "Histórico" que mostra approved/rejected).
 */
@Injectable()
export class ListPendingKlubsHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: ListPendingKlubsCommand): Promise<{
    items: PendingKlubItem[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const limit = Math.min(cmd.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const page = Math.max(1, cmd.page ?? 1);
    const skip = (page - 1) * limit;
    const status: KlubReviewStatus = cmd.status ?? 'pending';

    const where: Record<string, unknown> = {
      review: { is: { reviewStatus: status } },
      deletedAt: null,
    };
    if (cmd.type) where.legal = { is: { entityType: cmd.type } };
    if (cmd.q && cmd.q.trim().length >= 2) {
      where.name = { contains: cmd.q.trim(), mode: 'insensitive' };
    }

    const [rows, total] = await Promise.all([
      this.prisma.klub.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          createdAt: true,
          createdById: true,
          contact: { select: { city: true, state: true } },
          legal: {
            select: {
              entityType: true,
              documentHint: true,
              legalName: true,
              cnpjStatus: true,
            },
          },
          review: { select: { reviewStatus: true } },
        },
      }),
      this.prisma.klub.count({ where }),
    ]);

    const creatorIds = rows.map((r) => r.createdById).filter((x): x is string => !!x);
    const creators =
      creatorIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: creatorIds } },
            select: { id: true, fullName: true, email: true, documentNumber: true },
          })
        : [];
    const creatorById = new Map(creators.map((c) => [c.id, c]));

    return {
      items: rows.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        type: r.type,
        entityType: r.legal?.entityType ?? null,
        documentHint: r.legal?.documentHint ?? null,
        legalName: r.legal?.legalName ?? null,
        city: r.contact?.city ?? null,
        state: r.contact?.state ?? null,
        cnpjStatus: r.legal?.cnpjStatus ?? null,
        reviewStatus: r.review?.reviewStatus ?? status,
        createdAt: r.createdAt.toISOString(),
        createdBy: r.createdById
          ? (() => {
              const c = creatorById.get(r.createdById);
              return c
                ? {
                    id: c.id,
                    fullName: c.fullName,
                    email: c.email,
                    documentNumber: c.documentNumber,
                  }
                : null;
            })()
          : null,
      })),
      total,
      page,
      pageSize: limit,
    };
  }
}
