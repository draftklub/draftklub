import { Injectable } from '@nestjs/common';
import { FeatureRepository } from '../infrastructure/repositories/feature.prisma.repository';
import type { AuthenticatedUser } from '../../../shared/auth/authenticated-user.interface';
import { isPlatformLevel } from '../../../shared/auth/role-helpers';

@Injectable()
export class FeaturesFacade {
  constructor(private readonly repo: FeatureRepository) {}

  /**
   * Verifica se uma feature está acessível para o usuário.
   * Usado pelo FeatureGuard para proteção server-side de endpoints.
   * Fail-closed: feature inexistente → false.
   *
   * TODO(cache-invalidation): quando Redis for adicionado ao stack,
   * adicionar um `cache_buster` por feature_id (INCR após cada PATCH)
   * e usar como parte do queryKey no cliente. Por ora, o `useFeature`
   * hook tem TTL local de 5 min e o `invalidateFeaturesCache()` é
   * chamado explicitamente após PATCH no admin panel.
   */
  async isEnabled(featureId: string, user: AuthenticatedUser): Promise<boolean> {
    const feature = await this.repo.findById(featureId);
    if (!feature) return false;
    if (!feature.enabled) return false;
    if (feature.tier === 'disabled') return false;
    if (feature.tier === 'free') return true;

    const isPlatform = user.roleAssignments.some((r) => isPlatformLevel(r.role));
    if (isPlatform) return true;

    // TODO(billing): substituir quando modelo de assinatura individual existir.
    // Por ora, nenhum player tem tier premium — todos os não-platform são free.
    return false;
  }
}
