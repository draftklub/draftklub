# ADR 0006 — Strategy Pattern por esporte

**Status:** Accepted
**Data:** 2026-04-21

## Contexto

Quatro esportes suportados (tênis, squash, padel, beach tênis) têm regras distintas: pontuação, formato de jogo (single vs dupla), rating/ranking. Espalhar `if (sport === 'tennis')` pelo código é insustentável.

## Decisão

Lib pura `packages/sport-strategies` com interface `SportStrategy`:

```typescript
interface SportStrategy {
  readonly code: 'tennis' | 'squash' | 'padel' | 'beach_tennis';
  validateMatchResult(result: MatchResult): ValidationResult;
  computeRatingDelta(match: Match): RatingDelta[];
  supportedTournamentFormats(): TournamentFormat[];
}
```

Implementações: `TennisStrategy` (referência, foco primário), `SquashStrategy`, `PadelStrategy`, `BeachTennisStrategy`.

Módulos de `competition`, `rating`, `ranking` consultam a estratégia correta via factory, sem conhecer detalhes do esporte.

## Consequências

- Adicionar esporte novo = nova strategy + registry update, sem tocar em casos de uso.
- Regras específicas (ex: padel exige duplas, squash tem PAR scoring) ficam encapsuladas.
- Tests por esporte ficam naturalmente isolados.
