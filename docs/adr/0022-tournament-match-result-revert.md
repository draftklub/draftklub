# ADR 0022 — Tournament Match Result Revert

**Status:** Accepted
**Data:** 2026-04-30

## Contexto

Comissão reporta resultado errado de uma partida de torneio. Hoje não há
como desfazer:

- Rating delta já foi aplicado em `PlayerRankingEntry`
- `winnerId` ficou registrado em `TournamentMatch`
- Match seguinte (`nextMatch`) recebeu o player vencedor no slot
  correspondente
- Cancelar tournament inteiro é destrutivo demais

Precisamos de uma operação atômica que desfaça o resultado de um match
específico, com snapshot pra auditoria.

## Decisão

`TournamentMatchRevert`: tabela de auditoria. Cada revert grava
`previousState` (JSONB) com snapshot completo: winner, matchResultId,
rating deltas, próximo match afetado.

### Fluxo

1. Comissão chama `GET /tournament-matches/:matchId/revert/preview`:
   - Lista matches afetados (este + next se aplicável)
   - Lista rating deltas que seriam desfeitos
   - Retorna `warning` se cascade detectada além de 1 nível
   - Não muda nada (read-only)
2. Comissão confirma com `POST /tournament-matches/:matchId/revert`:
   - Atomic em `$transaction`:
     a. Cria `TournamentMatchRevert` com snapshot
     b. Reverte rating: incrementa rating dos players com delta inverso
     c. `TournamentMatch` volta a `status='scheduled'`,
     `winnerId=null`, `matchResultId=null`, `completedAt=null`
     d. `MatchResult` vinculado: `status='reverted'` (preserva histórico)
     e. Cascade no `nextMatch`: limpa slot ocupado pelo winner.
     Se `nextMatch.status='completed'`, também volta a `scheduled`
     (limpa winnerId/matchResultId/completedAt) — **1 nível só**.

### Permission

Resolvida via `tournament.manage`: SUPER_ADMIN, KLUB_ADMIN do Klub,
SPORTS_COMMITTEE da modalidade.

### Limitação MVP — cascade de 1 nível

Se o match seguinte já gerou avanço pra próxima fase (semifinal já jogada),
o handler reverte só o match-imediatamente-seguinte. Quem precisa reverter
matches mais profundos faz em ordem reversa manualmente. O endpoint de
preview retorna `warning='cascade_depth_exceeded_1_level'` se detectar
profundidade maior, pra UI alertar.

Sem prazo limite — comissão pode reverter a qualquer momento. A fonte da
verdade pra histórico é a tabela `tournament_match_reverts`.

## Consequências

- Rating recompute completo (re-corre todos os matches da ranking) **NÃO** é
  feito automaticamente. Se a comissão quiser sequência mais cuidadosa
  pra rating, deve usar revert + relógio + report novo manualmente.
- `MatchResult.status='reverted'` é estado novo — código que filtra por
  status precisa lidar (já filtra por `'confirmed'` para inclusão em
  rankings).
- Sem desfazer points-applied: pontos de torneio aplicados continuam
  aplicados. Refaz manualmente se necessário.
