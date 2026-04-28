'use client';

import * as React from 'react';
import type { Klub } from '@draftklub/shared-types';

/**
 * Sprint L PR-L3 — context compartilhado entre layout e tabs (sub-rotas)
 * de `/configurar`. Layout faz fetch de klub + me uma vez e provê via
 * context.
 */

export interface ConfigurarContextValue {
  klub: Klub;
  /** Refetch klub (após save de tab que muda dados). */
  onKlubUpdated: (updated: Klub) => void;
  isPlatform: boolean;
  /** KLUB_ADMIN/ASSISTANT do scope ou Platform-level. */
  isKlubAdmin: boolean;
  /** Apenas KLUB_ADMIN do scope ou Platform — pode transferir admin. */
  canTransferAdmin: boolean;
  /** Callback pra deactivate (rota da PerigosaTab). */
  onDeactivated: () => void;
}

const Ctx = React.createContext<ConfigurarContextValue | null>(null);

export function ConfigurarContextProvider({
  value,
  children,
}: {
  value: ConfigurarContextValue;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConfigurarContext(): ConfigurarContextValue {
  const ctx = React.useContext(Ctx);
  if (!ctx) {
    throw new Error('useConfigurarContext deve ser usado dentro de ConfigurarContextProvider');
  }
  return ctx;
}
