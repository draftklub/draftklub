import { Injectable, NotFoundException } from '@nestjs/common';
import type { KlubReviewStatus } from '@draftklub/shared-types';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface PendingKlubDetail {
  id: string;
  name: string;
  slug: string;
  type: string;
  entityType: 'pj' | 'pf' | null;
  documentHint: string | null;
  legalName: string | null;
  cnpjStatus: string | null;
  cnpjStatusCheckedAt: string | null;
  cnpjLookupData: Record<string, unknown> | null;
  cep: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressNeighborhood: string | null;
  city: string | null;
  state: string | null;
  addressSource: string | null;
  discoverable: boolean;
  accessMode: string;
  sports: string[];
  reviewStatus: KlubReviewStatus;
  reviewRejectionReason: string | null;
  reviewDecisionAt: string | null;
  reviewDecidedById: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    fullName: string;
    email: string;
    documentNumber: string | null;
    phone: string | null;
  } | null;
  /** Conflito de slug: se outro Klub não-deletado tem o mesmo slug. */
  slugConflictKlubName: string | null;
}

/**
 * Carrega tudo que o admin precisa pra decidir aprovação/rejeição:
 * dados do Klub + criador + raw da Receita + check de duplicidade de slug.
 */
@Injectable()
export class GetPendingKlubHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string): Promise<PendingKlubDetail> {
    const klub = await this.prisma.klub.findUnique({
      where: { id },
      include: { sportProfiles: { where: { status: 'active' } }, legal: true, review: true },
    });
    if (!klub || klub.deletedAt) {
      throw new NotFoundException(`Klub ${id} não encontrado`);
    }

    const creator = klub.createdById
      ? await this.prisma.user.findUnique({
          where: { id: klub.createdById },
          select: {
            id: true,
            fullName: true,
            email: true,
            documentNumber: true,
            phone: true,
          },
        })
      : null;

    // Slug conflict check — outro Klub não-deletado e não-este com mesmo slug.
    const conflict = await this.prisma.klub.findFirst({
      where: {
        slug: klub.slug,
        deletedAt: null,
        id: { not: klub.id },
      },
      select: { name: true },
    });

    return {
      id: klub.id,
      name: klub.name,
      slug: klub.slug,
      type: klub.type,
      entityType: klub.legal?.entityType ?? null,
      documentHint: klub.legal?.documentHint ?? null,
      legalName: klub.legal?.legalName ?? null,
      cnpjStatus: klub.legal?.cnpjStatus ?? null,
      cnpjStatusCheckedAt: klub.legal?.cnpjStatusCheckedAt?.toISOString() ?? null,
      cnpjLookupData: (klub.legal?.cnpjLookupData as Record<string, unknown> | null) ?? null,
      cep: klub.cep,
      addressStreet: klub.addressStreet,
      addressNumber: klub.addressNumber,
      addressComplement: klub.addressComplement,
      addressNeighborhood: klub.addressNeighborhood,
      city: klub.city,
      state: klub.state,
      addressSource: klub.addressSource,
      discoverable: klub.discoverable,
      accessMode: klub.accessMode,
      sports: klub.sportProfiles.map((s) => s.sportCode),
      reviewStatus: klub.review?.reviewStatus ?? 'pending',
      reviewRejectionReason: klub.review?.reviewRejectionReason ?? null,
      reviewDecisionAt: klub.review?.reviewDecisionAt?.toISOString() ?? null,
      reviewDecidedById: klub.review?.reviewDecidedById ?? null,
      createdAt: klub.createdAt.toISOString(),
      createdBy: creator,
      slugConflictKlubName: conflict?.name ?? null,
    };
  }
}
