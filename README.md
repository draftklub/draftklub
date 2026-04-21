# DraftKlub

SaaS para clubes brasileiros de racket sports (tênis, squash, padel, beach tênis).

## Stack

- **Backend:** NestJS 11 + Prisma 7 + Postgres 17 + Firestore + Pub/Sub
- **Web:** Next.js 16 + React 19 + TailwindCSS 4 + shadcn/ui
- **Mobile:** Expo SDK 55 + React Native 0.83
- **Infra:** Cloud Run + Cloud SQL + Firestore (GCP `southamerica-east1`)
- **Monorepo:** pnpm 10 + Turborepo 2.9
- **Node:** 24 LTS

## Desenvolvimento

### Pré-requisitos

- Node 24 (`nvm use` se tiver nvm)
- pnpm 10.6.5+ (`corepack enable && corepack prepare pnpm@10.6.5 --activate`)
- gcloud CLI autenticado (para infra)

### Setup

```bash
pnpm install
pnpm turbo run typecheck  # valida tudo
```

### Comandos

- `pnpm dev` — sobe todos os apps em modo dev
- `pnpm build` — builda todos os apps
- `pnpm test` — roda testes (unit + integration)
- `pnpm test:e2e` — roda E2E
- `pnpm lint` — lint de tudo
- `pnpm typecheck` — typecheck de tudo
- `pnpm format` — Prettier em tudo

## Estrutura

Ver [`docs/adr/`](./docs/adr) para decisões arquiteturais documentadas.

```
apps/        # api, worker, web, mobile
packages/    # libs compartilhadas
infra/       # Terraform e pipelines
docs/        # ADRs e documentação
```

## Licença

UNLICENSED — privado.
