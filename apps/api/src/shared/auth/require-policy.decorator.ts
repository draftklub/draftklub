import { SetMetadata } from '@nestjs/common';
import type { ResourceContext } from './resource-context.interface';

export const POLICY_KEY = 'policy';

export interface PolicyMetadata {
  action: string;
  extractContext?: (request: unknown) => ResourceContext;
}

export const RequirePolicy = (
  action: string,
  extractContext?: (request: unknown) => ResourceContext,
) => SetMetadata<string, PolicyMetadata>(POLICY_KEY, { action, extractContext });
