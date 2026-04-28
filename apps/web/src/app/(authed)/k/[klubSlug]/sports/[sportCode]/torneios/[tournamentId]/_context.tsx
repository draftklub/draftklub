'use client';

import * as React from 'react';
import type { Klub, TournamentDetail } from '@draftklub/shared-types';

/**
 * Sprint L PR-L2 — context compartilhado entre layout e páginas
 * filhas (page.tsx, chave/page.tsx, inscritos/page.tsx,
 * operacoes/page.tsx). Layout faz o fetch de tournament + me + klub
 * uma vez e provê via context — sub-rotas não refazem fetch.
 */

export interface TournamentContextValue {
  klub: Klub;
  tournament: TournamentDetail;
  /** Force-reload o tournament + bracket + entries no layout. */
  reload: () => void;
  meId: string | null;
  canManage: boolean;
}

const Ctx = React.createContext<TournamentContextValue | null>(null);

export function TournamentContextProvider({
  value,
  children,
}: {
  value: TournamentContextValue;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTournamentContext(): TournamentContextValue {
  const ctx = React.useContext(Ctx);
  if (!ctx) {
    throw new Error('useTournamentContext deve ser usado dentro de TournamentContextProvider');
  }
  return ctx;
}
