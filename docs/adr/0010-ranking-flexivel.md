# ADR 0010 — Modelo de ranking flexível por Klub e esporte

**Status:** Accepted
**Data:** 2026-04-25

## Contexto

Cada Klub pode ter múltiplos rankings por esporte (Open, Masculino, Feminino,
Duplas, Master 45+). Cada ranking pode usar um sistema de pontuação diferente.
Categorias de torneio não são fixas — são definidas na criação de cada torneio
e dividem os inscritos baseado no rating atual.

## Decisão

### Hierarquia de entidades

```
KlubSportProfile   → "tênis está ativo neste Klub"
  └── KlubSportRanking (N)  → "Ranking Open", "Ranking Masc"... (dia 8)
        └── PlayerRankingEntry (N) → rating de cada jogador neste ranking (dia 8)
        └── Tournament (N)         → torneio vinculado a um ranking (dia 9)
              └── TournamentCategory (N) → categorias definidas na criação (dia 9)
              └── TournamentEntry (N)    → inscrição com wild card support (dia 9)
```

### Ranking como entidade de primeira classe

Ranking não é uma view ou filtro — é uma entidade com identidade própria,
engine de rating próprio e conjunto de jogadores. Um Klub cria quantos
rankings quiser para cada esporte.

### Rating engine configurável por ranking

Cada ranking define seu engine independentemente:

- `elo`: ELO clássico com K-factor configurável
- `points`: pontos por posição final em torneios
- `win_loss`: W/L simples com decay por inatividade

Config fica em JSONB no KlubSportRanking, validada pelo engine.

### Entrada do jogador no ranking

Jogador novo no Klub não tem rating. Entra no ranking após participar
do primeiro torneio. Na inscrição, é alocado na categoria mais básica
automaticamente, mas a Comissão Esportiva pode mover ou conceder wild card
antes do sorteio.

### Wild card

Comissão pode inserir jogador em categoria acima do seu nível via wild card.
TournamentEntry tem campos `categorySource` ('auto'|'committee'|'wildcard')
e `isWildCard` boolean.

### Categorias de torneio

Categorias não são fixas do jogador. São criadas no torneio com nome livre
(A/B/C ou 1/2/3 ou Avançado/Intermediário) e tamanho definido pelo número
de inscritos dividido pelas categorias.

## Consequências

- Módulos competition, rating, matchmaking, academy referenciam
  KlubSportRanking, não apenas KlubSportProfile
- PlayerRankingEntry criado na conclusão do primeiro torneio
- KlubSportProfile é a entidade mãe de todos os rankings do esporte no Klub
- Sazonalidade futura: campo seasonId nullable em KlubSportRanking
