# DraftKlub — Auditoria UI/UX & IA (read-only)

**Data**: 2026-04-28 · **Branch**: `main` · **Pages audited**: 51 web · **Mobile**: N/A (não existe no repo)

---

## 1. Sumário executivo

A plataforma tem **infraestrutura de design tokens madura** (CSS custom properties para
brand palette, surfaces, bands, success, warning) + 10 primitivos UI já criados na Sprint L
PR-L1 (`Modal`, `Tabs`, `EmptyState`, `Banner`, `PageHeader`, `FormField`, `Button`, `Card`,
`Input`, `Label`). **O problema é disciplina de uso** — primitivos ainda não foram adotados
horizontalmente nas 51 páginas.

### Top 5 problemas recorrentes (com count)

1. **Tipografia ad-hoc** — 750+ ocorrências de `text-[Npx]` em vez dos tokens
   `text-xs/sm/base/md/lg/xl`. Top 5: `text-[13px]` (168×), `text-[12.5px]` (138×),
   `text-[11px]` (94×), `text-[12px]` (75×), `text-[14px]` (56×). Hardcoded sizes
   "feios" como `text-[10.5px]`, `text-[11.5px]`, `text-[13.5px]`, `text-[14.5px]` ainda
   aparecem em formulários públicos (login, criar-conta, quero-criar-klub, convite).

2. **Cor verde sucesso hardcoded** — 99 ocorrências de `[hsl(...)]` em .tsx, espalhadas
   em 33 arquivos. O cluster mais crítico é `hsl(142 71% 32%)` (verde de "sucesso") em vez
   do token `--success` que **já existe** em `globals.css`. Aparece em
   `solicitacoes/page.tsx:93,255,401`, `extensions-pending/page.tsx:90`,
   `reservar/page.tsx:633`, `dashboard/page.tsx:561`,
   `rankings/[rankingId]/page.tsx:646`, `enroll/page.tsx:85`,
   `criar-klub/sucesso/page.tsx:28`, `minhas-reservas/page.tsx:136,450`.

3. **Border-radius hardcoded** — 64× `rounded-[Npx]` em 21 arquivos (em geral
   `rounded-[10px]` em inputs/botões), em vez do token `--radius`. Cluster em forms
   públicos: `recuperar-senha/page.tsx`, `quero-criar-klub/page.tsx` (6×),
   `convite/[klubSlug]/page.tsx`, `torneios/novo/page.tsx`.

4. **Modal/banner inline em vez de primitivo** — 21 arquivos têm
   `border-destructive/30 bg-destructive/5` (banner ad-hoc em vez de `<Banner tone="error">`).
   Modais inline com `fixed inset-0 z-50 bg-black/50` aparecem em `buscar-klubs:509-556`,
   `minhas-reservas:386-419,694-721` (3 modais distintos), `solicitacoes:324`,
   `aprovacoes/[id]:408`. Em paralelo, `window.prompt()`/`window.confirm()` são usados
   em `aprovacoes/[id]:377`, `extensions-pending:171`, `_components configurar:379,583,775`,
   `platform-admins:277`.

5. **Back-link inline em vez de `<PageHeader>`** — apesar do primitivo `<PageHeader>`
   já estar disponível e adotado em `criar-klub`, `perfil`, `configurar`, `torneios/[id]`,
   ainda há back-links inline em `home`, `notificacoes:55-61`, `buscar-klubs:156-161`,
   `minhas-reservas`, `dashboard`, `reservar:161`, `solicitacoes:52`,
   `extensions-pending:66-72`, e nos forms públicos (`recuperar-senha`,
   `quero-criar-klub`, `convite/[klubSlug]`).

### Achados críticos de pricing & feature gating

- **0 hardcodings de R$9,90 em código de produto** ✅ — referências apenas em
  `docs/briefings/dia-11-onda-1.md:33` e `docs/adr/0008-modelo-comercial.md:30`.
- **1 placeholder mock encontrado**: `dashboard/page.tsx:90` traz `value: 'R$ 64,8'`
  como KPI de receita mock. Deve ser removido antes de production.
- **Gap arquitetural**: **`useFeature` hook não existe**, **tabela `features` não
  existe**. Tier gating é estático via `Klub.plan` (Trial/Starter/Pro/Elite/Enterprise)
  + limites (`maxMembers`/`maxSports`/`maxCourts`). Existe apenas `usePersona()` em
  `apps/web/src/components/dashboard/persona-switcher.tsx` (dev-only). Recomenda-se
  **criar tabela `features` + hook `useFeature` em sprint dedicada antes do refator
  visual continuar**, pra que features visuais futuras (badges Premium, gates,
  rollout %) não sejam hardcoded numa segunda rodada.

### Mobile

**N/A** — repositório não inclui app mobile. CLAUDE.md menciona Expo como meta
("frontends consumidores (web + mobile)") mas não há código mobile em
`apps/`. Quando o app mobile for criado, a auditoria precisará ser repetida com
foco em payload, deep-links, e paridade de menus com a sidebar web.

---

## 2. Estrutura do monorepo

- **Monorepo Turborepo + pnpm**. Workspaces:
  - `apps/web` — Next.js 15 App Router em `apps/web/src/app/`. 51 `page.tsx`.
  - `apps/api` — NestJS 11 + Fastify + Prisma 7 + PostgreSQL multi-schema.
  - `apps/worker` — NestJS background jobs (outbox processor, etc).
  - `packages/shared-types` — DTOs/types compartilhados.
  - `packages/sport-strategies` — rating engines (Elo) + tennis strategy.
  - `packages/tsconfig` + `packages/eslint-config` — configs compartilhadas.
- **Não existe `packages/ui` / `packages/design-system`** — todo UI vive em
  `apps/web/src/components/ui/` (10 primitivos + `SYSTEM.md`).
- **Tokens já definidos** em `apps/web/src/app/globals.css`:
  - Brand: `--brand-primary-{50..900}`, `--brand-secondary-*`, `--brand-accent-*`,
    `--brand-neutral-*`
  - Semantic: `--background`, `--foreground`, `--card`, `--popover`, `--primary`,
    `--secondary`, `--muted`, `--accent`, `--destructive`, `--success`,
    `--warning`, `--border`, `--input`, `--ring`
  - Layout: `--radius`, `--shadow-{sm,md,lg}`
  - Domain: `--surface-{clay,hard,grass,synthetic,carpet,other}`,
    `--band-{offpeak,regular,prime}`

---

## 3. Tabela de inventário (compacta — 51 rotas)

| # | Rota | Persona | Tier | Layout | Lines | Priority |
|---|---|---|---|---|---|---|
| 01 | `/` | Anônimo | Always-on | Redirect | 6 | low |
| 02 | `/login` | Anônimo | Always-on | Landing | 195 | medium |
| 03 | `/criar-conta` | Anônimo | Always-on | Landing | 178 | medium |
| 04 | `/recuperar-senha` | Anônimo | Always-on | Form | 149 | high |
| 05 | `/quero-criar-klub` | Anônimo | Always-on | Form | 269 | high |
| 06 | `/convite/[klubSlug]` | Anônimo→Player | Always-on | Form | 167 | high |
| 07 | `/criar-klub` | Player→Klub Admin | Always-on | Wizard | 412 | medium |
| 08 | `/criar-klub/sucesso` | Ambos | Always-on | Confirmation | 65 | low |
| 09 | `/home` | Ambos | Always-on | Dashboard | 300 | medium |
| 10 | `/klubs` | Ambos | Always-on | List | 146 | low |
| 11 | `/buscar-klubs` | Player | Always-on | List | 717 | high |
| 12 | `/minhas-reservas` | Player | Always-on | List | 790 | high |
| 13 | `/notificacoes` | Player | Always-on | List | 238 | medium |
| 14 | `/perfil` | Ambos | Always-on | Form-shell | 9 | low |
| 15 | `/perfil/acesso` | Ambos | Always-on | Form-shell | 14 | low |
| 16 | `/perfil/endereco` | Ambos | Always-on | Form-shell | 9 | low |
| 17 | `/perfil/notificacoes` | Ambos | Always-on | Form-shell | 9 | low |
| 18 | `/perfil/pessoa-fisica` | Player | Always-on | Form-shell | 9 | low |
| 19 | `/perfil/preferencias` | Ambos | Always-on | Form-shell | 7 | low |
| 20 | `/admin/aprovacoes` | SUPER_ADMIN | Always-on | List | 275 | low |
| 21 | `/admin/aprovacoes/[id]` | SUPER_ADMIN | Always-on | Detail | 495 | medium |
| 22 | `/admin/cadastros` | SUPER_ADMIN | Always-on | Redirect | 10 | low |
| 23 | `/admin/platform-admins` | PLATFORM_OWNER | Always-on | List+Form | 337 | medium |
| 24 | `/k/[slug]/onboarding` | Klub Admin | Always-on | Redirect | 14 | low |
| 25 | `/k/[slug]/quadras` | Klub Admin | Always-on | Redirect | 13 | low |
| 26 | `/k/[slug]/editar` | Klub Admin | Always-on | Redirect | 14 | low |
| 27 | `/k/[slug]/dashboard` | Klub Admin>Player | Always-on | Dashboard | 721 | high |
| 28 | `/k/[slug]/extensions-pending` | Klub Admin | Always-on | List | 246 | medium |
| 29 | `/k/[slug]/modalidades` | Ambos | Always-on | Grid | 443 | medium |
| 30 | `/k/[slug]/reservar` | Player | Always-on | Wizard | 857 | high |
| 31 | `/k/[slug]/solicitacoes` | Klub Admin | Always-on | List | 423 | high |
| 32 | `/k/[slug]/configurar` | Klub Admin | Always-on | Form-shell | 9 | low |
| 33 | `/k/[slug]/configurar/contato` | Klub Admin | Always-on | Form-shell | 9 | low |
| 34 | `/k/[slug]/configurar/equipe` | Klub Admin | Always-on | Form-shell | 19 | low |
| 35 | `/k/[slug]/configurar/legal` | PLATFORM | Always-on | Form-shell | 19 | low |
| 36 | `/k/[slug]/configurar/localizacao` | Klub Admin | Always-on | Form-shell | 9 | low |
| 37 | `/k/[slug]/configurar/modalidades` | Klub Admin | Always-on | Form-shell | 9 | low |
| 38 | `/k/[slug]/configurar/perigosa` | PLATFORM | Always-on | Form-shell | 19 | high |
| 39 | `/k/[slug]/configurar/quadras` | Klub Admin | Always-on | Form-shell | 9 | low |
| 40 | `/k/[slug]/configurar/visibilidade` | Klub Admin | Always-on | Form-shell | 9 | low |
| 41 | `/k/[slug]/sports/[code]/comissao` | Ambos | Always-on | List | 197 | low |
| 42 | `/k/[slug]/sports/[code]/dashboard` | Ambos | Always-on | Hub | 109 | low |
| 43 | `/k/[slug]/sports/[code]/enroll` | Player | Always-on | Form | 124 | medium |
| 44 | `/k/[slug]/sports/[code]/rankings` | Ambos | Always-on | List | 428 | low |
| 45 | `/k/[slug]/sports/[code]/rankings/[id]` | Ambos | Always-on | Detail | 654 | medium |
| 46 | `/k/[slug]/sports/[code]/torneios` | Ambos | Always-on | List | 288 | low |
| 47 | `/k/[slug]/sports/[code]/torneios/novo` | Klub Admin | Always-on | Form (long) | 931 | **critical** |
| 48 | `/k/[slug]/sports/[code]/torneios/[id]` | Ambos | Always-on | Detail-shell | 119 | low |
| 49 | `/k/[slug]/sports/[code]/torneios/[id]/chave` | Ambos | Always-on | Detail-shell | 69 | low |
| 50 | `/k/[slug]/sports/[code]/torneios/[id]/inscritos` | Ambos | Always-on | Detail-shell | 69 | low |
| 51 | `/k/[slug]/sports/[code]/torneios/[id]/operacoes` | Klub Admin | Always-on | Detail-shell | 24 | low |

---

## 4. Análise detalhada por página (full depth)

### 4.A — Public / Anônimo (6)

#### 01. `/` — `app/page.tsx` (6 linhas)

- **Purpose**: Redirect raiz `/` → `/login` (TODO Firebase session detection comentado).
- **Persona**: Anônimo · **Tier**: Always-on · **Layout**: Redirect.
- **Components**: `redirect()` de `next/navigation`.
- **Nav entry**: deep link / domínio raiz.
- **Visual issues**: nenhum.
- **IA issues**: TODO de session detection ainda não implementado — usuário autenticado
  cai num `/login` que faz `RedirectIfAuthenticated` (round-trip evitável).
- **Priority**: low.

#### 02. `/login` — `app/login/page.tsx` (195 linhas)

- **Purpose**: Login com hero desktop + form + microcopy.
- **Persona**: Anônimo · **Tier**: Always-on · **Layout**: Landing 2-col split.
- **Components**: `BrandLockup`, `CourtPattern`, `LoginForm`, `RedirectIfAuthenticated`.
- **Nav entry**: redirect de `/`, link de `/criar-conta`, link de `/quero-criar-klub`.
- **Visual issues**:
  - `app/login/page.tsx:54` — `text-[11px]` (deveria ser `text-xs`).
  - `app/login/page.tsx:77` — `text-[17px]` (criar token `text-md` se necessário).
  - `app/login/page.tsx:144` — `text-[28px]` (deveria ser `font-display text-2xl`).
  - `app/login/page.tsx:151,183` — `text-[13px]` (deveria ser `text-sm`).
  - `app/login/page.tsx:174` — `boxShadow` inline (usar `shadow-sm/md`).
- **IA issues**:
  - `app/login/page.tsx:84` — copy "vida do clube" (vocab inconsistente; padrão é "Klub").
- **Priority**: medium.

#### 03. `/criar-conta` — `app/criar-conta/page.tsx` (178 linhas)

- **Purpose**: Signup público (clone visual de `/login`).
- **Persona**: Anônimo · **Tier**: Always-on · **Layout**: Landing 2-col.
- **Components**: `BrandLockup`, `CourtPattern`, `SignupForm`, `RedirectIfAuthenticated`.
- **Nav entry**: link de `/login`.
- **Visual issues**:
  - `app/criar-conta/page.tsx:47` — `text-[11px]`.
  - `app/criar-conta/page.tsx:70` — `text-[17px]`.
  - `app/criar-conta/page.tsx:136` — `text-[28px]`.
  - `app/criar-conta/page.tsx:166` — `text-[13px]`.
- **IA issues**:
  - `app/criar-conta/page.tsx:77` — "vida do clube" (mesmo erro do login).
- **Priority**: medium.

#### 04. `/recuperar-senha` — `app/recuperar-senha/page.tsx` (149 linhas)

- **Purpose**: Password reset via Firebase Auth, form inline single-input.
- **Persona**: Anônimo · **Tier**: Always-on · **Layout**: Form (centered card).
- **Components**: `BrandLockup`, `ArrowLeft` icon, form primitivos inline, `SentScreen`.
- **Nav entry**: link "Esqueceu a senha" em `/login`.
- **Visual issues**:
  - `app/recuperar-senha/page.tsx:55,131` — `text-[28px]` (h1).
  - `app/recuperar-senha/page.tsx:60` — `text-[15px]`.
  - `app/recuperar-senha/page.tsx:71,98,106` — `text-[13px]`.
  - `app/recuperar-senha/page.tsx:89,142` — `rounded-[10px]` em label/input/button.
  - `app/recuperar-senha/page.tsx:91` — `ring-[3px]` (deveria ser `ring-2`).
  - **Form 100% inline** (não usa `<FormField>`/`<Input>` primitivos).
- **IA issues**:
  - Back-link inline em vez de `<PageHeader back={...}>`.
- **Priority**: high (form público é vitrine).

#### 05. `/quero-criar-klub` — `app/quero-criar-klub/page.tsx` (269 linhas)

- **Purpose**: Sales form pra solicitação de novo Klub (B2B).
- **Persona**: Anônimo (prospect) · **Tier**: Always-on · **Layout**: Form (fieldsets).
- **Components**: `BrandLockup`, `ArrowLeft`, `Section`/`Field` custom helpers, `SentScreen`.
- **Nav entry**: link de `/login`, deep link.
- **Visual issues**:
  - `app/quero-criar-klub/page.tsx:55,67,215` — `text-[28px]` (h1, SentScreen).
  - `app/quero-criar-klub/page.tsx:72` — `text-[15px]`.
  - `app/quero-criar-klub/page.tsx:89,100,110,124,134,189,226` — `rounded-[10px]` (7×).
  - `app/quero-criar-klub/page.tsx:126` — `grid-cols-[1fr_120px]` width hardcoded.
  - `app/quero-criar-klub/page.tsx:181,262` — `text-[13px]`.
  - `app/quero-criar-klub/page.tsx:241` — `text-[10.5px]` (anti-pattern: legend pequeno demais).
  - `inputCls` constante em `:235-236` é boa intenção mas mesmo assim hardcoded
    `rounded-[10px]`/`text-[15px]`/`ring-[3px]`.
- **IA issues**:
  - Tom comercial bom ("Nosso time entra em contato em até 2 dias úteis").
- **Priority**: high.

#### 06. `/convite/[klubSlug]` — `app/convite/[klubSlug]/page.tsx` (167 linhas)

- **Purpose**: Aceitar convite público (idempotente). Login inline ou CTA join.
- **Persona**: Anônimo→Player · **Tier**: Always-on · **Layout**: Form (centered card).
- **Components**: `BrandLockup`, `LoginForm` embedded, `Shell` custom, `Loader2`/`Check`.
- **Nav entry**: deep link de email/share.
- **Visual issues**:
  - `app/convite/[klubSlug]/page.tsx:99,108` — `text-[11px]`/`text-[12px]`.
  - `app/convite/[klubSlug]/page.tsx:103` — `text-[28px]`.
  - `app/convite/[klubSlug]/page.tsx:113,121,124` — `text-[14px]`/`text-[13px]`.
  - `app/convite/[klubSlug]/page.tsx:132` — `rounded-[10px]`.
  - `app/convite/[klubSlug]/page.tsx:147` — `text-[11.5px]` (footer).
- **IA issues**: Loading + join states bem estruturados; idempotência clara.
- **Priority**: high.

### 4.B — Authed core (7) + Perfil (6)

#### 07. `/criar-klub` — `(authed)/criar-klub/page.tsx` (412 linhas, PR-L5)

- **Purpose**: Wizard 4-step para registro de novo Klub (PJ ou PF).
- **Persona**: Player ou Klub Admin (prospect) · **Tier**: Always-on · **Layout**: Wizard.
- **Components**: `<PageHeader>`, `<Banner>`, `Stepper`, `Step1-4` (de `_components.tsx`).
- **Nav entry**: `/home` ou `/klubs` (botão Criar Klub).
- **Visual issues**:
  - `(authed)/criar-klub/page.tsx:188-205` — `rounded-[10px]` inputs (legacy do _components).
  - Botões back/next/submit inline com `bg-primary` em vez de `<Button>` primitivo.
- **IA issues**:
  - 3 estados pra CNPJ lookup (loading/tried/data) razoáveis mas verbose.
- **Priority**: medium (PR-L5 já modernizou shell mas _components ainda hardcoded).

#### 08. `/criar-klub/sucesso` — `(authed)/criar-klub/sucesso/page.tsx` (65 linhas)

- **Purpose**: Confirmação pós-cadastro com tom polido (até 2 dias úteis).
- **Persona**: Ambos · **Tier**: Always-on · **Layout**: Confirmation.
- **Components**: `CheckCircle2`, `Link` button.
- **Nav entry**: auto-redirect de `/criar-klub` em sucesso.
- **Visual issues**:
  - `(authed)/criar-klub/sucesso/page.tsx:28` — `text-[hsl(142_71%_32%)]` hardcoded
    (use `var(--success)`).
  - `(authed)/criar-klub/sucesso/page.tsx:33` — `style={{ letterSpacing }}` inline em h1.
  - `(authed)/criar-klub/sucesso/page.tsx:39-57` — text sizes mistos `[14.5px]`/`[13px]`/`[12px]`.
- **IA issues**: `Suspense fallback={null}` mute (loading invisível).
- **Priority**: low.

#### 09. `/home` — `(authed)/home/page.tsx` (300 linhas)

- **Purpose**: Landing pós-login com Klubs do user, solicitações, atalhos.
- **Persona**: Ambos · **Tier**: Always-on · **Layout**: Dashboard.
- **Components**: `EmailVerifyBanner`, `Link` cards, `KlubAvatar` (gera hue por hash).
- **Nav entry**: redirect de `/` quando autenticado, sidebar Home.
- **Visual issues**:
  - `(authed)/home/page.tsx:40` — `text-[hsl(var(--brand-primary-600))]` (token, ok).
  - `(authed)/home/page.tsx:82-84` — `text-[10px]` + `tracking-[0.08em]` label inline.
  - `(authed)/home/page.tsx:204` — `style={{ borderRadius, color }}` inline em badge.
  - `(authed)/home/page.tsx:266` — `style={{ background: hsl(${hue} 55% 42%) }}` em
    `KlubAvatar` (acceptable porque é dynamic — extrair pra utility).
- **IA issues**:
  - "Sou dono de um clube e quero saber mais" em `(authed)/home/page.tsx:172` —
    vocab "clube" (deveria ser "Klub" pra coerência).
  - 4 estados de hasKlubs (null/false/true/loading) misturados.
- **Priority**: medium.

#### 10. `/klubs` — `(authed)/klubs/page.tsx` (146 linhas)

- **Purpose**: Hub "Meus Klubs" com CTAs Buscar/Criar (consolida pós PR-H1).
- **Persona**: Ambos · **Tier**: Always-on · **Layout**: List.
- **Components**: `KlubCard`, `Link`, empty state inline.
- **Nav entry**: sidebar `/klubs`.
- **Visual issues**:
  - `(authed)/klubs/page.tsx:40` — `text-[hsl(var(--brand-primary-600))]` (token, ok).
  - `(authed)/klubs/page.tsx:54-68` — 2 botões inline className mix
    (`bg-primary` × `border-border`) sem `<Button>` primitivo.
  - `(authed)/klubs/page.tsx:79-81` — empty state inline (não usa `<EmptyState>`).
- **IA issues**:
  - CTAs "Buscar Klubs" e "Criar Klub" duplicados em `/home` e aqui.
- **Priority**: low.

#### 11. `/buscar-klubs` — `(authed)/buscar-klubs/page.tsx` (717 linhas)

- **Purpose**: Discovery com filtros (nome/UF/esporte/geo/período) + tier badges.
- **Persona**: Player · **Tier**: Always-on (com geo opt-in) · **Layout**: List.
- **Components**: filtros inline, `GeoStatusHint`, `KlubCard`, `RequestMembershipModal`.
- **Nav entry**: `/home` atalho ou `/klubs` botão Buscar.
- **Visual issues**:
  - `(authed)/buscar-klubs/page.tsx:156-161` — back-link inline (use `<PageHeader back>`).
  - `(authed)/buscar-klubs/page.tsx:187` — `rounded-[10px]` em search input.
  - `(authed)/buscar-klubs/page.tsx:217` — `bg-card/40` opacity hardcoded.
  - `(authed)/buscar-klubs/page.tsx:252` — `accent-primary` + `ring-[3px] ring-primary/20`.
  - `(authed)/buscar-klubs/page.tsx:265-286` — period buttons inline (sem `RadioGroup`).
  - `(authed)/buscar-klubs/page.tsx:407` — `text-[hsl(var(--brand-primary-600))]` (ok).
  - `(authed)/buscar-klubs/page.tsx:450` — `bg-amber-500/5` request-submitted state.
  - `(authed)/buscar-klubs/page.tsx:509-556` — `RequestMembershipModal` inline com
    `fixed inset-0 + bg-black/50` (deveria usar `<Modal>` primitivo).
- **IA issues**:
  - 5 estados de geo (requesting/granted/denied/fallback/unavailable) overkill.
  - 4 content states (error/!filter/loading/results) verbose.
- **Priority**: high.

#### 12. `/minhas-reservas` — `(authed)/minhas-reservas/page.tsx` (790 linhas)

- **Purpose**: Cross-Klub bookings com tabs (upcoming/past/cancelled) + actions.
- **Persona**: Player · **Tier**: Always-on · **Layout**: List + 3 modais.
- **Components**: `TabButton` local, `BookingCard`, `CancelModal`, `AddPlayersModal`,
  `ExtendModal`, `StatusBadge`.
- **Nav entry**: sidebar `/minhas-reservas`, FAB "Reservar quadra" em `/home`.
- **Visual issues**:
  - `(authed)/minhas-reservas/page.tsx:136,450` — `bg-[hsl(142_71%_32%/0.05)]` (use `--success`).
  - `(authed)/minhas-reservas/page.tsx:187` — `rounded-[10px]` inputs.
  - `(authed)/minhas-reservas/page.tsx:324-327` — `bg-amber-500/15` pending badge hardcoded.
  - `(authed)/minhas-reservas/page.tsx:345` — `border-l-2 border-primary/30` notes box undocumented.
  - `(authed)/minhas-reservas/page.tsx:386-419,694-721` — **3 modais distintos** com
    `fixed inset-0` em vez de `<Modal>` primitivo.
  - `(authed)/minhas-reservas/page.tsx:509-572` — input fields com `rounded-[10px] ring-[3px]`.
- **IA issues**:
  - `(authed)/minhas-reservas/page.tsx:261-272` — `TabButton` primitivo local (reinventa
    `<Tabs>` que já existe).
  - 3 action buttons condicionais (canAddPlayers/canExtend/canCancel) sem button primitive.
- **Priority**: high.

#### 13. `/notificacoes` — `(authed)/notificacoes/page.tsx` (238 linhas)

- **Purpose**: Pending match confirmations (rankings) com confirm/dispute.
- **Persona**: Player · **Tier**: Always-on · **Layout**: List.
- **Components**: back-link, `PendingItemCard`, `Swords`/`CheckCircle2` icons.
- **Nav entry**: sidebar `/notificacoes`.
- **Visual issues**:
  - `(authed)/notificacoes/page.tsx:55-61` — back-link inline.
  - `(authed)/notificacoes/page.tsx:173-187` — cores amber hardcoded
    (`border-amber-500/30 bg-amber-500/5`, `text-amber-700 dark:text-amber-400`,
    `bg-amber-500/15`) em vez de `<Banner tone="warning">`.
- **IA issues**:
  - `(authed)/notificacoes/page.tsx:228-235` — botão "Disputar" disabled indefinitely
    sem explanation visível (apenas `title=`).
- **Priority**: medium.

#### 14. `/perfil` — `(authed)/perfil/page.tsx` (9 linhas, PR-L4 shell)

- **Purpose**: Default sub do perfil (Identidade) — delega `IdentitySection`.
- **Persona**: Ambos · **Tier**: Always-on · **Layout**: Form-shell.
- **Components**: `useProfileContext`, `IdentitySection`.
- **Nav entry**: footer da sidebar (avatar).
- **Visual issues**: nenhum (shell magro).
- **IA issues**: nenhum.
- **Priority**: low.

#### 15. `/perfil/acesso` — `(authed)/perfil/acesso/page.tsx` (14 linhas)

- **Purpose**: Email + providers (Google) + DangerZone (delete account).
- **Persona**: Ambos · **Tier**: Always-on · **Layout**: Form-shell.
- **Components**: `useProfileContext`, `AccessSection`, `DangerZone`.
- **Nav entry**: tab em `/perfil/layout.tsx`.
- **Visual issues**: nenhum no page; delegated.
- **IA issues**: nenhum.
- **Priority**: low.

#### 16. `/perfil/endereco` — `(authed)/perfil/endereco/page.tsx` (9 linhas)

- **Purpose**: CEP + endereço manual + geo coords.
- **Persona**: Ambos · **Tier**: Always-on · **Layout**: Form-shell.
- **Components**: `EnderecoSection`.
- **Visual issues**: nenhum no page.
- **IA issues**: nenhum.
- **Priority**: low.

#### 17. `/perfil/notificacoes` — `(authed)/perfil/notificacoes/page.tsx` (9 linhas)

- **Purpose**: Toggles email notifications (booking confirmado, lembrete 24h, etc).
- **Persona**: Ambos · **Tier**: Always-on · **Layout**: Form-shell.
- **Components**: `NotificacoesSection`.
- **Visual issues**: nenhum no page.
- **IA issues**: nenhum.
- **Priority**: low.

#### 18. `/perfil/pessoa-fisica` — `(authed)/perfil/pessoa-fisica/page.tsx` (9 linhas)

- **Purpose**: CPF + gender + birthDate.
- **Persona**: Player · **Tier**: Always-on (opcional) · **Layout**: Form-shell.
- **Components**: `PessoaFisicaSection`.
- **Visual issues**: nenhum no page.
- **IA issues**: nenhum.
- **Priority**: low.

#### 19. `/perfil/preferencias` — `(authed)/perfil/preferencias/page.tsx` (7 linhas)

- **Purpose**: Dark mode + sport preferences (recomendações).
- **Persona**: Ambos · **Tier**: Always-on · **Layout**: Form-shell.
- **Components**: `PreferenciasSection`.
- **Visual issues**: nenhum.
- **IA issues**: nenhum.
- **Priority**: low.

### 4.C — Admin (4)

#### 20. `/admin/aprovacoes` — `(authed)/admin/aprovacoes/page.tsx` (275 linhas)

- **Purpose**: Listar cadastros pendentes PJ/PF com filtro de status + busca.
- **Persona**: SUPER_ADMIN · **Tier**: Always-on · **Layout**: List.
- **Components**: `TabButton` local, `CadastroCard`, `ReviewBadge`, `CnpjBadge`.
- **Nav entry**: sidebar Administrativa > Aprovações.
- **Visual issues**: estrutura limpa; mínimas inconsistências.
- **IA issues**: bem labeled, debounce 300ms.
- **Priority**: low.

#### 21. `/admin/aprovacoes/[id]` — `(authed)/admin/aprovacoes/[id]/page.tsx` (495 linhas)

- **Purpose**: Detalhe pra revisar CNPJ/dados/slug + aprovar/rejeitar com motivo.
- **Persona**: SUPER_ADMIN · **Tier**: Always-on · **Layout**: Detail.
- **Components**: `Section`/`Row` locais, `ReviewBadge`, `DeleteConfirmModal`.
- **Nav entry**: `/admin/aprovacoes` linhas.
- **Visual issues**:
  - `(authed)/admin/aprovacoes/[id]/page.tsx:377-378` — `window.prompt()`/
    `window.confirm()` (UI nativa do browser).
  - `(authed)/admin/aprovacoes/[id]/page.tsx:408` — modal de rejeição inline
    (textarea sem feedback de char limit visual, embora `maxLength=500`).
  - `(authed)/admin/aprovacoes/[id]/page.tsx:334-338` — slug-conflict warning amber tone ok.
- **IA issues**:
  - `(authed)/admin/aprovacoes/[id]/page.tsx:119` — "Zona perigosa" sem warning icon.
  - `(authed)/admin/aprovacoes/[id]/page.tsx:377` — prompt() sem motivos pré-preenchidos.
  - `(authed)/admin/aprovacoes/[id]/page.tsx:423` — sticky bottom não testado em <600px.
- **Priority**: medium.

#### 22. `/admin/cadastros` — `(authed)/admin/cadastros/page.tsx` (10 linhas)

- **Purpose**: Backward-compat redirect → `/admin/aprovacoes`.
- **Persona**: SUPER_ADMIN · **Tier**: Always-on · **Layout**: Redirect.
- **Components**: `redirect()`.
- **Nav entry**: link legacy em emails antigos.
- **Visual issues**: nenhum.
- **IA issues**: nenhum.
- **Priority**: low.

#### 23. `/admin/platform-admins` — `(authed)/admin/platform-admins/page.tsx` (337 linhas)

- **Purpose**: Owner concede/revoga PLATFORM_ADMIN com quota máx (3 hardcoded).
- **Persona**: PLATFORM_OWNER · **Tier**: Always-on · **Layout**: List + Form.
- **Components**: `GrantForm`, `AssignmentRow`, `RoleBadge`, access-guard `Banner`.
- **Nav entry**: sidebar Administrativa > Platform Admins (Owner only).
- **Visual issues**:
  - `(authed)/admin/platform-admins/page.tsx:277` — `window.confirm()`.
  - `(authed)/admin/platform-admins/page.tsx:88-98` — access-denied card minimalista.
- **IA issues**:
  - `(authed)/admin/platform-admins/page.tsx:34` — `PLATFORM_ADMIN_QUOTA = 3` hardcoded
    (deveria virar config).
  - `(authed)/admin/platform-admins/page.tsx:125` — quota "2/3" sem explicação de why=3.
  - `(authed)/admin/platform-admins/page.tsx:210` — toast inline sem auto-dismiss.
- **Priority**: medium.

### 4.D — Klub-scoped (8)

#### 24. `/k/[slug]/onboarding` — `(authed)/k/[klubSlug]/onboarding/page.tsx` (14 linhas)

- **Purpose**: Legacy redirect → `/configurar?tab=modalidades`.
- **Persona**: Klub Admin · **Tier**: Always-on · **Layout**: Redirect.
- **Components**: `redirect()`.
- **Nav entry**: bookmarks legacy, link de email.
- **Visual issues**: nenhum.
- **IA issues**: nenhum.
- **Priority**: low.

#### 25. `/k/[slug]/quadras` — `(authed)/k/[klubSlug]/quadras/page.tsx` (13 linhas)

- **Purpose**: Legacy redirect → `/configurar/quadras`.
- **Persona**: Klub Admin · **Tier**: Always-on · **Layout**: Redirect.
- **Visual issues**: nenhum.
- **Priority**: low.

#### 26. `/k/[slug]/editar` — `(authed)/k/[klubSlug]/editar/page.tsx` (14 linhas)

- **Purpose**: Legacy redirect → `/configurar`.
- **Persona**: Klub Admin · **Tier**: Always-on · **Layout**: Redirect.
- **Visual issues**: nenhum.
- **Priority**: low.

#### 27. `/k/[slug]/dashboard` — `(authed)/k/[klubSlug]/dashboard/page.tsx` (721 linhas)

- **Purpose**: Hub do Klub — KPIs (reservas/ocupação/sócios/receita), atividade, torneios.
- **Persona**: Klub Admin (player vê limited view) · **Tier**: Always-on · **Layout**: Dashboard.
- **Components**: `Topbar`, `WeatherWidget`, `KpiCard`, `Panel`, `RealTournaments`,
  `RealActivityFeed`, `KlubAdminActions`.
- **Nav entry**: sidebar Klubs > [slug] > Dashboard.
- **Visual issues**:
  - `(authed)/k/[klubSlug]/dashboard/page.tsx:90` — **`value: 'R$ 64,8'` mock hardcoded**
    (KPI receita placeholder; remover antes de production).
  - `(authed)/k/[klubSlug]/dashboard/page.tsx:561` — `text-[hsl(142_71%_32%)]` delta "up"
    (use `--success`).
  - `(authed)/k/[klubSlug]/dashboard/page.tsx:634` — `style={{ background: hsl(var(--brand-accent-500)) }}` inline.
  - `(authed)/k/[klubSlug]/dashboard/page.tsx:648` — `text-[hsl(38_92%_28%)]` prime-time
    hardcoded.
- **IA issues**:
  - `(authed)/k/[klubSlug]/dashboard/page.tsx:243` — label "Gerenciar Klub" ad-hoc.
  - `(authed)/k/[klubSlug]/dashboard/page.tsx:428-441` — tournament status com
    `replace(/_/g, ' ')` (sem caps consistente).
  - `(authed)/k/[klubSlug]/dashboard/page.tsx:520` — "user 8 chars…" verbose.
- **Priority**: high.

#### 28. `/k/[slug]/extensions-pending` — `(authed)/k/[klubSlug]/extensions-pending/page.tsx` (246 linhas)

- **Purpose**: Admin queue — extensões de booking aguardando aprovação.
- **Persona**: Klub Admin · **Tier**: Always-on · **Layout**: List.
- **Components**: back-link, `Header`, `ExtensionCard`, `Loader2`, empty-state.
- **Nav entry**: dashboard card "Extensões pendentes".
- **Visual issues**:
  - `(authed)/k/[klubSlug]/extensions-pending/page.tsx:90` — `hsl(142_71%_32%)` success
    alert (3 refs: border/bg/text) → use `--success`.
  - `(authed)/k/[klubSlug]/extensions-pending/page.tsx:171` — `window.prompt()` rejeição.
  - `(authed)/k/[klubSlug]/extensions-pending/page.tsx:188` — badge `amber-500` `+Nmin`.
- **IA issues**:
  - `(authed)/k/[klubSlug]/extensions-pending/page.tsx:84-86` — copy passive voice
    ("Players solicitaram estender reservas").
- **Priority**: medium.

#### 29. `/k/[slug]/modalidades` — `(authed)/k/[klubSlug]/modalidades/page.tsx` (443 linhas)

- **Purpose**: Player solicita inscrição; admin aprova pendentes (tab).
- **Persona**: Ambos · **Tier**: Always-on · **Layout**: Grid + tab.
- **Components**: `Topbar`, `TabButton`, `ProfilesGrid`, `ProfileCard`,
  `PendingApprovalsTab`, `EnrollmentBadge`.
- **Nav entry**: dashboard ou sidebar Klubs > [slug] > Modalidades.
- **Visual issues**:
  - `(authed)/k/[klubSlug]/modalidades/page.tsx:173` — skeleton `h-35` (typo? padrão é h-36).
  - `(authed)/k/[klubSlug]/modalidades/page.tsx:277` — badge
    `bg-[hsl(var(--brand-accent-500)/0.14)] text-[hsl(38_92%_28%)]` (laranja hardcoded).
  - `(authed)/k/[klubSlug]/modalidades/page.tsx:282` — `text-[hsl(var(--brand-primary-600))]` (ok).
  - `(authed)/k/[klubSlug]/modalidades/page.tsx:300` — className complexa em badge.
- **IA issues**:
  - `(authed)/k/[klubSlug]/modalidades/page.tsx:184` — "O Klub ainda não habilitou
    modalidades" — copy boa, vocab consistente.
  - Reinventa Tabs (TabButton local) em vez de `<Tabs>` primitivo.
- **Priority**: medium.

#### 30. `/k/[slug]/reservar` — `(authed)/k/[klubSlug]/reservar/page.tsx` (857 linhas)

- **Purpose**: Wizard 3-step pra reservar quadra (mobile-first).
- **Persona**: Player · **Tier**: Always-on · **Layout**: Wizard.
- **Components**: back-link, `Stepper`, `Step1Quadra`, `Step2DataHorario`,
  `Step3Confirmar`, `SuccessView`, `SlotButton`, `DayChip`, `MatchTypePill`.
- **Nav entry**: dashboard CTA "Reservar quadra", sidebar card.
- **Visual issues**:
  - `(authed)/k/[klubSlug]/reservar/page.tsx:161` — back-link inline.
  - `(authed)/k/[klubSlug]/reservar/page.tsx:225` — sticky bar `md:left-64` hardcoded
    (acoplado a sidebar width).
  - `(authed)/k/[klubSlug]/reservar/page.tsx:633` — `text-[hsl(142_71%_32%)]` SuccessView icon.
  - `(authed)/k/[klubSlug]/reservar/page.tsx:697` — slot grid 3-4 cols (touch-friendly ✓).
  - `(authed)/k/[klubSlug]/reservar/page.tsx:768` — day-chip `text-[18px]`.
- **IA issues**:
  - `(authed)/k/[klubSlug]/reservar/page.tsx:336` — copy passive
    ("Sem horários configurados para essa data").
  - `(authed)/k/[klubSlug]/reservar/page.tsx:665` — success link usa slug em vez do nome.
- **Priority**: high.

#### 31. `/k/[slug]/solicitacoes` — `(authed)/k/[klubSlug]/solicitacoes/page.tsx` (423 linhas)

- **Purpose**: Admin queue — membros pedindo entrada (Klub privado); aprova/rejeita.
- **Persona**: Klub Admin / SPORTS_COMMITTEE · **Tier**: Always-on · **Layout**: List + tabs + modal.
- **Components**: back-link, `TabButton` local, `RequestCard`, `RejectModal`,
  `UserAvatar` (hue-based), `RequestBadge`, `Loader`.
- **Nav entry**: dashboard card "Solicitações".
- **Visual issues**:
  - `(authed)/k/[klubSlug]/solicitacoes/page.tsx:52` — back-link inline.
  - `(authed)/k/[klubSlug]/solicitacoes/page.tsx:93` — `hsl(142_71%_32%)` success alert.
  - `(authed)/k/[klubSlug]/solicitacoes/page.tsx:255` — botão approve com
    `bg-[hsl(142_71%_32%)] hover:bg-[hsl(142_71%_28%)]` hardcoded
    (use `bg-success`).
  - `(authed)/k/[klubSlug]/solicitacoes/page.tsx:324` — `RejectModal` inline com
    `fixed inset-0 z-50 bg-black/50` (use `<Modal>`).
  - `(authed)/k/[klubSlug]/solicitacoes/page.tsx:401` — badge approved
    `bg-[hsl(142_71%_32%/0.12)] text-[hsl(142_71%_32%)]`.
- **IA issues**:
  - `(authed)/k/[klubSlug]/solicitacoes/page.tsx:65-72` — header copy ternário longo.
  - Reinventa Tabs (TabButton local).
- **Priority**: high.

### 4.E — Klub configurar (9, todos PR-L3 thin shells)

Pages 32-40 são thin shells (9-19 linhas) delegando pra `_components.tsx`. Issues
moram em `_components.tsx` (1502 linhas). Listadas individualmente abaixo com
issues delegadas.

#### 32. `/k/[slug]/configurar` — page.tsx (9) → `IdentidadeTab` (`_components:63-141`)

- **Purpose**: Identidade do Klub (name, abbr, commonName, description, type).
- **Persona**: KLUB_OWNER/ADMIN · **Tier**: Always-on · **Layout**: Form-shell.
- **Visual issues** (delegated):
  - `_components.tsx:99` — `<input maxLength=100>` sem char counter visual.
  - `_components.tsx:115-121` — textarea description 2000 chars sem feedback visual.
  - `_components.tsx:129` — `<option value="sports_club">Clube esportivo / social</option>` (vocab "clube" em select).
- **Priority**: low.

#### 33. `/k/[slug]/configurar/contato` — page.tsx (9) → `ContatoTab` (`_components:232-273`)

- **Purpose**: Email/phone/website públicos do Klub.
- **Visual issues** (delegated): mínimos, layout simples.
- **Priority**: low.

#### 34. `/k/[slug]/configurar/equipe` — page.tsx (19) → `EquipeTab` (`_components:454-556`)

- **Purpose**: Roles (KLUB_ASSISTANT, SPORT_COMMISSION, SPORT_STAFF) +
  TransferAdmin.
- **Persona**: KLUB_ADMIN · **Layout**: Form + List.
- **Visual issues** (delegated):
  - `_components.tsx:583` — `window.confirm()` no TransferAdmin.
- **IA issues**:
  - Banner texto redundante ("Apenas KLUB_ADMIN/ASSISTANT/Platform-level acessam Equipe").
- **Priority**: low.

#### 35. `/k/[slug]/configurar/legal` — page.tsx (19) → `LegalTab` (`_components:304-369`)

- **Purpose**: Slug + CNPJ edits (Platform-level only).
- **Persona**: PLATFORM_ADMIN/OWNER · **Layout**: Form-shell.
- **Visual issues** (delegated): amber-warning section ok.
- **Priority**: low.

#### 36. `/k/[slug]/configurar/localizacao` — page.tsx (9) → `LocalizacaoTab` (`_components:144-230`)

- **Purpose**: CEP + endereço + grid 3-col.
- **Visual issues** (delegated): mínimos.
- **Priority**: low.

#### 37. `/k/[slug]/configurar/modalidades` — page.tsx (9) → `ModalidadesTab` (em `_components`)

- **Purpose**: Grid de sports com toggle on/off (botão disabled se já enabled).
- **Visual issues** (delegated): mínimos.
- **Priority**: low.

#### 38. `/k/[slug]/configurar/perigosa` — page.tsx (19) → `PerigosaTab` (`_components:371-427`)

- **Purpose**: Soft delete do Klub (deletedAt + status='suspended').
- **Persona**: PLATFORM · **Layout**: Form-shell.
- **Visual issues** (delegated):
  - `_components.tsx:377` — `window.prompt()` motivo.
  - `_components.tsx:379` — `window.confirm()` double-check.
  - Redirect 1500ms after deactivate; comentário explica behavior.
- **Priority**: high (destrutivo, UI nativa fragiliza UX).

#### 39. `/k/[slug]/configurar/quadras` — page.tsx (9) → `QuadrasTab` (`_components:942-1065`)

- **Purpose**: CRUD spaces — sport/surface/indoor/lighting/maxPlayers.
- **Visual issues** (delegated):
  - `_components.tsx:1280-1300+` — Modal custom (não shadcn/Dialog).
  - `_components.tsx:775` — `window.confirm()` em delete.
- **Priority**: medium.

#### 40. `/k/[slug]/configurar/visibilidade` — page.tsx (9) → `VisibilidadeTab` (`_components:276-301`)

- **Purpose**: Toggle discoverable + select accessMode (public|private).
- **Visual issues** (delegated): mínimos.
- **Priority**: low.

### 4.F — Sport-scoped (11)

#### 41. `/k/[slug]/sports/[code]/comissao` — `comissao/page.tsx` (197 linhas)

- **Purpose**: Listar staff/comissão do sport.
- **Persona**: Player (read) / Klub Admin (manage) · **Layout**: List grouped.
- **Components**: `<PageHeader>`, group cards.
- **Nav entry**: `sports/[code]/dashboard` card link.
- **Visual issues**:
  - `comissao/page.tsx:99,170` — `text-[10px]`/`text-[13.5px]` ad-hoc.
- **IA issues**: copy clara, group filtering ok.
- **Priority**: low.

#### 42. `/k/[slug]/sports/[code]/dashboard` — `dashboard/page.tsx` (109 linhas)

- **Purpose**: Hub do sport com 3 cards (Torneios/Rankings/Comissão).
- **Persona**: Ambos · **Layout**: Hub.
- **Components**: `<PageHeader>`, link cards.
- **Visual issues**: nenhum significante.
- **IA issues**: placeholder per PR-H3 (analytics futuras).
- **Priority**: low.

#### 43. `/k/[slug]/sports/[code]/enroll` — `enroll/page.tsx` (124 linhas)

- **Purpose**: Player solicita aprovação pra entrar no sport.
- **Persona**: Player (unenrolled) · **Layout**: Form.
- **Visual issues**:
  - `enroll/page.tsx:85` — `hsl(142_71%_32%)` success state (use `--success`).
- **Priority**: medium.

#### 44. `/k/[slug]/sports/[code]/rankings` — `rankings/page.tsx` (428 linhas)

- **Purpose**: Listar rankings + botão "Criar" (admin).
- **Persona**: Player (read) / Klub Admin (create) · **Layout**: List + Modal inline.
- **Components**: `<PageHeader>`, `CreateRankingModal` inline (208 linhas).
- **Visual issues**:
  - `rankings/page.tsx:172-176` — badges com `primary/15`/`muted` (semantic, ok).
  - `rankings/page.tsx:333` — `inputCls` constante boa (mas `rounded-[10px]`).
- **Priority**: low.

#### 45. `/k/[slug]/sports/[code]/rankings/[rankingId]` — `rankings/[rankingId]/page.tsx` (654 linhas)

- **Purpose**: Detalhe ranking + reportar match casual.
- **Persona**: Player / Klub Admin · **Layout**: Detail + `SubmitMatchModal`.
- **Components**: `<PageHeader>`, `WinnerOption` custom radio, `PlayerTable`,
  `SubmitMatchModal` (235 linhas).
- **Visual issues**:
  - `rankings/[rankingId]/page.tsx:550-552` — `formatNowLocal()` sem TZ awareness.
  - `rankings/[rankingId]/page.tsx:646` — `text-[hsl(142_71%_32%)]` rating delta positivo.
  - `rankings/[rankingId]/page.tsx:554` — `inputCls` reused (mesmos hardcoded).
- **Priority**: medium.

#### 46. `/k/[slug]/sports/[code]/torneios` — `torneios/page.tsx` (288 linhas)

- **Purpose**: Listar torneios agrupados (live/upcoming/past).
- **Persona**: Ambos · **Layout**: List grouped.
- **Components**: `<PageHeader>`, `TournamentCard`, `Trophy`/`Calendar` icons.
- **Visual issues**:
  - `torneios/page.tsx:214` — `animate-pulse` em live section (bom feedback).
  - `torneios/page.tsx:277` — `text-[10px]` status badge.
- **Priority**: low.

#### 47. `/k/[slug]/sports/[code]/torneios/novo` — `torneios/novo/page.tsx` (931 linhas) ⚠️

- **Purpose**: 7-step form pra criar torneio (categories, dates, format, points schema).
- **Persona**: Klub Admin / SPORT_COMMISSION · **Layout**: Form (long single-page).
- **Components**: `Section`, `Field`, `Toggle` custom, `CreatePointsSchemaModal` (175 linhas nested).
- **Visual issues**:
  - **NO STEP INDICATOR** — 7-step form sem progresso visual (cf. wizard de `/criar-klub`
    e `/reservar` que têm Stepper).
  - `torneios/novo/page.tsx:283,287,307,313,437,547,698-720,725-726,735-740,881` —
    múltiplas inconsistências de `text-[Npx]` e `rounded-[10px]`.
  - `torneios/novo/page.tsx:725` — `inputCls = '... text-[13.5px] rounded-[10px] ...'`.
  - **NO DRAFT SAVE** — submit ou perde tudo.
  - **NESTED MODAL** — `CreatePointsSchemaModal` (188 linhas) inline no form (deveria ser
    sub-rota ou popover menor).
  - **NO FIELD-LEVEL VALIDATION** — só erro top-level.
  - **NO TZ HANDLING** — `toIso()` em `:922` é `new Date().toISOString()` naive.
  - **NO CANCEL BUTTON** — só submit visível.
  - **DATE RANGE WEAK** — `registrationClosesAt` pode ser anterior a `registrationOpensAt`.
- **IA issues**:
  - **DEFAULT_POINT_TEMPLATE** (`:735-740`) com strings PT (champion/runnerUp) hardcoded.
  - Category editor (`:565-669`) grid 3-col cramped em mobile.
- **Priority**: **critical** (maior arquivo do app, várias UX gaps).

#### 48. `/k/[slug]/sports/[code]/torneios/[id]` — `torneios/[id]/page.tsx` (119 linhas, PR-L2)

- **Purpose**: Overview do torneio (datas + categorias + cancellation banner).
- **Persona**: Ambos · **Layout**: Detail-shell.
- **Components**: `useTournamentContext`, `<Banner>`, `DateCard` local, `formatDateInTz`.
- **Visual issues**:
  - `torneios/[id]/page.tsx:55,110` — `text-xs`/`text-sm` (tokens, ok!).
- **IA issues**: bem estruturado, TZ-aware.
- **Priority**: low.

#### 49. `/k/[slug]/sports/[code]/torneios/[id]/chave` — `chave/page.tsx` (69 linhas, PR-L2)

- **Purpose**: Bracket viewer (delega `BracketView` de `_components`).
- **Persona**: Ambos (read) / Klub Admin (edit) · **Layout**: Detail-shell.
- **Components**: `BracketView`, `useTournamentContext`.
- **Visual issues**: nenhum no shell.
- **Priority**: low.

#### 50. `/k/[slug]/sports/[code]/torneios/[id]/inscritos` — `inscritos/page.tsx` (69 linhas, PR-L2)

- **Purpose**: Lista entries + admin actions (delega `EntriesView`).
- **Persona**: Ambos (read) / Klub Admin (manage) · **Layout**: Detail-shell.
- **Components**: `EntriesView`, `useTournamentContext`.
- **Visual issues**: nenhum no shell.
- **Priority**: low.

#### 51. `/k/[slug]/sports/[code]/torneios/[id]/operacoes` — `operacoes/page.tsx` (24 linhas, PR-L2)

- **Purpose**: Admin actions — draw/schedule/edit/cancel (delega `OperacoesView`).
- **Persona**: Klub Admin · **Layout**: Detail-shell + permission gate.
- **Components**: `<Banner>` (gate), `OperacoesView`.
- **Visual issues**: nenhum no shell.
- **Priority**: low.

---

## 5. Mobile

**N/A**. O repositório não inclui app mobile. CLAUDE.md menciona Expo+RN como meta
("frontends consumidores (web + mobile)") mas não há código em `apps/`.

Quando o app mobile for criado, recomenda-se repetir esta auditoria com foco em:

- Paridade de menus com a sidebar web (mesmo set de rotas Player vs Klub Admin)
- Payload por superfície (web admin pode ser denso; mobile player precisa enxuto)
- Deep-links pra rotas do web que duplicam (notificações, convites, links de
  match-confirm)
- Tab bar nativo vs sidebar (não copiar 1:1; respeitar plataforma)

---

## 6. Lista priorizada de inconsistências

### 🔴 Alta prioridade

1. **Substituir `hsl(142 71% 32%)` por token `--success`** — usar
   `text-success`/`bg-success` (token já existe no `globals.css`):
   - `(authed)/criar-klub/sucesso/page.tsx:28`
   - `(authed)/k/[klubSlug]/dashboard/page.tsx:561,648`
   - `(authed)/k/[klubSlug]/extensions-pending/page.tsx:90`
   - `(authed)/k/[klubSlug]/reservar/page.tsx:633`
   - `(authed)/k/[klubSlug]/solicitacoes/page.tsx:93,255,401`
   - `(authed)/k/[klubSlug]/sports/[sportCode]/enroll/page.tsx:85`
   - `(authed)/k/[klubSlug]/sports/[sportCode]/rankings/[rankingId]/page.tsx:646`
   - `(authed)/minhas-reservas/page.tsx:136,450`

2. **Substituir modais inline (`fixed inset-0 z-50 bg-black/50`) pelo `<Modal>` primitivo**:
   - `(authed)/buscar-klubs/page.tsx:509-556` — `RequestMembershipModal`
   - `(authed)/minhas-reservas/page.tsx:386-419,694-721` — 3 modais
     (`CancelModal`/`AddPlayersModal`/`ExtendModal`)
   - `(authed)/k/[klubSlug]/solicitacoes/page.tsx:324` — `RejectModal`
   - `(authed)/admin/aprovacoes/[id]/page.tsx:408` — modal de rejeição

3. **Substituir `window.prompt()`/`window.confirm()` por `<Modal>` + form** (UI nativa fragiliza):
   - `(authed)/admin/aprovacoes/[id]/page.tsx:377-378`
   - `(authed)/admin/platform-admins/page.tsx:277`
   - `(authed)/k/[klubSlug]/extensions-pending/page.tsx:171`
   - `_components.tsx` configurar: `:377,379,583,775`

4. **Refatorar `torneios/novo/page.tsx` (931 linhas)** — adicionar Stepper visual,
   draft save (localStorage ou backend), extrair `CreatePointsSchemaModal` pra
   sub-rota ou popover, adicionar field-level validation, TZ awareness,
   cancel button, date-range cross-validation.

5. **Remover mock KPI hardcoded** — `(authed)/k/[klubSlug]/dashboard/page.tsx:90`
   `value: 'R$ 64,8'`. Substituir por dado real ou remover card até implementar.

6. **Refatorar `/buscar-klubs` (717 linhas)** — extrair `RequestMembershipModal`,
   simplificar geo state machine (5 estados → 3), substituir period buttons inline
   por `<RadioGroup>` primitivo (criar se ainda não existe), substituir back-link
   inline por `<PageHeader>`.

7. **Refatorar `/minhas-reservas` (790 linhas)** — extrair os 3 modais pra usar
   `<Modal>` primitivo, substituir `TabButton` local por `<Tabs>` primitivo,
   consolidar `StatusBadge` (cores ainda hardcoded).

### 🟡 Média prioridade

8. **Substituir `text-[Npx]` por tokens tipográficos** — focar nos forms públicos
   primeiro (mais visíveis): `/login`, `/criar-conta`, `/recuperar-senha`,
   `/quero-criar-klub`, `/convite/[klubSlug]`. Padrão sugerido (já mencionado em
   `SYSTEM.md`):
   - `text-[10-11px]` → `text-xs`
   - `text-[12-13px]` → `text-sm`
   - `text-[13.5-14px]` → `text-base`
   - `text-[15-16px]` → `text-md`
   - `text-[17-18px]` → `text-lg`
   - `text-[20-22px]` → `text-xl`
   - `text-[26-32px]` → `text-2xl` ou `font-display text-2xl`
   - **Eliminar `text-[10.5px]`, `text-[11.5px]`, `text-[13.5px]`, `text-[14.5px]`**
     (sizes "feios" sem token).

9. **Substituir `rounded-[10px]` por `rounded-md` ou `rounded-[var(--radius)]`**
   nos forms públicos e nos `inputCls` constants.

10. **Substituir back-links inline por `<PageHeader back={...}>`**:
    - `(authed)/buscar-klubs/page.tsx:156-161`
    - `(authed)/minhas-reservas/page.tsx`
    - `(authed)/notificacoes/page.tsx:55-61`
    - `(authed)/k/[klubSlug]/extensions-pending/page.tsx:66-72`
    - `(authed)/k/[klubSlug]/reservar/page.tsx:161`
    - `(authed)/k/[klubSlug]/solicitacoes/page.tsx:52`
    - Forms públicos: `/recuperar-senha`, `/quero-criar-klub`, `/convite/[klubSlug]`.

11. **Padronizar vocab "Klub" vs "clube"** — auditoria encontrou 5 ocorrências
    de "clube"/"clubes" em copy:
    - `app/login/page.tsx:84` — "vida do clube"
    - `app/criar-conta/page.tsx:77` — "vida do clube"
    - `(authed)/home/page.tsx:172` — "Sou dono de um clube e quero saber mais"
    - `_components.tsx criar-klub:30` — "Clube esportivo" (label de option em select)
    - `_components.tsx configurar:129` — "Clube esportivo / social" (idem)
    Decisão sugerida: **"Klub" no copy de marca**, **"clube esportivo" como label
    descritivo do tipo de entidade** (manter os 2 últimos como estão; corrigir os 3
    primeiros).

12. **Substituir `TabButton` local por `<Tabs>` primitivo**:
    - `(authed)/admin/aprovacoes/page.tsx`
    - `(authed)/k/[klubSlug]/modalidades/page.tsx`
    - `(authed)/k/[klubSlug]/solicitacoes/page.tsx`
    - `(authed)/minhas-reservas/page.tsx`

13. **Substituir banners ad-hoc (`border-destructive/30 bg-destructive/5`) por
    `<Banner tone="error">`** — 21 arquivos atingidos (lista completa via grep).

### 🟢 Baixa prioridade

14. **Empty states ad-hoc** (`(authed)/klubs/page.tsx:79-81`) → `<EmptyState>`.

15. **`accent-primary` em range inputs** (`buscar-klubs:252`) — padronizar via classe.

16. **Hardcoded quotas** (`PLATFORM_ADMIN_QUOTA = 3` em
    `(authed)/admin/platform-admins/page.tsx:34`) — mover pra config server-side
    (parte da migração pra `features` table).

17. **Char counters faltando** — `<input maxLength=...>` e `<textarea maxLength=...>`
    sem feedback visual em `_components configurar:99,115-121`.

18. **Toast sem auto-dismiss** — `(authed)/admin/platform-admins/page.tsx:210`.

19. **Disabled button sem explanation visual** — `(authed)/notificacoes/page.tsx:228-235`.

20. **`Suspense fallback={null}`** — `(authed)/criar-klub/sucesso/page.tsx` (loading invisível).

---

## 7. Achados críticos — Pricing & Feature gating

### Status atual

- **`Klub.plan`** no banco (Trial/Starter/Pro/Elite/Enterprise) é a fonte única de
  tier (`apps/api/prisma/schema.prisma:226-228`).
- **Limites estáticos**: `Klub.maxMembers` (default 50), `Klub.maxSports` (default 2),
  `Klub.maxCourts` (default 3) — usados como gate operacional.
- **`Klub.maxMembers`/`maxSports`/`maxCourts`** referenciados no frontend
  apenas em DTO (`apps/web/src/lib/api/klubs.ts:103-105`) — **nenhum gate visual
  implementado** nas 51 páginas.
- **`usePersona()`** em
  `apps/web/src/components/dashboard/persona-switcher.tsx` é
  **dev-only** (3 personas: `player_free`/`player_premium`/`klub_admin`) pra
  preview local. Não há `useFeature()` real.
- **Tagline "Onde o Klub acontece."** está em `apps/web/src/app/layout.tsx:28,38`,
  `apps/web/src/app/login/page.tsx:17` (comentário), `apps/web/public/manifest.json:4`,
  `apps/web/README.md:5`.

### Hardcodings no código

- **0 ocorrências** de "R$ 9,90" / "9.90" / "9,90" em `.tsx`/`.ts` ✅
- **1 mock**: `(authed)/k/[klubSlug]/dashboard/page.tsx:90` traz
  `value: 'R$ 64,8'` como KPI placeholder. Remover antes de production.
- Preços do plano B2B (Klub Starter R$99 / Pro R$299 / Elite R$699) só em
  `docs/adr/0008-modelo-comercial.md:20-22` (decisão arquitetural, não código).
- Preço do plano B2C Premium (R$9,90) só em `docs/briefings/dia-11-onda-1.md:33` e
  `docs/adr/0008-modelo-comercial.md:30`.

### 🔴 Recomendação destacada — fechar gap antes de seguir refatorando

**Antes de prosseguir refatorando páginas restantes**, recomenda-se sprint dedicada pra:

1. **Criar tabela `features`** no schema Prisma (`apps/api/prisma/schema.prisma`):
   - Colunas: `id` (string PK), `tier` (enum: free/premium/admin/owner), `enabled` (bool),
     `rolloutPercentage` (int 0-100), `description` (string), `createdAt`/`updatedAt`.
   - Seed inicial com features atuais (mesmo que todas habilitadas) — ex:
     `home.dashboard`, `bookings.add_players`, `tournaments.create`,
     `rankings.report_casual`, `admin.platform_admins`.

2. **Criar endpoint `GET /me/features`** que retorna o array de features ativas
   pro user atual (cruza tier do user + rollout%).

3. **Criar hook `useFeature(id: string): boolean`** em
   `apps/web/src/hooks/use-feature.ts` que consome o endpoint via SWR/React Query e
   cacheia.

4. **Migrar usos atuais que poderiam ser features**: `PLATFORM_ADMIN_QUOTA = 3`
   (`(authed)/admin/platform-admins/page.tsx:34`), `discoverable` toggle,
   `accessMode` (public|private), KPIs de receita futuros.

5. **Documentar em `apps/web/src/components/ui/SYSTEM.md`** o padrão `useFeature(id)`
   pra adoção consistente em features novas.

Sem isso, qualquer feature visual nova (badges Premium, gates, A/B testing) vai
nascer com flag hardcoded — exatamente o anti-pattern que a auditoria flagou
preventivamente.

---

## 8. Recomendações iniciais

### Tokens — usar e expandir o que já existe

`apps/web/src/components/ui/SYSTEM.md` (PR-L1) já documenta tipografia, spacing e
container widths. Recomendações marginais:

- **Tipografia** — adicionar `text-[14px]` como `text-md` (gap entre `text-base`
  e `text-lg`). Eliminar sizes "feios" (`text-[10.5px]` etc) — substituir pela
  classe próxima.
- **Cores semânticas** — `--success` e `--warning` já existem; criar sub-tokens
  pra hover states (`--success-hover`, `--warning-hover`) pra eliminar
  `hover:bg-[hsl(142_71%_28%)]` hardcoded em `solicitacoes:255`.
- **Spacing** — checar consistência das 3 padding scales em headers de página
  (alguns usam `py-3.5`, outros `py-4`, outros `py-6`).
- **Container widths** — 3 sizes definidos no SYSTEM.md são suficientes; checar
  conformance.

### Componentes a consolidar

| Atual | Substituir por | Páginas afetadas |
|---|---|---|
| `TabButton` local | `<Tabs>` primitivo | aprovacoes, modalidades, solicitacoes, minhas-reservas |
| Modal inline `fixed inset-0` | `<Modal>` primitivo | buscar-klubs, minhas-reservas (3×), solicitacoes, aprovacoes/[id] |
| `window.prompt()`/`confirm()` | `<Modal>` + `<form>` | aprovacoes/[id], extensions-pending, _components configurar (3×), platform-admins |
| Banner inline `border-destructive/30 bg-destructive/5` | `<Banner tone="error">` | 21 arquivos (ver grep) |
| Empty state inline | `<EmptyState>` | klubs, modalidades, etc. |
| Back-link `<Link><ArrowLeft/>+texto</Link>` | `<PageHeader back={...}>` | 8 páginas (ver lista 🟡) |
| Form `<label>+<input>` inline | `<FormField>+<Input>` | recuperar-senha, quero-criar-klub, convite, login, criar-conta, _components configurar |
| `inputCls` constante hardcoded | `<Input>` primitivo | torneios/novo, rankings/[id], rankings (e os forms públicos) |
| Buttons inline `bg-primary` | `<Button variant="default">` | criar-klub (back/next/submit), klubs (CTAs), buscar-klubs, etc. |

### Vocabulário canônico (sugestão de glossário)

- **Klub** (sempre capitalized) — entidade do produto. Usar em copy de marca.
- **clube esportivo** (lowercase) — descritivo do tipo de entidade (label de
  select). Aceitável em opções de tipo.
- **Reserva** — booking de quadra (não usar "agendamento").
- **Torneio** — competição estruturada (não usar "campeonato").
- **Match** / **Partida** — evento de jogo (preferir "Match" em código,
  "Partida" em copy user-facing? — decidir antes de propagar).
- **Rating** — pontuação Elo do player (não traduzir).
- **Inscrição** — entry de torneio. **Cadastro** — registro de Klub na plataforma
  (em /admin/aprovacoes/cadastros). Manter distintos.
- **Sócio** vs **Membro** vs **Player** — escolher um padrão por superfície:
  copy player-facing usa "Player" (aceitar inglês como brand); copy admin pode
  usar "membro" ou "sócio" conforme contexto.

---

**Fim do relatório**.
