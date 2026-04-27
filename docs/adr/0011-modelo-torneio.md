# ADR 0011 — Modelo de torneio com pré-classificatórios

**Status:** Accepted
**Data:** 2026-04-26

## Contexto

Torneios em clubes brasileiros têm características específicas não cobertas por
sistemas genéricos como Playtomic ou UTR:

1. Categorias criadas no momento do torneio (não fixas do jogador)
2. Divisão automática por rating, mas com ajuste manual pela Comissão
3. Wild card para jogadores promovidos acima do rating
4. Pré-classificatórios entre categorias adjacentes para equilibrar níveis
5. Pontuação configurável por torneio e categoria
6. Agenda vinculada às quadras disponíveis e horário do Klub
7. Múltiplos formatos: eliminatória simples, round-robin, dupla, grupos+mata

## Decisão

### Hierarquia de entidades

```
RankingPointsSchema    → catálogo reutilizável de pontuação (criado pela Comissão)
  └── referenciado por TournamentCategory

Tournament             → torneio com datas, formato, flags
  └── TournamentCategory (N)   → A, B, C... cada uma com pointsSchema
        └── TournamentEntry (N) → inscrição do jogador
        └── TournamentMatch (N) → partidas do chaveamento (dia 9B)
  └── TournamentPrequalifier (N) → pré-classificatórios (dia 9C)
```

### RankingPointsSchema

Catálogo de esquemas de pontuação por KlubSportProfile. Comissão cria quantos
quiser ("Padrão", "Master", "Open Anual"). Cada TournamentCategory referencia
obrigatoriamente um esquema.

Sem esquema cadastrado no KlubSportProfile, sistema bloqueia criação de torneio.

### Datas críticas do Tournament

```
registrationOpensAt       → inscrições abrem
registrationClosesAt      → inscrições fecham
drawDate                  → sorteio (após isso: sem retirada)
prequalifierStartDate     → pré começa (se hasPrequalifiers=true)
prequalifierEndDate       → pré termina
mainStartDate             → torneio principal começa
mainEndDate               → fim estimado
```

Validação: sequência cronológica obrigatória.

### TournamentEntry state machine

```
pending_approval     → Comissão aprova (só se registrationApproval=committee)
pending_seeding      → aguarda divisão de categorias
seeded               → categoria definida, sorteio rodou
playing              → torneio em andamento
eliminated           → perdeu ou terminou
champion / runner_up / semi / etc → posição final
withdrawn            → retirou antes do drawDate
disqualified         → desclassificado
```

### Wild card e movimentação

Campo `categorySource` na TournamentEntry:

- `auto` → alocado pelo rating
- `committee` → Comissão moveu manualmente
- `wildcard` → Comissão promoveu acima do rating

Flag `isWildCard: Boolean`.

### Aprovação de inscrição

Campo `registrationApproval` no Tournament:

- `auto` → inscrição direto pra pending_seeding
- `committee` → passa por pending_approval

### Fora do escopo do 9A

- Sorteio e chaveamento (dia 9B)
- Pré-classificatórios (dia 9C)
- Agenda/distribuição em quadras (dia 9D)
- Rankings temporais (dia 9D)
- Formatos além de knockout (dia 9D)

## Consequências

- Módulo competition agrupa RankingPointsSchema, Tournament, Match (futuro)
- Validação cruzada: não pode criar torneio sem esquema
- State machine de TournamentEntry com transições controladas
- Rating dos jogadores no momento da alocação define categoria inicial
