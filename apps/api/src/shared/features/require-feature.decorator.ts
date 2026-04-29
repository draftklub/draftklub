import { SetMetadata } from '@nestjs/common';

export const REQUIRE_FEATURE_KEY = 'require_feature';

/** Marca um endpoint como protegido por um feature gate. */
export const RequireFeature = (featureId: string) => SetMetadata(REQUIRE_FEATURE_KEY, featureId);
