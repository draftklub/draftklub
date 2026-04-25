# ADR 0016 — Módulo Booking

**Status:** Accepted
**Data:** 2026-04-29

## Contexto

Klubs brasileiros têm necessidades diversas de reserva de quadra:
- Públicos com reserva direta (member self-service)
- Públicos com aprovação por staff antes de confirmar
- Públicos onde só staff cadastra (clubes mais formais)
- Members-only com mesmas variações

Cada Klub configura seu modo, e configurações combinam (ex: aceitar tanto
direct quanto staff_approval em paralelo). Reserva pode vincular a partida
ranqueada (TournamentMatch) ou ser jogo livre. Conflitos de horário são
validados na criação.

## Decisão

Módulo `booking/` independente. Schema Postgres `booking` separado.

### Configuração granular em `KlubConfig`

Substitui `bookingPolicy` (string monolítica) por 4 dimensões independentes:

- **`accessMode`** ('public' | 'members_only') — quem pode tentar reservar
- **`bookingModes`** (JSONB array) — ['direct', 'staff_approval', 'staff_only']
  combinados em paralelo
- **`cancellationMode`** ('free' | 'with_deadline' | 'staff_only') —
  reusa `cancellationWindowHours` existente
- **`agendaVisibility`** ('public' | 'private') — quem vê a agenda do Klub

Campo `bookingPolicy` mantido temporariamente para retrocompat (backfill
popula `accessMode`); deprecated, removível em wave 2.

### Model `Booking`

Tipos discrimináveis (`bookingType`) para acomodar expansão futura:
- `player_match` / `player_free_play` (10A)
- `maintenance` / `weather_closed` / `staff_blocked` (10B)

Modo de criação (`creationMode`):
- `direct` — player cria e fica `confirmed`
- `staff_approval` — player cria, fica `pending`, staff aprova
- `staff_assisted` — staff cria diretamente como `confirmed`

Status: `pending` | `confirmed` | `cancelled` | `no_show` | `completed`.

`tournamentMatchId` UUID? @unique — preparado para 10D vincular bookings
gerados pelo schedule do torneio. Não populado em 10A.

### Conflitos validados na criação (409 Conflict)

- **Space conflict**: outro booking ativo no mesmo space e janela de tempo
- **Player conflict**: primaryPlayer ou alguém em otherPlayers já tem
  booking sobreposto

`ApproveBookingHandler` revalida conflitos no momento da aprovação (porque
outro booking pode ter sido criado entre creation e approval).

### Roles

`STAFF` é uma role nova adicionada ao PolicyEngine (não havia antes).
Operações:
- `booking.create` — PLAYER (member), STAFF, KLUB_ADMIN, SPORTS_COMMITTEE, SUPER_ADMIN
- `booking.approve` — STAFF, KLUB_ADMIN, SUPER_ADMIN
- `booking.cancel_others` — STAFF, KLUB_ADMIN, SUPER_ADMIN

Cancelar próprio booking não precisa de policy — handler valida participação
e `cancellationMode`.

## Consequências

- Reserva fica desacoplada de pagamento (billing module futuro)
- Endpoints calendar-friendly (`GET /spaces/:id/availability?date=`,
  `GET /klubs/:id/calendar?date=`) facilitam UI de calendário responsivo
- Tipo de booking é first-class — facilita expansão para maintenance/weather (10B)
- bookingPolicy granular permite Klubs com regras híbridas
- STAFF role é genérica (não-administrativa) e pode ser reutilizada por outros
  módulos no futuro
