import { Module } from '@nestjs/common';
import { FeaturesModule } from '../../modules/features/features.module';
import { FeatureGuard } from './feature.guard';

/**
 * Módulo compartilhado que re-exporta FeatureGuard para uso em outros módulos.
 * Import este módulo em qualquer lugar que precise usar @RequireFeature.
 */
@Module({
  imports: [FeaturesModule],
  providers: [FeatureGuard],
  exports: [FeatureGuard],
})
export class FeaturesSharedModule {}
