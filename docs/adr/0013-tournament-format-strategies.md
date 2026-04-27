# ADR 0013 — Strategy Pattern para Formatos de Torneio

**Status:** Accepted
**Data:** 2026-04-28

## Contexto

Dia 9B implementou apenas knockout. Dia 9D adiciona round-robin,
groups+knockout e double elimination. Sem strategy pattern, o
`DrawTournamentHandler` ficaria com switches gigantes espalhados
entre validação, geração de matches e progressão.

## Decisão

Interface `TournamentFormatStrategy` em
`apps/api/src/modules/competition/domain/services/strategies/tournament-format.strategy.ts`:

```typescript
interface TournamentFormatStrategy {
  readonly format: string;
  validate(context: DrawContext): ValidationResult;
  generateMatches(context: DrawContext): StrategyGeneratedMatch[];
  getInitialStatus(hasPrequalifiers: boolean): string;
  getInitialPhase(matches: StrategyGeneratedMatch[], hasPrequalifiers: boolean): string;
}
```

Implementations:

- **KnockoutStrategy** — single-elimination ATP-style, reutiliza `BracketGeneratorService`
- **RoundRobinStrategy** — todas as partidas entre todos os jogadores (circle method)
- **GroupsKnockoutStrategy** (9D.2) — fase de grupos + bracket de classificados
- **DoubleEliminationStrategy** (9D.2, simplificado) — winners + losers + grand final

### Responsabilidades

**Strategy:**

- Valida se a categoria tem condições para o formato (ex: round-robin exige 3+ jogadores)
- Gera todos os match records da categoria (sem persistência)
- Define status e fase iniciais do torneio

**DrawTournamentHandler:**

- Fetch tournament + entries + categories
- Computa ratings e seeds
- Executa prequalifier logic (9C) — filtra jogadores das fronteiras, cria pseudo-players TBD
- Chama `strategy.generateMatches()` com categorias "enriquecidas"
- Mapeia pseudo-players de volta para TBD slot info
- Persiste tudo em transação (matches de pré + main, linka nextMatchId, propaga byes)

### Pseudo-players TBD

Quando `hasPrequalifiers=true`, o handler cria pseudo-players com
`userId = 'TBD-<categoryId>-<index>'` para representar slots que serão
preenchidos quando o pré terminar. A strategy trata esses como jogadores
normais (knockout os coloca no bracket; round-robin os pareia normalmente).
O handler mapeia de volta antes de persistir, convertendo pseudo-userIds
em `tbdPlayerXSource`/`tbdPlayerXPrequalifierMatchRef`/`tbdPlayerXLabel`.

## Consequências

- Adicionar formato novo = nova strategy, sem mexer no handler
- Cada strategy testa isoladamente (sem mocks de Prisma)
- Prequalifier logic fica no handler (layer comum a todos os formatos)
- Progressão de match (advance, walkover) continua no `TournamentProgressionService` —
  para o MVP, strategies não precisam sobrescrever progressão porque knockout/round-robin/groups
  compartilham mesma lógica (winner → next slot). Double elimination no 9D.2 pode precisar
  de hook específico para losers bracket.
