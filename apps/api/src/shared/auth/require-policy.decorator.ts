import { SetMetadata } from '@nestjs/common';
import type { ResourceContext } from './resource-context.interface';

export const POLICY_KEY = 'policy';

export type KlubIdResolver =
  | 'tournament:tournamentId'
  | 'ranking:id'
  | 'booking:bookingId'
  | 'tournament-match:matchId';

export interface PolicyMetadata {
  action: string;
  extractContext?: (request: unknown) => ResourceContext;
  resolveKlubIdFrom?: KlubIdResolver;
}

export interface PolicyOptions {
  extractContext?: (request: unknown) => ResourceContext;
  resolveKlubIdFrom?: KlubIdResolver;
}

export function RequirePolicy(
  action: string,
  optionsOrExtract?: ((request: unknown) => ResourceContext) | PolicyOptions,
) {
  const metadata: PolicyMetadata =
    typeof optionsOrExtract === 'function'
      ? { action, extractContext: optionsOrExtract }
      : { action, ...(optionsOrExtract ?? {}) };
  return SetMetadata<string, PolicyMetadata>(POLICY_KEY, metadata);
}
