# DraftKlub v2 — State Report do monorepo

> Snapshot em `main @ 4add4fa` (HEAD do W2.4 — Wave 2 fechada).
> Gerado para o handoff design → código do frontend (`apps/web`).

## 1. Estrutura raiz

```
/
├── apps/
│   ├── api/                  # NestJS API (implementada)
│   └── worker/               # NestJS worker (esqueleto, sem handlers de fato)
│   └── web/                  # ❌ NÃO EXISTE — diretório a criar
├── packages/
│   ├── eslint-config/        # ESLint configs compartilhados (base, nestjs, nextjs, react-native)
│   ├── tsconfig/             # TSConfig compartilhados (base, library, nestjs, nextjs, react-native)
│   ├── shared-types/         # Praticamente vazio (placeholder)
│   └── sport-strategies/     # Estratégias de rating (Elo, win/loss) + interface SportStrategy
├── infra/
│   └── terraform/            # Modules + envs (dev, staging, prod). NO domain mapping ainda.
├── docs/
│   ├── adr/                  # 22 ADRs (decisões de design)
│   └── briefings/            # 18 briefings (roadmap dia-a-dia)
├── .github/workflows/ci.yml  # GitHub Actions (lint+typecheck+test em PR/push)
├── cloudbuild.yaml           # Pipeline GCP (build → migrate → deploy Cloud Run)
├── turbo.json                # Turborepo
├── pnpm-workspace.yaml       # workspace pnpm
├── package.json              # root scripts via turbo
├── CLAUDE.md                 # diretrizes pro agente (frontend balance, domínios)
└── README.md                 # placeholder
```

Outras pastas root: `.editorconfig`, `.prettierrc.json`, `.nvmrc` (24), `.vscode/`.

---

## 2. apps/api

### Stack

- **Linguagem:** TypeScript 5.9
- **Framework:** NestJS 11
- **HTTP:** Fastify 5 (`@nestjs/platform-fastify`)
- **Runtime:** Node 24 (`.nvmrc=24`)
- **Package manager:** pnpm 10.6.5
- **ORM:** Prisma 7.6 + adapter `@prisma/adapter-pg` (driver native pg)
- **Validation:** Zod 3.24 com helper `uuidString()` (regex permissivo, aceita seed UUIDs além de RFC 4122)
- **Auth:** Firebase Admin SDK 13.8 (Identity Platform indireto via Firebase Auth)
- **Testing:** Vitest 2.1 (unitário) + Jest config para E2E (não usado ainda)
- **Logging/tracing:** Pino + OpenTelemetry (auto-instrumentations + OTLP gRPC exporter, _opt-in_ via `OTEL_ENABLED`)

### Organização (DDD-lite)

```
apps/api/src/
├── main.ts                   # bootstrap: prisma migrate deploy → Nest app → Fastify
├── app.module.ts             # registro de módulos
├── seed-dev.ts               # seed idempotente pra dev (rodado via Cloud Run job)
├── bootstrap/
│   ├── config/               # Zod schema do app config (DATABASE_URL, OTEL_*, etc)
│   ├── firebase/             # FirebaseModule global (init Admin SDK via ADC)
│   └── telemetry/            # OTel
├── shared/
│   ├── auth/                 # FirebaseAuthGuard, PolicyEngine, PolicyGuard, decorators
│   ├── encryption/           # AES-GCM helper (CPF/RG não usado; doc encryption deferred)
│   ├── filters/              # ZodExceptionFilter (mapeia Zod errors → 400)
│   ├── health/               # GET /health, /ready
│   ├── prisma/               # PrismaService (singleton)
│   └── validation/           # uuidString helper
└── modules/
    ├── identity/             # User, Membership, RoleAssignment
    ├── klub/                 # Klub, KlubConfig, KlubSportProfile, enrollments
    ├── space/                # Space (vazio por convenção; Booking dono dos handlers de space)
    ├── sports/               # SportCatalog (config-only), KlubSportProfile listing
    ├── ranking/              # KlubSportRanking, PlayerRankingEntry, MatchResult
    ├── competition/          # Tournament, TournamentEntry, TournamentMatch, TournamentMatchRevert
    └── booking/              # Booking, BookingSeries, hour bands, extensions, blocks
```

Padrão por módulo:

```
modules/<name>/
├── api/                      # controllers + DTOs (Zod schemas em api/dtos/)
│   ├── *.controller.ts
│   ├── dtos/
│   └── presenters/           # (booking só) — visibility-aware response shaping
├── application/
│   ├── commands/             # 1 handler = 1 command
│   └── queries/              # 1 handler = 1 query
├── domain/                   # entities, value objects, services puros (validação, geração)
│   └── services/
├── infrastructure/           # repositories Prisma
│   └── repositories/
├── public/                   # facade exportada → cross-module access via Module.exports
│   └── *.facade.ts
└── <name>.module.ts
```

### Schema do banco (24 models, 6 schemas Postgres)

**Schemas:** `identity`, `audit`, `klub`, `space`, `sports`, `booking`.

| Schema   | Model (table)                                      | Colunas-chave                                                                                                                                                                                                                                                                                                                                                              |
| -------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| audit    | `OutboxEvent` (outbox_events)                      | id, eventType, payload Json, status, occurredAt — pronta pra notifications, sem consumer ainda                                                                                                                                                                                                                                                                             |
| identity | `User` (users)                                     | id, firebaseUid? (nullable — guests), email (unique), fullName, phone?, kind (`regular`/`guest`), documentNumber?, documentType?, deletedAt                                                                                                                                                                                                                                |
| identity | `Membership` (memberships)                         | id, userId, klubId, status (`active`), type (`member`/`staff`/`guest`), unique(user, klub)                                                                                                                                                                                                                                                                                 |
| identity | `RoleAssignment` (role_assignments)                | id, userId, role, scopeKlubId?, scopeSportId?, grantedAt                                                                                                                                                                                                                                                                                                                   |
| klub     | `Klub` (klubs)                                     | id, name, slug, type, plan, status, parentKlubId?, isGroup, deletedAt                                                                                                                                                                                                                                                                                                      |
| klub     | `KlubConfig` (klub_configs)                        | klubId(unique), accessMode, bookingModes (Json), cancellationMode, agendaVisibility, openingHour, closingHour, openDays, maxRecurrenceMonths, extensionMode, guestsAddedBy, tournamentBookingConflictMode                                                                                                                                                                  |
| klub     | `KlubSportProfile` (klub_sport_profiles)           | id, klubId, sportCode, defaultRatingEngine, defaultInitialRating, status, unique(klub, sport)                                                                                                                                                                                                                                                                              |
| klub     | `KlubSportInterest` (klub_sport_interests)         | id, klubId, sportName                                                                                                                                                                                                                                                                                                                                                      |
| klub     | `KlubRequest` (klub_requests)                      | id, contactName, contactEmail, ... (form de "quero criar Klub")                                                                                                                                                                                                                                                                                                            |
| klub     | `KlubMedia` (klub_media)                           | id, klubId, kind, url                                                                                                                                                                                                                                                                                                                                                      |
| klub     | `PlayerSportEnrollment` (player_sport_enrollments) | id, userId, klubSportProfileId, status (`pending`/`active`/`suspended`/`cancelled`), approvedById?, approvedAt?, suspendedAt?, cancelledAt?, unique(user, profile)                                                                                                                                                                                                         |
| klub     | `KlubSportRanking` (klub_sport_rankings)           | id, klubSportId, name, type, ratingEngine, ratingConfig, includesCasualMatches, includesTournamentMatches, orderBy, windowType                                                                                                                                                                                                                                             |
| klub     | `PlayerRankingEntry` (player_ranking_entries)      | id, rankingId, userId, rating, ratingSource, wins/losses/draws                                                                                                                                                                                                                                                                                                             |
| klub     | `MatchResult` (match_results)                      | id, rankingId, player1/2Id, winnerId?, score?, status (`pending_confirmation`/`confirmed`/`reverted`), ratingDelta1/2, player1/2RatingBefore/After, source, tournamentMatchId?                                                                                                                                                                                             |
| klub     | `RankingPointsSchema` (ranking_points_schemas)     | id, klubSportId, name, points (Json) — schemas de pontos para torneios                                                                                                                                                                                                                                                                                                     |
| klub     | `Tournament` (tournaments)                         | id, klubSportId, rankingId, name, format, status (`draft`/`prequalifying`/`in_progress`/`finished`/`cancelled`), drawDate, scheduleConfig (Json), pointsApplied, cancelledAt?, cancelledById?, cancellationReason?                                                                                                                                                         |
| klub     | `TournamentCategory` (tournament_categories)       | id, tournamentId, name, order, maxPlayers?, min/maxRatingExpected?, pointsSchemaId                                                                                                                                                                                                                                                                                         |
| klub     | `TournamentEntry` (tournament_entries)             | id, tournamentId, categoryId, userId, status (`pending`/`approved`/`rejected`/`withdrawn`), seed?                                                                                                                                                                                                                                                                          |
| klub     | `TournamentMatch` (tournament_matches)             | id, tournamentId, categoryId, phase, round, bracketPosition (unique), player1/2Id?, winnerId?, matchResultId?, nextMatchId?, nextMatchSlot ('top'/'bottom'), status, matchKind (`main`/`prequalifier`/`group`), spaceId?, scheduledFor?                                                                                                                                    |
| klub     | `TournamentMatchRevert` (tournament_match_reverts) | id, tournamentMatchId, revertedById, revertedAt, reason?, previousState (JSONB snapshot)                                                                                                                                                                                                                                                                                   |
| sports   | `SportCatalog` (catalog)                           | code (PK), name, description                                                                                                                                                                                                                                                                                                                                               |
| sports   | `RatingEngine` (rating_engines)                    | code (PK), name                                                                                                                                                                                                                                                                                                                                                            |
| space    | `Space` (spaces)                                   | id, klubId, name, type, sportCode?, surface?, indoor, hasLighting, slotGranularityMinutes, slotDefaultDurationMinutes, hourBands (Json), allowedMatchTypes (Json), bookingActive                                                                                                                                                                                           |
| booking  | `Booking` (bookings)                               | id, klubId, spaceId, startsAt, endsAt?, bookingType (`player_match`/`player_free_play`/`maintenance`/`weather_closed`/`staff_blocked`/`tournament_match`), creationMode, status, primaryPlayerId?, otherPlayers (Json), matchType?, responsibleMemberId?, extensions (Json), tournamentMatchId? (unique), bookingSeriesId?, autoCancelledByBookingId?, cancellationReason? |
| booking  | `BookingSeries` (booking_series)                   | id, klubId, spaceId, frequency (`weekly`/`biweekly`/`monthly`), interval, daysOfWeek (Json), startsOn, endsOn, durationMinutes, startHour, startMinute, primaryPlayerId?                                                                                                                                                                                                   |

### Endpoints (72 endpoints em 33 controllers)

**Health (público):**

- `GET /health` — heartbeat
- `GET /ready` — DB readiness

**Identity:**

- `GET /me` — user atual + roleAssignments (auth required)

**Klubs:**

- `GET /klubs` — lista (policy `klub.list`)
- `GET /klubs/:id` — detalhe completo (config 15 campos via `mapKlubConfig`)
- `GET /klubs/slug/:slug`
- `POST /klubs` — cria Klub (auth)
- `POST /klubs/:id/members` — adiciona membership + RoleAssignment (atomic)
- `POST /klubs/:id/media` — anexa media
- `POST /klubs/:id/sport-interests` — interest em sport não-cadastrado

**Klub Requests (forms públicos de "quero criar Klub"):**

- `POST /klub-requests`
- `GET /klub-requests`

**Sports (catalog read-only + per-Klub):**

- `GET /sports`, `GET /sports/:code`
- `GET /klubs/:klubId/sports`, `GET /klubs/:klubId/sports/:code`, `POST /klubs/:klubId/sports/:code` (adiciona profile)

**Enrollments (W2.3 — Player × KlubSportProfile):**

- `POST /klubs/:klubId/sports/:sportCode/enrollments` — player solicita (pending)
- `POST /klubs/:klubId/sports/:sportCode/enrollments/admin` — comissão cria direto (active)
- `GET /klubs/:klubId/sports/:sportCode/enrollments` — lista (committee)
- `PATCH /enrollments/:id/approve` | `/reject` | `/suspend` | `/reactivate`
- `DELETE /enrollments/:id`
- `GET /users/:userId/enrollments`

**Rankings:**

- `GET /klubs/:klubId/sports/:sportCode/rankings` — lista
- `GET /klubs/:klubId/sports/:sportCode/rankings/:rankingId` — detalhe + entries
- `POST /klubs/:klubId/sports/:sportCode/rankings` — cria ranking
- `POST /klubs/:klubId/sports/:sportCode/rankings/:rankingId/entries` — enroll player no ranking
- `PATCH /rankings/:id` — admin edits
- `POST /jobs/recompute-temporal-rankings` — internal job (sem auth, IP-restrict no Cloud Run)

**Matches (casual):**

- `POST /matches` — submete resultado casual
- `POST /matches/:id/confirm` — opponent confirma

**Tournaments:**

- `GET /klubs/:klubId/sports/:sportCode/tournaments` | `:id`
- `POST /klubs/:klubId/sports/:sportCode/tournaments` — cria
- `POST /tournaments/:id/draw` — gera bracket
- `GET /tournaments/:id/bracket`
- `PATCH /tournaments/:id/reporting-mode`
- `POST /tournaments/:id/schedule` — distribui matches (cria bookings tournament_match)
- `POST /tournaments/:id/cancel` — **W2.2** — cancela + cascade bookings
- `GET /tournaments/:id/entries`, `POST entries`, `DELETE entries/me`
- `POST /tournaments/:id/entries/:entryId/approve`
- `PATCH /tournaments/:id/entries/:entryId/category`
- `POST /tournaments/:id/matches/:matchId/result` | `/confirm` | `/walkover` | `/double-walkover`
- `PATCH /tournaments/:id/matches/:matchId/result` — comissão edita
- `GET /tournament-matches/:matchId/revert/preview` — **W2.4** — read-only preview
- `POST /tournament-matches/:matchId/revert` — **W2.4** — atomic revert + cascade 1 nível

**Points schemas:**

- `GET /klubs/:klubId/sports/:sportCode/points-schemas`
- `POST /klubs/:klubId/sports/:sportCode/points-schemas`

**Bookings (módulo principal):**

- `POST /klubs/:klubId/bookings` — cria (cenário A: User existente, cenário B: cria guest)
- `GET /klubs/:klubId/bookings` — lista filtros space/start/status/primaryPlayer
- `GET /klubs/:klubId/calendar?date=` — calendar diário
- `GET /spaces/:spaceId/availability?date=&matchType=` — slots por dia (banded)
- `GET /bookings/:id` — apply BookingPresenter (full|limited via VisibilityService)
- `PATCH /bookings/:id/approve` | `/reject` | `DELETE` (cancel)
- `POST /klubs/:klubId/booking-series` — recurring booking atomic
- `DELETE /booking-series/:seriesId` — modos `this_only`/`this_and_future`/`all`
- `POST /klubs/:klubId/operational-blocks` — maintenance/weather/staff-block
- `PATCH /operational-blocks/:bookingId/close` — fecha weather_closed open-ended
- `POST /bookings/:id/extensions` — solicita extensão
- `PATCH /bookings/:id/extensions/:extId/approve` | `/reject`
- `GET /users/search?query=&limit=` — busca user/guest pra adicionar em booking

### Auth

- **Firebase Auth** (Identity Platform por baixo). API valida token via `firebase-admin.auth().verifyIdToken(token)`.
- `FirebaseAuthGuard` (em `shared/auth/firebase-auth.guard.ts`) é o guard padrão. Ele:
  1. Extrai `Authorization: Bearer <token>` do request
  2. Valida com Firebase Admin (ADC do projeto `draftklub-dev`)
  3. **Sincroniza** o User no DB via `IdentityFacade.syncUser()` (cria ou atualiza por `firebaseUid`)
  4. Anexa `request.user: AuthenticatedUser` com `userId, firebaseUid, email, roleAssignments[]`
- **Custom claims:** **NÃO** são usados. Roles ficam no DB (`identity.role_assignments`) e são lidas a cada request via `User.roleAssignments`. Custom claims do Firebase ficam vazios.
- **Roles:** `SUPER_ADMIN`, `KLUB_ADMIN`, `SPORTS_COMMITTEE`, `STAFF`, `TEACHER`, `PLAYER`. Cada `RoleAssignment` tem `scopeKlubId?` e `scopeSportId?` (escopo).
- **Authorization:** `PolicyEngine` (puro, testável) + `PolicyGuard` (resolve klubId implícito de tournament/booking/ranking/tournament-match params). Decorator `@RequirePolicy('action', { resolveKlubIdFrom: ... })`.

### Database connection

- **Driver:** `pg` 8.14 via `@prisma/adapter-pg` (driver adapter do Prisma 7).
- **Connection:** `DATABASE_URL` (env). String tipo `postgresql://api:senha@host:5432/draftklub`.
- **Em prod:** Cloud SQL Postgres, conectado via socket Unix do Cloud Run (Cloud SQL Auth Proxy embedded). Secret `database-url` no Secret Manager (montado no deploy via `--set-secrets=DATABASE_URL=database-url:latest`).
- **Em dev:** roda Cloud SQL via `cloud-sql-proxy` local na porta `5433` (ver convenção do `.env.example`).
- **Migrations:** `prisma migrate deploy` rodado por `apps/api/src/main.ts` no startup do container, **e** via Cloud Run job `draftklub-migrate` no pipeline (step 6 do cloudbuild). Migrations vivem em `apps/api/prisma/migrations/`.

---

## 3. packages/

### `@draftklub/shared-types`

- **Estado:** placeholder. `src/index.ts` tem só `export type Placeholder = string;`
- **Build:** `tsc --project tsconfig.json` para `dist/`
- **Consumidores:** nenhum (apps/api e apps/worker não importam)

### `@draftklub/sport-strategies`

- **Conteúdo:** `SportStrategy` interface, `TennisStrategy` (Elo + win/loss config), tipos `Match`/`MatchResult`/`RatingDelta`/`TournamentFormat`, `RatingEngineCode = 'elo' | 'points' | 'win_loss'`
- **Tests:** 14 testes (Vitest)
- **Consumidores:** apenas `apps/api` (`"@draftklub/sport-strategies": "workspace:^"`)

### `@draftklub/eslint-config`

- 4 configs: `base.js`, `nestjs.js`, `nextjs.js`, `react-native.js`
- Consumidores: apps/api, apps/worker (referenciam `nestjs.js`)

### `@draftklub/tsconfig`

- 5 configs: `base.json`, `library.json`, `nestjs.json`, `nextjs.json`, `react-native.json`
- Consumidores: todos (apps + packages estendem)

**Cross-references:** packages se referenciam via `workspace:*` ou `workspace:^` no `package.json`. Resolvidas pelo pnpm workspace.

---

## 4. apps/web

**❌ NÃO EXISTE.** Diretório `apps/web/` não está no repositório. `apps/` contém apenas `api/` e `worker/`.

`packages/eslint-config/nextjs.js` e `packages/tsconfig/nextjs.json` estão preparados, mas nenhum consumidor.

---

## 5. Tooling

- **Package manager:** **pnpm 10.6.5** (forçado via `packageManager` no root + `engines.pnpm`).
- **Workspace:** pnpm workspace (`pnpm-workspace.yaml`) escopado em `apps/*` e `packages/*`.
- **Build orchestrator:** **Turborepo 2.9** (`turbo.json` com tasks `build, dev, lint, typecheck, test, test:e2e, clean`).
- **Scripts root (`package.json`):**
  - `pnpm build` / `pnpm dev` / `pnpm lint` / `pnpm test` / `pnpm typecheck`
  - `pnpm format` / `pnpm format:check` (Prettier)
  - `pnpm clean` (limpa dists + node_modules)
- **CI:** **GitHub Actions** em `.github/workflows/ci.yml` (job `validate`: format check + install + typecheck + lint + test em PR pra main e push em main).

---

## 6. Variáveis de ambiente

**`apps/api/.env.example` (único env file no repo):**

```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://api:SENHA@127.0.0.1:5433/draftklub
LOG_LEVEL=debug
OTEL_ENABLED=false
OTEL_SERVICE_NAME=draftklub-api
# OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
```

**Em prod (injetado pelo Cloud Build deploy step):**

- `DATABASE_URL` → Secret Manager `database-url:latest`
- `ENCRYPTION_KEY` → Secret Manager `encryption-key:latest`
- `NODE_ENV=production`, `LOG_LEVEL=info`, `OTEL_ENABLED=false`, `OTEL_SERVICE_NAME=draftklub-api`

**Validação:** `bootstrap/config/app.config.ts` define o schema Zod (`appConfigSchema`) — falha no startup se faltar `DATABASE_URL`. `ENCRYPTION_KEY` é opcional (usado quando há doc encryption).

`apps/worker` ainda não tem `.env.example`.

---

## 7. Deploy pipeline

### Cloud Build (`cloudbuild.yaml`)

**Trigger:** push em `main` (branch).

**Steps:**

1. **CI** (Node 24 alpine): `pnpm install --frozen-lockfile` → `prisma generate` → `pnpm turbo run typecheck lint test`
2. **build-api**: docker build via `apps/api/Dockerfile` (BuildKit cache from `:latest`)
3. **build-worker**: paralelo
4. **push-api** + **push-worker** → Artifact Registry (`southamerica-east1-docker.pkg.dev/draftklub-dev/draftklub/{api|worker}`)
5. **migrate**: atualiza Cloud Run job `draftklub-migrate` com a imagem nova → `gcloud run jobs execute --wait` (roda `prisma migrate deploy`)
6. **deploy-api**: atualiza Cloud Run service `draftklub-api` com a imagem nova + secrets do Secret Manager + env vars

**Substitutions:** `_PROJECT_ID=draftklub-dev`, `_REGION=southamerica-east1`.

**Worker:** sai imagem mas **não há step de deploy**. Worker provavelmente roda como Cloud Run job adicional ainda não automatizado.

### Cloud Run

- **Service `draftklub-api`** existe e está em produção (no projeto `draftklub-dev`, região `southamerica-east1`). Última verificação direta foi a revisão `00051-xk2` ativa após commit `7e483f5` (W2.3). Não consegui confirmar a revisão de agora porque o `gcloud auth` está expirado nesta sessão.
- **Job `draftklub-migrate`** existe (rodado a cada deploy).
- **Seed:** existe um Cloud Run job de seed (nome confirmado em conversa anterior pelo briefing 10A — `gcloud run jobs execute draftklub-api-seed`), mas **não é parte do `cloudbuild.yaml`**: você roda manualmente após mudanças que afetam dados de dev.

### Domínio mapeado

**Não localizei nenhuma referência a `domain mapping` ou `gcloud beta run domain-mappings` no repo:**

- `cloudbuild.yaml` não mapeia domínio.
- `infra/terraform/` não tem recurso `google_cloud_run_domain_mapping` nem `google_dns_*`.

A diretriz oficial dos domínios (`draftklub.com` + `draftklub.com.br`) está documentada em `CLAUDE.md`, **mas a implementação concreta no GCP ainda não está commitada no repo**. Provavelmente está em ambiente de prod e/ou em planos do Terraform que ainda não foram aplicados.

**Ou seja: mapear domínio (provavelmente algo tipo `api.draftklub.com` pra Cloud Run service e raiz pra futuro CDN web) é trabalho explícito que ainda precisa entrar no repo + ser aplicado.**

---

## Pontos de atenção pro briefing do frontend

1. **`apps/web` é greenfield** — você escolhe stack (Next.js? Remix? Vite + React?). `packages/eslint-config/nextjs.js` + `packages/tsconfig/nextjs.json` sugerem que a intenção foi Next.js, mas nada está cravado.

2. **Auth no frontend:** API espera `Authorization: Bearer <Firebase ID token>`. Web vai fazer Firebase Auth direto no cliente (Firebase JS SDK), pegar o ID token e enviar. Refresh token é cuidado pelo SDK do Firebase.

3. **Endpoint `GET /me`** já está implementado e retorna `{ id, email, firebaseUid, roleAssignments }` — bom ponto de partida pro pós-login.

4. **CORS:** ainda não vi config explícita de CORS no `main.ts`. Vai precisar habilitar pro domínio do web (`draftklub.com`, `draftklub.com.br`, e localhost de dev).

5. **`@draftklub/shared-types` está vazio** — quando começar a ter DTOs compartilhados (response shapes do `/me`, `Klub`, `Booking`, etc.) o lugar é aqui. Hoje a API retorna shapes inferidos via Zod sem export — pode-se gerar tipos via OpenAPI/zod-to-ts ou escrever na mão.

6. **Sem service worker / PWA / mobile setup** ainda. CLAUDE.md já guarda a diretriz "balance web vs mobile" pra você manter em mente, mas o `apps/mobile` não existe — só `web` está sendo planejado agora.

7. **Domínio**: pra mapear `app.draftklub.com` (ou `app.draftklub.com.br`) pro futuro Cloud Run/CDN do `apps/web` quando ele subir, vai precisar adicionar `google_cloud_run_domain_mapping` (ou config equivalente em CDN/load balancer) no Terraform e aplicar.
