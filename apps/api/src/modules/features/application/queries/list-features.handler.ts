import { Injectable } from '@nestjs/common';
import { FeatureRepository } from '../../infrastructure/repositories/feature.prisma.repository';
import type { AuthenticatedUser } from '../../../../shared/auth/authenticated-user.interface';
import { isPlatformLevel } from '../../../../shared/auth/role-helpers';

export interface FeatureItem {
  id: string;
  tier: string;
  enabled: boolean;
  rolloutPct: number;
}

@Injectable()
export class ListFeaturesHandler {
  constructor(private readonly repo: FeatureRepository) {}

  async execute(user: AuthenticatedUser): Promise<FeatureItem[]> {
    const features = await this.repo.findAll();

    const isPlatform = user.roleAssignments.some((r) => isPlatformLevel(r.role));
    // TODO(billing): substituir quando modelo de assinatura individual existir.
    // Premium será true quando o user tiver um registro ativo de subscription
    // própria (tabela a ser criada). Pertencer a um Klub pago não torna o
    // player premium — o tier é uma assinatura individual do usuário.
    const isPremium = isPlatform;

    return features.map((f): FeatureItem => {
      const tierDisabled = f.tier === 'disabled';
      const tierMismatch = f.tier === 'premium' && !isPremium;
      const effectiveEnabled = f.enabled && !tierDisabled && !tierMismatch;

      return {
        id: f.id,
        tier: f.tier,
        enabled: effectiveEnabled,
        rolloutPct: f.rolloutPct,
      };
    });
  }
}
