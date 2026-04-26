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

## Comandos úteis

- `pnpm --filter @draftklub/api typecheck` — TS check do api
- `pnpm --filter @draftklub/api lint` — ESLint
- `pnpm --filter @draftklub/api test` — Vitest
- `pnpm turbo run typecheck lint test` — workspace inteiro
- `cd apps/api && pnpm prisma generate` — regen Prisma client após schema change
