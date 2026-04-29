# DraftKlub v2 — Guia para Claude

## Sobre o projeto

Plataforma de gestão de Klubs esportivos (clubes, condomínios, escolas, espaços públicos)
com booking de quadras, torneios, ranking, e múltiplas modalidades. Monorepo pnpm + Turborepo
com API NestJS/Fastify/Prisma e frontends consumidores (web + mobile).

## Diretriz central — equilíbrio web vs mobile

**Não privilegiar um frontend em detrimento do outro.** Os públicos-alvo são diferentes
por superfície:

- **Mobile**: público dominante são os **players**. Casos de uso típicos: reservar
  quadra, ver agenda própria, conferir resultado de torneio em que está inscrito,
  ver ranking, solicitar enrollment numa modalidade, estender booking, ver hour
  bands disponíveis pro próximo slot.
- **Web**: público dominante é **operação do Klub** — comissão técnica, staff,
  KLUB_ADMIN, SUPER_ADMIN. Casos de uso típicos: criar torneio, distribuir
  schedule, aprovar/rejeitar enrollments, configurar `Space.hourBands` e
  `KlubConfig`, gerenciar memberships, ver dashboard administrativo, reverter
  resultado de match (W2.4), cancelar torneio em cascata (W2.2).

### Como aplicar

Ao planejar features novas:

1. Identificar a superfície primária do consumidor antes de modelar payload.
2. Endpoints staff/admin (lista de enrollments pendentes, dashboard, config de Klub)
   priorizam dados completos via web — payload pode ser pesado.
3. Endpoints player (minha agenda, próximos torneios, meu ranking, meus bookings)
   otimizam pra mobile — payload enxuto, paginação, sem N+1, suporte offline-friendly
   quando viável.
4. Funcionalidades core (booking, enrollment, ver torneio) **precisam existir em
   ambas** as superfícies, mas a UX e o payload podem divergir.
5. Ao propor Wave/próximos passos, sinalizar divisão de esforço web/mobile esperada.

## Domínios oficiais

- **`draftklub.com`** — gTLD principal (canônico para docs, emails, exemplos)
- **`draftklub.com.br`** — ccTLD Brasil

Configs de produção (DNS, SSL, Firebase auth domains, CORS, SPF/DKIM/DMARC,
redirects, deep links mobile, OAuth) devem cobrir **os dois**. Não inventar
subdomínios novos (`api.`, `admin.`, etc.) sem confirmação — os ativos devem
estar em `infra/terraform/` ou Cloud DNS.

## Stack

- **API**: NestJS 11 + Fastify, Prisma 7 + PrismaPg adapter, PostgreSQL multi-schema
  (`identity`, `audit`, `klub`, `space`, `sports`, `booking`)
- **Auth**: Firebase Auth + `PolicyEngine` com role-based scoping (SUPER_ADMIN,
  KLUB_ADMIN, SPORTS_COMMITTEE, TEACHER, STAFF, PLAYER)
- **Validation**: Zod 3.25 com helper `uuidString()` (aceita seed UUIDs além de RFC 4122)
- **CI/CD**: Cloud Build → migrações via `prisma migrate deploy` → Cloud Run
- **Telemetry**: Pino + OpenTelemetry

## Convenções importantes

- **Migrations aditivas** — cada feature gera migration própria, nunca alterar
  migration já aplicada. Pause obrigatório pra revisão de SQL antes de aplicar.
- **PolicyEngine + KlubIdResolver** — endpoints usam `@RequirePolicy(action,
{ resolveKlubIdFrom: 'tournament:tournamentId' | 'booking:bookingId' |
'ranking:id' | 'tournament-match:matchId' })`. Toda action precisa estar
  refletida no engine ou em testes.
- **BookingPresenter** — qualquer endpoint que retorna booking aplica o presenter
  pra resolver visibility (full|limited) baseado no viewer + roles + enrollment.
- **Idempotência no seed** — todas as operações usam `upsert` em unique keys; o
  seed pode ser re-rodado sem duplicar.
- **Uma feature = um briefing markdown em `docs/briefings/`** + ADRs novos em
  `docs/adr/`. ADRs documentam decisões; briefings documentam roadmap de execução.
- **Conventional Commits** — commitlint (commit-msg hook) bloqueia commits fora
  do padrão. `feat(scope): subject`, `fix:`, `chore:`, `docs:`, `refactor:`,
  `test:`, `perf:`, `ci:`. Body até 200 chars/linha. PT-BR com acento ok.
  Pre-commit hook auto-formata via lint-staged + prettier — não dá pra commitar
  arquivo desformatado.

## Shared services (Sprint M+N)

Auditoria de 8 agentes (29/04/2026) destravou infra/observabilidade. Não
duplicar ao implementar features novas:

- **AuditService** (`apps/api/src/shared/audit/`) — `audit.security_events`
  table. Use `auditService.record({ actorId, action, targetType, targetId,
before, after, metadata })` pra eventos sensíveis (role grants, klub
  transfers, cancellations, deletions). Fire-and-forget — falha loga warning.
- **MetricsService** (`apps/api/src/shared/metrics/`) — Prometheus counters
  - histograms. Já hooked: booking*created/cancelled, tournament_created/
    cancelled, match_reported, klub_created, klub_review_decided, membership*
    request*decided. Histogramas: booking_create_duration, tournament_draw*
    duration. Endpoint `/metrics`.
- **IdempotencyInterceptor** — global APP_INTERCEPTOR. Cliente envia
  `Idempotency-Key` header em POST/PATCH/DELETE; backend cacheia (status,
  body) por 24h scoped por user. Tabela `audit.idempotency_keys`.
- **Cursor pagination helper** (`apps/api/src/shared/pagination/cursor.ts`)
  — `CursorPaginationSchema`, `encodeCursor`, `decodeCursor`,
  `buildCursorPage`. Já aplicado em `/me/bookings` e `/rankings/:id`.
- **EncryptionService** (`apps/api/src/shared/encryption/`) — AES-256-GCM
  pra PII em repouso. `encryptToString` / `decryptFromString` packing
  `enc:v1:{iv}:{ciphertext}`. Aplicado em CPF + endereço do User.
- **Sentry** — `instrument.ts` (API) + `sentry.{client,server,edge}.config.ts`
  (web). Guarded por `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` — no-op sem.
- **Cloud Trace** — auto-ativa em prod via `OTEL_ENABLED=true` no cloudbuild.
  Sem endpoint customizado, usa `@google-cloud/opentelemetry-cloud-trace-exporter`
  direto (SA `cloudtrace.agent` já provisionada).

## Healthchecks

- `/livez` — sem deps, response simples (Cloud Run liveness probe deveria
  apontar pra cá; TF apply pendente em `infra/terraform/modules/cloud-run`)
- `/readyz` — DB ping (readiness probe)
- `/health` + `/ready` — aliases legacy mantidos pra compat

## Endpoints de plataforma

- `/api/docs` — Swagger UI (gated por `SWAGGER_ENABLED=true`, default off prod)
- `/metrics` — Prometheus scrape
- `/me/consent`, `/me/export`, `DELETE /me` — LGPD compliance flow
- Páginas estáticas: `/privacidade`, `/termos`, DPO em `dpo@draftklub.com`

## Tokens de design (web)

- **Brand utilities Tailwind v4**: `text-brand-primary-{50..900}`,
  `bg-brand-secondary-{400,500,600}`, `bg-brand-accent-{400,500,600}` etc
  (em vez de `text-[hsl(var(--brand-primary-600))]`)
- **Semantic warning**: `bg-warning/X`, `text-warning-foreground` (em vez
  de `bg-amber-500/X`, `text-amber-700 dark:text-amber-400`)
- **Spacing**: usar escala Tailwind padrão (0.5/1.5/2.5/3.5 ok, demais só
  inteiros). Off-grid (`p-2.25`, `mb-4.5`, `size-7.5`) é proibido pelo
  SYSTEM.md e pre-commit não checa, mas auditoria reabriu issue.

## Auditoria + roadmap

`/Users/bouhid/.claude/plans/draftklub-to-do-inherited-pumpkin.md` —
plano completo de Sprint M (~92% done), Sprint N (~63% done), Sprint O
(frontend RSC, primitivos faltantes), Sprint P (mobile + diferenciais).
Re-auditoria automática agendada pra 27/05/2026.

## Comandos úteis

- `pnpm --filter @draftklub/api typecheck` — TS check do api
- `pnpm --filter @draftklub/api lint` — ESLint
- `pnpm --filter @draftklub/api test` — Vitest
- `pnpm turbo run typecheck lint test` — workspace inteiro
- `cd apps/api && pnpm prisma generate` — regen Prisma client após schema change
- `pnpm format` / `pnpm format:check` — Prettier (auto-roda em pre-commit)
- `pnpm --filter @draftklub/api dev` — dev API com hot reload
- `SWAGGER_ENABLED=true pnpm --filter @draftklub/api dev` — habilita /api/docs local
