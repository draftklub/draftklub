'use client';

import * as React from 'react';
import type { User } from 'firebase/auth';
import type { MeResponse } from '@draftklub/shared-types';

/**
 * Sprint L PR-L4 — context compartilhado entre layout e sub-rotas
 * de `/perfil`. Layout faz fetch de me uma vez e provê via context.
 */

export interface ProfileContextValue {
  user: User;
  me: MeResponse;
  /** Atualiza me localmente após save de seção. */
  onMeUpdated: (next: MeResponse) => void;
}

const Ctx = React.createContext<ProfileContextValue | null>(null);

export function ProfileContextProvider({
  value,
  children,
}: {
  value: ProfileContextValue;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProfileContext(): ProfileContextValue {
  const ctx = React.useContext(Ctx);
  if (!ctx) {
    throw new Error('useProfileContext deve ser usado dentro de ProfileContextProvider');
  }
  return ctx;
}
