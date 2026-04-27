# ADR 0012 — Pré-classificatórios com sorteio conjunto

**Status:** Accepted
**Data:** 2026-04-27

## Contexto

Torneios de tênis em clubes brasileiros costumam usar pré-classificatórios
para equilibrar categorias quando o rating não reflete perfeitamente o nível
atual dos jogadores. Entre duas categorias adjacentes (ex: A e B), os N
jogadores de borda competem em um mini-torneio antes do principal. Os
vencedores "sobem" para a categoria superior, os perdedores "descem".

## Decisão

### Estrutura

Pré-classificatórios reutilizam `TournamentMatch` com campo `matchKind`:

- `'main'` — partida do chaveamento principal
- `'prequalifier'` — partida de um pré-classificatório

Partidas de pré têm:

- `prequalifierFrontierUpper` e `prequalifierFrontierLower` — nomes das
  categorias envolvidas (ex: "A" e "B")
- `prequalifierPairIndex` — qual par dentro da fronteira (1-based)

### Slots TBD no principal

Chaveamento principal é gerado no mesmo sorteio. Categorias A e B (entre as
quais há pré-classificatório) têm slots "reservados":

- Slots reservados para os N últimos de A = `tbdPlayer*Source = 'prequalifier_winner'`
- Slots reservados para os N primeiros de B = `tbdPlayer*Source = 'prequalifier_loser'`

Cada slot TBD tem:

- `tbdPlayer1Source`: 'prequalifier_winner' | 'prequalifier_loser' | null
- `tbdPlayer1PrequalifierMatchRef`: ID da match de pré que vai resolver o slot
- `tbdPlayer1Label`: string human-readable ("Vencedor Pré A/B #1")

### Sorteio único

Quando Comissão dispara `POST /tournaments/:id/draw`, sistema gera **ambos**:

1. Chaveamento dos pré-classificatórios (jogadores reais nas fronteiras)
2. Chaveamento principal (com slots TBD onde aplicável)

### Número de rodadas do pré

**Sempre 1 rodada de N partidas paralelas.** Não há semifinal/final dentro do pré.
Com `bordersPerFrontier=N`, o pré tem N partidas entre cat superior (últimos N) e
cat inferior (primeiros N). Vencedor sobe, perdedor desce.

### Propagação de resultados

Quando partida de pré é confirmada:

- Vencedor preenche o slot no principal onde `tbdPlayerXPrequalifierMatchRef` bate com o match id
- Perdedor preenche o outro slot correspondente

Rating do pré **não é aplicado no ranking** — pré é parte do torneio. Match result
é criado com `source='tournament_prequalifier'` e rating=0.

### Validações

Se `hasPrequalifiers=true`:

- `prequalifierBordersPerFrontier` deve ser >= 1
- Número de categorias >= 2
- Cada categoria deve ter pelo menos `bordersPerFrontier` jogadores nas
  bordas relevantes (validação no momento do draw)

## Consequências

- Sorteio atômico (pré + principal) garante consistência
- Slots TBD são first-class no bracket (UI pode renderizar "Vencedor Pré A/B")
- Rating do pré não contamina o ranking
- GetBracket retorna labels legíveis
