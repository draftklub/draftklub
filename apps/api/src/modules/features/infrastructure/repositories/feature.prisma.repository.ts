import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import type { Feature } from '@prisma/client';

export type { Feature };

export interface FeatureAuditEntry {
  featureId: string;
  changedBy: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

@Injectable()
export class FeatureRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Feature[]> {
    return this.prisma.feature.findMany({ orderBy: { id: 'asc' } });
  }

  async findById(id: string): Promise<Feature | null> {
    return this.prisma.feature.findUnique({ where: { id } });
  }

  async patch(
    id: string,
    data: Partial<Pick<Feature, 'tier' | 'enabled'>>,
    auditEntries: FeatureAuditEntry[],
  ): Promise<Feature> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.feature.update({ where: { id }, data });
      if (auditEntries.length > 0) {
        await tx.featureAudit.createMany({
          data: auditEntries.map((e) => ({
            featureId: e.featureId,
            changedBy: e.changedBy,
            field: e.field,
            oldValue: e.oldValue,
            newValue: e.newValue,
          })),
        });
      }
      return updated;
    });
  }
}
