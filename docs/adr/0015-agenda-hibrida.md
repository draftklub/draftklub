# ADR 0015 — Agenda Híbrida de Torneio

**Status:** Accepted
**Data:** 2026-04-28

## Contexto

Torneios de clubes têm restrições reais de agenda:

- Datas em que o clube tem disponibilidade exclusiva para o torneio
- Janelas de horário (clube abre/fecha)
- Quadras disponíveis (subset do total do clube)
- Tempo médio de partida + intervalo entre partidas
- Descanso mínimo do jogador entre partidas

Otimizar isso com OR-Tools / ILP resolveria perfeitamente, mas é overkill
para o MVP. Comissão é capaz de revisar manualmente quando precisa.

## Decisão

Agenda é **híbrida**: Comissão fornece o "container" via `Tournament.scheduleConfig`,
sistema aloca automaticamente cada partida em um slot livre via algoritmo guloso.

### Estrutura de `scheduleConfig`

```jsonc
{
  "availableDates": ["2026-05-10", "2026-05-11"], // YYYY-MM-DD
  "startHour": 8, // 0-23
  "endHour": 22, // 1-24
  "matchDurationMinutes": 90,
  "breakBetweenMatchesMinutes": 15,
  "spaceIds": ["uuid1", "uuid2"], // quadras
  "restRuleMinutes": 60, // descanso entre partidas do mesmo jogador
}
```

### Algoritmo guloso

1. Gera todos os slots: `availableDates × (startHour..endHour, step=duration+break) × spaceIds`
2. Ordena partidas por `round asc, bracketPosition asc` (rodada inicial primeiro)
3. Pula partidas sem ambos os jogadores (TBD/bye/walkover)
4. Para cada partida, varre slots em ordem cronológica e aloca no primeiro onde:
   - Quadra está livre nesse instante
   - Ambos jogadores estão livres (não jogam outra partida no mesmo instante em qualquer quadra)
   - Cada jogador respeita `restRuleMinutes` desde sua última partida agendada
5. Marca `scheduleWarning` se o slot cai fora de `KlubConfig.openingHour/closingHour`
6. Persiste `scheduledFor`, `spaceId`, `scheduleWarning` em transação
7. Retorna lista de partidas agendadas e não-agendadas (com motivo)

### Idempotência

Re-rodar `POST /schedule` só (re)agenda partidas com `scheduledFor=null`.
Para forçar re-agendamento, primeiro limpar manualmente (não há endpoint
de "clear schedule" no MVP — Comissão pode editar via SQL ou wave 2).

### Trade-offs

- **Guloso é subótimo**: pode acontecer de não conseguir alocar uma partida
  porque slots foram tomados gulosamente, embora exista uma combinação alternativa.
  Para torneios com 30+ partidas e múltiplas quadras, o algoritmo deveria achar
  solução. Para casos extremos, Comissão revisa manualmente.
- **Sem otimização de "preferência"** (ex: agendar finais à noite, RR no
  fim de semana). Wave 2.
- **Sem agendamento entre torneios** — só dentro de um torneio. Conflitos
  inter-torneios (jogador inscrito em 2) ficam para wave 2.

## Consequências

- Endpoint único `POST /tournaments/:id/schedule` (Comissão)
- `KlubConfig` consultado para warnings, não para bloqueios
- Algoritmo testável sem Prisma (split entre `generateSlots` puro e `distribute` Prisma-dependent)
