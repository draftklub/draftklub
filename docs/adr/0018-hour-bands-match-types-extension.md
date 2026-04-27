# ADR 0018 — Hour Bands, Match Types, Booking Extension

**Status:** Accepted
**Data:** 2026-04-30

## Contexto

Clubes brasileiros têm regras de horário diferenciadas:

- Horário nobre (prime time, 17h-22h): só sócios, partidas mais curtas
- Horário regular: convidados permitidos
- Off-peak: descontos, mais flexível

E distinguem partida singles (30-60min) de doubles (60-90min) na alocação.

Players às vezes querem estender o tempo de quadra ao final da reserva, se
não há outro jogador esperando. Cada Klub configura se permite e quem pode.

## Decisão

### Hour bands no Space

Cada Space define até 3 bandas (`off_peak`, `regular`, `prime`). Granularidade
configurável (`slotGranularityMinutes` 15-180 múltiplo de 15). Cada banda:

- `type`, `startHour`, `endHour`, `daysOfWeek`
- `durationByMatchType`: `{ singles, doubles }`

Bandas são exclusivas (não se sobrepõem). Quando jogador escolhe horário,
sistema identifica a banda e calcula `endsAt` automaticamente.

### Convidados

Bandas `prime` SEMPRE bloqueiam convidados (`otherPlayers.length > 0`).
Off-peak e regular SEMPRE permitem. Não tem flag configurável — é regra
implícita do tipo da banda. Decisão simplifica configuração e reflete uso
real.

### Match types

Space define `allowedMatchTypes: ['singles', 'doubles']`. Cada banda define
duração por tipo. Player escolhe `matchType` na criação; sistema valida e
calcula duração. SEM `allowedBookingDurations` — duração vem 100% da banda.

### Extensão

4 modos no `KlubConfig.extensionMode`:

- `disabled`: extensão indisponível, player cria nova reserva normal
- `player`: player solicita E auto-aprova, mas só a partir de `endsAt`
- `staff_approval`: player solicita, fica `pending`, staff decide
- `staff_only`: player não solicita, só staff cria

Modo `player`:

- Player só pode solicitar a partir de `endsAt`
- First come first served (sem prioridade pra player ativo)
- Sistema verifica disponibilidade do próximo slot
- Encadeamento sem limite (cada extensão é operação independente)

Quando extensão cruza fronteira de banda (regular → prime), aplica regras
da nova banda (incluindo bloqueio de guests em prime). Se não pode, rejeita.

Incremento sempre múltiplo de `slotGranularityMinutes`.

## Consequências

- DTO de criação de booking exige `matchType`
- Sistema calcula `endsAt` — player não escolhe duração
- Convidados precisam saber em qual banda jogarão (prime bloqueia)
- Players com modo `player` precisam ser rápidos pra estender (FCFS)
- Extensões ficam em JSONB array (histórico) + `endsAt` do booking atualizado
- Bookings 10A/10B sem `matchType` continuam válidos (campo nullable);
  endpoints futuros que dependem de `matchType` devem tolerar `null`.
