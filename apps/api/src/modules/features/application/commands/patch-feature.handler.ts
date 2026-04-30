import { Injectable, NotFoundException } from '@nestjs/common';
import { FeatureRepository } from '../../infrastructure/repositories/feature.prisma.repository';
import type { FeatureAuditEntry } from '../../infrastructure/repositories/feature.prisma.repository';
import type { Feature } from '@prisma/client';

const ALLOWED_TIERS = ['free', 'premium', 'disabled'] as const;
type AllowedTier = (typeof ALLOWED_TIERS)[number];

export interface PatchFeatureCommand {
  id: string;
  changedBy: string;
  tier?: string;
  enabled?: boolean;
}

@Injectable()
export class PatchFeatureHandler {
  constructor(private readonly repo: FeatureRepository) {}

  async execute(cmd: PatchFeatureCommand): Promise<Feature> {
    const existing = await this.repo.findById(cmd.id);
    if (!existing) throw new NotFoundException(`Feature '${cmd.id}' not found`);

    const data: Partial<Pick<Feature, 'tier' | 'enabled'>> = {};
    const audits: FeatureAuditEntry[] = [];

    if (cmd.tier !== undefined && cmd.tier !== existing.tier) {
      if (!ALLOWED_TIERS.includes(cmd.tier as AllowedTier)) {
        throw new Error(`Invalid tier '${cmd.tier}'`);
      }
      data.tier = cmd.tier as AllowedTier;
      audits.push({
        featureId: cmd.id,
        changedBy: cmd.changedBy,
        field: 'tier',
        oldValue: existing.tier,
        newValue: cmd.tier,
      });
    }

    if (cmd.enabled !== undefined && cmd.enabled !== existing.enabled) {
      data.enabled = cmd.enabled;
      audits.push({
        featureId: cmd.id,
        changedBy: cmd.changedBy,
        field: 'enabled',
        oldValue: String(existing.enabled),
        newValue: String(cmd.enabled),
      });
    }

    if (Object.keys(data).length === 0) return existing;

    return this.repo.patch(cmd.id, data, audits);
  }
}
