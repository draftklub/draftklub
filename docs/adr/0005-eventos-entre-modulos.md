# ADR 0005 — Comunicação entre módulos via eventos + facades

**Status:** Accepted
**Data:** 2026-04-21

## Contexto

Módulos precisam cooperar sem acoplar. Exemplos: `booking` informa `payment` que reserva precisa ser cobrada; `competition` informa `ranking` que resultado foi confirmado; `gamification` e `stats` precisam observar praticamente tudo.

## Decisão

Duas formas de comunicação entre módulos:

1. **Facade síncrona** (`public/*.facade.ts`) — quando o chamador precisa de resposta imediata. Ex: `academy` consulta `IdentityFacade.getUserById()`.

2. **Evento assíncrono** (`EventBus`) — quando pode ser desacoplado. Ex: `booking` publica `ReservationConfirmed`, `notification` e `gamification` consomem.

`EventBus` é abstração com duas implementações:

- `InMemoryEventBus` em dev (síncrono, rápido).
- `PubSubEventBus` em prod (tópicos Pub/Sub, consumidos pelo `apps/worker`).

Eventos que dependem de transação usam **outbox pattern**: insere evento em tabela `outbox` dentro da transação; publisher separado lê e envia para Pub/Sub, marcando como enviado.

Regra inviolável: **nenhum módulo importa `domain`, `application` ou `infrastructure` de outro módulo** — só `public/`. ESLint bloqueia.

## Consequências

- Extração futura de módulo para serviço independente é troca de implementação do EventBus, sem mudanças de código de domínio.
- Eventos precisam ser versionados e bem nomeados (passado: `ReservationConfirmed`, não `ConfirmReservation`).
- Debug de fluxos assíncronos exige correlation ID e tracing distribuído — mandatório.
