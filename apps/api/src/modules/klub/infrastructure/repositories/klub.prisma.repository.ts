import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface CreateKlubData {
  name: string;
  slug: string;
  type: string;
  city?: string;
  state?: string;
  timezone: string;
  email?: string;
  phone?: string;
  entityType?: string;
  documentEncrypted?: string;
  documentIv?: string;
  documentHint?: string;
  legalName?: string;
  sportCodes: string[];
  parentKlubId?: string;
  isGroup: boolean;
  onboardingSource: string;
  createdById?: string;
  plan: string;
}

@Injectable()
export class KlubPrismaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateKlubData) {
    return this.prisma.$transaction(async (tx) => {
      const klub = await tx.klub.create({
        data: {
          name: data.name,
          slug: data.slug,
          type: data.type,
          city: data.city,
          state: data.state,
          timezone: data.timezone,
          email: data.email,
          phone: data.phone,
          entityType: data.entityType,
          documentEncrypted: data.documentEncrypted,
          documentIv: data.documentIv,
          documentHint: data.documentHint,
          legalName: data.legalName,
          parentKlubId: data.parentKlubId,
          isGroup: data.isGroup,
          onboardingSource: data.onboardingSource,
          createdById: data.createdById,
          plan: data.plan,
          status: data.plan === 'trial' ? 'trial' : 'active',
          trialEndsAt: data.plan === 'trial'
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            : null,
          config: {
            create: {},
          },
          sports: {
            createMany: {
              data: data.sportCodes.map((code) => ({ sportCode: code })),
              skipDuplicates: true,
            },
          },
        },
        include: {
          config: true,
          sports: true,
        },
      });

      return {
        id: klub.id,
        name: klub.name,
        slug: klub.slug,
        type: klub.type,
        plan: klub.plan,
        status: klub.status,
        city: klub.city,
        state: klub.state,
      };
    });
  }

  async findById(id: string) {
    return this.prisma.klub.findUnique({
      where: { id, deletedAt: null },
      include: { config: true, sports: true, media: true },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.klub.findUnique({
      where: { slug, deletedAt: null },
      include: { config: true, sports: true },
    });
  }

  async findAll(filters?: { status?: string; type?: string }) {
    return this.prisma.klub.findMany({
      where: {
        deletedAt: null,
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.type ? { type: filters.type } : {}),
      },
      include: { config: true, sports: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
