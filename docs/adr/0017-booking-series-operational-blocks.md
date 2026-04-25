# ADR 0017 — Booking Series + Bloqueios Operacionais

**Status:** Accepted
**Data:** 2026-04-30

## Contexto

Reservas recorrentes (aula semanal de tênis, horário fixo com o professor)
e bloqueios operacionais (manutenção de quadra, fechamento por chuva) são
necessidades reais do operador de Klub que o modelo básico do 10A não cobre.

## Decisão

### BookingSeries com bookings materializados

`BookingSeries` é o **template** de recorrência. Ao criar, geramos **todos**
os bookings individuais concretos (não virtual). Motivos:
- Facilita queries de agenda (um booking é um booking, independente de origem)
- Permite cancelamento granular por ocorrência
- Permite alteração individual sem mexer na série
- Validação de conflitos se aplica em cada ocorrência igual a booking avulso

Limite `maxRecurrenceMonths` (default 3) configurável no `KlubConfig` evita
materializar centenas de bookings por série. Limite adicional de 100 ocorrências
codado no handler como safeguard.

### Atomicidade na criação

Antes de criar qualquer booking da série, validamos TODOS os conflitos
(space + players) de TODAS as ocorrências. Se qualquer um conflita, a série
inteira é rejeitada com HTTP 409 retornando a lista completa dos conflitos
(Comissão/Player ajusta o plano antes de tentar de novo).

### 3 modos de cancelamento

- **`this_only`**: cancela apenas aquela ocorrência. Série continua ativa.
- **`this_and_future`**: cancela a partir daquela ocorrência (inclusive) +
  ajusta `series.endsOn` para fim antecipado. Série continua ativa.
- **`all`**: cancela todos os bookings `pending`/`confirmed` da série +
  marca `series.status='cancelled'`.

### Bloqueios operacionais como Booking especial

`maintenance`, `weather_closed`, `staff_blocked` são `Booking` com tipo
especial. Reusa todo o modelo de conflito, visibility e UI de agenda.

- Só STAFF/KLUB_ADMIN/SUPER_ADMIN podem criar
- `weather_closed` pode ter `endsAt=null` (open-ended) até staff fechar
- `maintenance` e `staff_blocked` precisam `endsAt` definido na criação
- `weather_closed` **não** pode ser recorrente (situação pontual)
- `maintenance` e `staff_blocked` podem ser recorrentes

### Auto-cancelamento

Ao criar um bloqueio, sistema auto-cancela bookings de player que conflitam:
- `status='cancelled'`
- `cancellationReason='auto_cancelled:<type>:<blockId>'`
- `autoCancelledByBookingId=blockId` (FK self-ref para rastreabilidade)

**Não reativa automaticamente** quando bloqueio fecha — decisão consciente
para evitar surprender jogador que já achou outro horário. Wave 2 se
fizer sentido com feedback.

### Notificação real (push/email) é wave 2

Hoje: registro via `cancellationReason` + frontend/email externos polling.
Wave 2: módulo notifications com subscriber pattern.

## Consequências

- Séries aceitam weekly/biweekly/monthly com `interval` e `daysOfWeek`
- Edge case monthly day=31 em fev: handler normaliza para último dia do mês
- weather_closed open-ended permite fluxo real: abre quando chove, fecha quando sol volta
- Endpoint `PATCH /operational-blocks/:id/close` específico para weather
