# ADR 0001 — Monolito modular como arquitetura inicial

**Status:** Accepted
**Data:** 2026-04-21
**Deciders:** Bouhid

## Contexto

DraftKlub é um SaaS em fase inicial, construído por uma pessoa trabalhando em tempo parcial, com rigor de produção desde o dia 1. Há 15 módulos identificados (identity, klub, sports, booking, groups, matchmaking, competition, ranking, rating, academy, stats, gamification, payment, billing, notification).

Microsserviços desde o início implicariam: múltiplas pipelines, observabilidade distribuída, sagas com compensação para operações transacionais (ex: reservar + cobrar), gestão de contratos de API entre serviços, e custo operacional multiplicado no GCP.

## Decisão

Adotamos **monolito modular** como arquitetura inicial. Um único aplicativo NestJS (`apps/api`) hospeda todos os módulos. Um segundo processo (`apps/worker`) compartilha a mesma base de código e roda consumers de Pub/Sub + crons.

Módulos são rigidamente isolados:

- Estrutura interna padronizada (`domain/`, `application/`, `infrastructure/`, `api/`, `public/`).
- Comunicação exclusiva via `public/*.facade.ts` (síncrona) ou eventos (`EventBus`).
- Imports cross-module bloqueados por `eslint-plugin-boundaries`.
- Schema separado no Postgres por módulo.

Extração de um módulo para serviço independente é reservada para quando medirmos necessidade: perfil de carga divergente, requisito regulatório (PCI para payment), ou escala comprovada.

## Consequências

**Positivas:**

- Menor complexidade operacional.
- Transações ACID disponíveis para operações multi-módulo.
- Deploy único, observabilidade simples.
- Refactor cross-módulo num único PR.

**Negativas:**

- Bug num módulo pode derrubar a aplicação inteira (mitigado com feature flags e circuit breakers internos).
- Escalonamento é em bloco — mitigado com o segundo processo worker.
- Disciplina de modularidade depende de ESLint + revisão.

**Candidatos prioritários à extração futura:**

1. `notification` (assíncrono, stateless)
2. `ranking`/`stats` (carga batch pesada)
3. `payment` (compliance PCI se aplicável)
