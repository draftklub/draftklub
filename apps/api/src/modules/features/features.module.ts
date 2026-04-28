import { Module } from '@nestjs/common';
import { FeatureRepository } from './infrastructure/repositories/feature.prisma.repository';
import { ListFeaturesHandler } from './application/queries/list-features.handler';
import { PatchFeatureHandler } from './application/commands/patch-feature.handler';
import { FeaturesController } from './api/features.controller';
import { FeaturesFacade } from './public/features.facade';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [IdentityModule],
  controllers: [FeaturesController],
  providers: [FeatureRepository, ListFeaturesHandler, PatchFeatureHandler, FeaturesFacade],
  exports: [FeaturesFacade],
})
export class FeaturesModule {}
