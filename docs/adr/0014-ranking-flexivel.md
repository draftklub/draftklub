# ADR 0014 — Ranking Flexível (flags + ordenação + janela)

**Status:** Accepted
**Data:** 2026-04-28

## Contexto

Diferentes Klubs querem rankings com regras diferentes:

- "Ranking ELO" só com partidas avulsas
- "Ranking de Torneio 2026" só com pontos de torneio
- "Ranking Combinado" com peso configurável
- "Ranking Últimas 12 Semanas" — janela móvel
- "Ranking Anual" — janela fixa por ano

E rating de habilidade (rating ELO) é conceitualmente diferente de
conquista (pontos por colocação em torneio). São campos separados.

## Decisão

`KlubSportRanking` ganha 3 grupos de configuração (todos ADD COLUMN
com defaults conservadores na migration 9D.1):

**Fontes (boolean flags):**

- `includesCasualMatches` (default true) — partidas avulsas (source='casual')
- `includesTournamentMatches` (default true) — partidas de torneio (source='tournament')
- `includesTournamentPoints` (default false) — pontos de torneio
  (Tournament.pointsApplied + pointsSchema)

**Ordenação:**

- `orderBy: 'rating' | 'tournament_points' | 'combined'` (default 'rating')
- `combinedWeight: { ratingWeight: number; pointsWeight: number }` (JSON)
  — usado quando orderBy='combined'

**Janela temporal:**

- `windowType: 'all_time' | 'season' | 'semester' | 'last_weeks' | 'last_tournaments'` (default 'all_time')
- `windowSize: int?` — pra last_weeks: número de semanas
- `windowStartDate: timestamptz?` — pra season/semester: início da janela

`PlayerRankingEntry` ganha:

- `tournamentPoints: int @default(0)` — separado de rating
- `lastTournamentAppliedAt: timestamptz?` — controle de aplicação

### Recomputação

`RankingRecomputeService.recompute(rankingId)`:

1. Lê o ranking
2. Constrói filtro de fontes (`source` em ['casual', 'tournament', ...])
3. Constrói filtro temporal (`playedAt >= dateFilter`) baseado em windowType
4. Busca todos os MatchResult `status='confirmed'` `isWalkover=false` que casam
5. Reconstrói rating do zero acumulando deltas via RatingCalculatorService
6. Se `includesTournamentPoints=true`: busca Tournament `pointsApplied=true`
   no mesmo ranking e soma points dos schemas pelas finalPosition de cada entry
7. `deleteMany` entries antigas + `create` novas — operação atômica em
   transação

### Trigger de recompute

- Síncrono via `PATCH /rankings/:id` quando matchCount < 1000 (limite arbitrário)
- Async via Pub/Sub para rankings grandes — TODO no MVP, retorna `recomputeStatus: 'queued'`
- Cloud Scheduler chama endpoint interno noturno (3am UTC) que recomputa
  todos os rankings com `windowType != 'all_time'`

### Aplicação de pontos

Quando `tournament.status` vira `'finished'` (em `TournamentProgressionService.advance()`),
chama `ApplyTournamentPointsService.apply()`:

- Verifica `tournament.pointsApplied` (idempotência)
- Lê `tournament.ranking` — se `includesTournamentPoints=false`, marca aplicado
  com 0 pontos (evita retentativas)
- Para cada entry com `finalPosition != null`, soma `pointsSchema[finalPosition]`
  em `PlayerRankingEntry.tournamentPoints` via upsert
- Marca `tournament.pointsApplied=true`, `pointsAppliedAt=now`

## Consequências

- Comissão configura ranking via `PATCH /rankings/:id` — recomputa se mudou flag
- Job noturno mantém rankings temporais sincronizados
- Rating (habilidade) e tournamentPoints (conquista) ficam separados — nunca
  somam num só campo, só em ordenação combined com pesos explícitos
- `MatchResult.source` é a chave para filtrar fontes ao recomputar
