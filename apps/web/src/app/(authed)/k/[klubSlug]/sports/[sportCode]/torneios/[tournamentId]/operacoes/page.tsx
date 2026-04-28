'use client';

import { Banner } from '@/components/ui/banner';
import { useTournamentContext } from '../_context';
import { OperacoesView } from '../_components';

/**
 * Sprint L PR-L2 — admin operations (draw/schedule/edit/cancel).
 * Sub-rota dedicada com gate de permissão. Usuários não-admin que
 * acessam direto via URL veem mensagem de acesso restrito.
 */
export default function TournamentOperacoesPage() {
  const { klub, tournament, canManage, reload } = useTournamentContext();

  if (!canManage) {
    return (
      <Banner tone="warning" title="Acesso restrito">
        Apenas KLUB_ADMIN, KLUB_ASSISTANT, SPORT_COMMISSION ou Platform-level acessam operações.
      </Banner>
    );
  }

  return <OperacoesView tournament={tournament} klubId={klub.id} onChanged={reload} />;
}
