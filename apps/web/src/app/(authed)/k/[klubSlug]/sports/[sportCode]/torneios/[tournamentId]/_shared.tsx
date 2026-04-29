'use client';

/**
 * Sprint O batch O-6 — helpers compartilhados entre _bracket, _entries e
 * _operacoes. Extraídos pra eliminar duplicação dos 3 arquivos do megafile
 * split (O-3..O-5).
 */

import { useParams } from 'next/navigation';
import type { TournamentDetail } from '@draftklub/shared-types';
import { ApiError } from '@/lib/api/client';

export const inputCls =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20';

export function toErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

export function useSportCodeFromTournament(_tournament: TournamentDetail): string {
  const params = useParams<{ sportCode: string }>();
  return params.sportCode;
}
