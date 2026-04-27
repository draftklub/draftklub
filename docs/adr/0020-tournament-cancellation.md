# ADR 0020 — Tournament Cancellation with Booking Cascade

**Status:** Accepted
**Data:** 2026-04-30

## Contexto

Hoje torneio fica em status genérico, sem operação explícita de cancelamento.
Quem cria um torneio em produção não consegue cancelar via API. ADR 0019
documentou a cascata `tournament cancel → bookings tournament_match` como
TODO porque o handler não existia.

## Decisão

`CancelTournamentHandler` novo:

- Verifica que tournament está em status cancelável
  (`draft`, `prequalifying`, `in_progress`)
- Atomic em transação:
  - `tournament.status = 'cancelled'`
  - `tournament.cancelledAt = now`
  - `tournament.cancelledById = user`
  - `tournament.cancellationReason = reason ?? 'Cancelled by committee'`
  - Cancela bookings vinculados (`tournamentMatchId IN tournament.matches`)
    com status `pending`/`confirmed` → `status='cancelled'`,
    `cancellationReason='tournament_cancelled:<tournamentId>'`

Permission via `tournament.manage`: KLUB_ADMIN, SPORTS_COMMITTEE da
modalidade, SUPER_ADMIN.

Tournament `finished`: SEM cascade. Bookings já passaram, ficam como estão.
A cascade só faz sentido para limpar bookings futuros que não vão mais
acontecer.

## Consequências

- Schema ganha 3 campos em `Tournament`: `cancelledAt`, `cancelledById`,
  `cancellationReason`. Migration aditiva.
- Endpoint `POST /tournaments/:id/cancel` consome reason opcional.
- Bookings `tournament_match` cancelados via cascade preservam histórico
  (status='cancelled' + cancellationReason apontando pro tournament).
