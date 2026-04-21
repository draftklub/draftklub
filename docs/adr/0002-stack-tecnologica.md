# ADR 0002 — Stack tecnológica (abril 2026)

**Status:** Accepted
**Data:** 2026-04-21

## Contexto

Necessidade de stack moderna, com LTS longo, ecossistema maduro no Brasil e bom suporte no GCP.

## Decisão

- **Runtime:** Node.js 24 LTS (suporte até abril 2028).
- **Linguagem:** TypeScript 5.9 com `strict` total.
- **Backend:** NestJS 11 (módulos, DI, guards, microservices prontos).
- **ORM:** Prisma 7 (rust-free, tipagem eficiente, migrações declarativas).
- **Web:** Next.js 16.2 (App Router, Build Adapters API estável).
- **Mobile:** Expo SDK 55 + React Native 0.83 (New Architecture obrigatória).
- **Banco:** Postgres 17 (maturidade + extensões pgvector, pg_cron, pg_trgm prontas).
- **Realtime:** Firestore Native (southamerica-east1).
- **Eventos:** Pub/Sub + outbox pattern.
- **Auth:** Firebase Auth.
- **Monorepo:** pnpm 10 + Turborepo 2.9.
- **Pagamento:** Asaas como primeira opção (adapter pattern permite trocar).

## Consequências

Stack consolidada e documentada. Upgrades futuros documentados em ADRs que substituem este.

- Postgres 18 → avaliar quando maduro e Cloud SQL com suporte pleno.
- Expo SDK 56 (Q2 2026, RN 0.85) → avaliar após release.
- Prisma Next (em desenvolvimento) → monitorar, migrar quando GA.
