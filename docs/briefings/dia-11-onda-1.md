# BRIEFING — DraftKlub Onda 1
## Integração + Layer Zero

**Versão:** 1.0
**Data:** 26 abril 2026
**Audiência:** Claude Code (VS Code)
**Branch sugerido:** `feat/onda-1-integration-layer-zero`

---

## 1. Contexto rápido

DraftKlub é uma plataforma SaaS multi-tenant para clubes brasileiros de esportes de raquete (tennis, padel, squash, beach tênis). Tagline: **"Onde o Klub acontece."**

**Modelo de negócio:** Freemium B2C. Player free tem o produto operacional completo (reservas, torneios, ranking, agenda — sem limites). Premium adiciona inteligência (insights avançados, matchmaking IA, reserva recorrente, notificações smart). Klub Admin é sempre full, sem freemium.

**Tenancy:** Modelo B — Player pode pertencer a N Klubs simultaneamente (N:N via Membership). "Klub ativo" é determinado pela URL (`/k/:slug/...`), sem state global no servidor.

---

## 2. Decisões já fechadas

| Tópico | Decisão |
|---|---|
| Tagline | "Onde o Klub acontece." |
| Logo canônica | Opção 10 (chevron + gradient verde) — PNG já em `apps/web/public/icon-{192,512}.png` + dark variants |
| Paleta | Verde `#0E7C66` primary, terracota `#DC4F2F` accent, âmbar `#F59E0B` (hour bands prime time + tier premium) |
| Fonts | Inter (UI), Geist (display ≥32px), JetBrains Mono (números/IDs) |
| Tenancy | Multi-Klub (Player em N Klubs) |
| Klub ativo | URL-based: `/k/:slug/...` |
| Onboarding de Klub | Híbrido: self-service em `/criar-klub` + sales-led em `/quero-criar-klub` |
| Pricing | Slot dinâmico via API (NÃO hardcode); placeholder atual R$9,90/mês |
| Feature gating | Tabela `features` no banco com tier (free/premium/disabled), hook `useFeature(id)`, guard idêntico no backend |

---

## 3. O que JÁ existe (NÃO recriar)

### Backend (`apps/api`) — completo o suficiente pra Onda 1
- 32 controllers, 72 endpoints, 24 models, 256 testes verdes
- Auth via Firebase Admin SDK + sync de User no DB no primeiro request
- PolicyEngine + PolicyGuard com escopo de Klub aplicado
- Roles: `SUPER_ADMIN`, `KLUB_ADMIN`, `SPORTS_COMMITTEE`, `STAFF`, `TEACHER`, `PLAYER`
- Endpoints relevantes pra Onda 1:
  - `GET /me` (User atual + roleAssignments)
  - `GET /klubs`, `GET /klubs/:id`, `GET /klubs/slug/:slug`
  - `POST /klubs` (cria Klub)
  - `POST /klubs/:id/members` (adiciona Membership + RoleAssignment atomic)
  - `POST /klub-requests` (intake sales-led)
  - `GET /sports`, `POST /klubs/:klubId/sports/:code`
  - Enrollments: `POST /klubs/:klubId/sports/:sportCode/enrollments`, `PATCH /enrollments/:id/{approve|reject|suspend|reactivate}`
- Cloud Run em produção (`southamerica-east1`)

### Frontend (`apps/web`) — scaffold inicial
- Next.js 15 App Router + React 19 + Tailwind 4 + TypeScript 5.9
- Tokens DraftKlub aplicados em `globals.css`
- Logo canônica em `public/` com auto-swap dark mode
- **Login funcional** com `auth-stub` placeholder em `src/lib/auth-stub.ts`
- **Dashboard scaffold** (Klub Admin) com dados hardcoded ("Klub Carioca de Tênis")
- Componentes existentes: `brand/{brand-mark,brand-lockup,court-pattern}`, `dashboard/{sidebar,topbar}`, `login/login-form`, `theme-provider`, `ui/{button,input,label,card}`
- Build/lint/typecheck verdes

### Tooling
- pnpm 10.6.5 + Turborepo 2.9
- Cloud Build CI/CD pro `apps/api` (sem step pro `apps/web` ainda)
- GitHub Actions com lint+typecheck+test

---

## 4. Escopo Onda 1 — em ordem de execução

### Fase A — Integração viva (sem isso, nada conecta)

**A.1 — CORS no `apps/api`**
- Habilitar `app.enableCors(...)` no `main.ts`
- Origens: `http://localhost:3001` (dev), `https://draftklub.com`, `https://www.draftklub.com`, `https://staging.draftklub.com`
- `credentials: true`
- Configurável via env var `CORS_ORIGINS` (CSV)

**A.2 — Firebase Auth real no `apps/web`**
- Substituir `apps/web/src/lib/auth-stub.ts` mantendo a interface (`loginWithEmail`, `loginWithGoogle`, `logout`, `onAuthStateChanged`, `getIdToken`)
- Init em `apps/web/src/lib/firebase.ts` usando env vars `NEXT_PUBLIC_FIREBASE_*`
- Guard de rota: redirect pra `/login` se não autenticado em rotas protegidas

**A.3 — Cliente API tipado em `apps/web`**
- `apps/web/src/lib/api/client.ts` — fetch wrapper com bearer token automático (puxa do Firebase)
- `apps/web/src/lib/api/{me,klubs,memberships,enrollments,sports}.ts` — funções tipadas por recurso
- Tipos importados de `@draftklub/shared-types`

**A.4 — Popular `@draftklub/shared-types`**
- Hoje é placeholder. Adicionar response shapes derivadas do schema Prisma do api.
- Mínimo pra Onda 1: `User`, `Klub`, `KlubConfig`, `KlubSportProfile`, `Membership`, `RoleAssignment`, `MeResponse`, `SportCatalog`, `PlayerSportEnrollment`
- Importar em apps/api e apps/web — fonte de verdade compartilhada
- TypeScript puro (não classes), sem leak de Prisma internals

**A.5 — Active Klub via URL**
- Hook `useActiveKlub()` que lê `params.klubSlug` da URL
- Layout `apps/web/src/app/k/[klubSlug]/layout.tsx` que valida membership do user e redireciona pra `/sem-acesso` se não tiver
- Helper `requireMembership(klubSlug)` server-side via `GET /klubs/slug/:slug` + verificação de membership em `/me`

### Fase B — Layer Zero UI

**B.1 — Pós-login router**
- Após login bem-sucedido, chamar `GET /me`
- Lógica:
  - 0 memberships → redirect `/criar-klub`
  - 1 membership → redirect `/k/:slug/dashboard`
  - N memberships → redirect `/escolher-klub`
- Persistir último Klub visitado em cookie pra UX boa em retornos

**B.2 — Klub picker (duas variantes)**
- **Full-page** em `/escolher-klub`: grid de cards com nome, slug, logo (placeholder se sem media), role do user no Klub, modalidades ativas. Click → `/k/:slug/dashboard`
- **Switcher inline** na topbar do `/k/:slug/...`: dropdown compacto tipo Slack workspace switcher, lista de Klubs do user + "Mudar de Klub" → vai pra `/escolher-klub`
- Estados: loading skeleton, erro de fetch (raro, mostrar retry)

**B.3 — Self-service Klub creation: `/criar-klub`**
- Formulário em 3 etapas (steps inline numa mesma página, não wizard com URLs separadas):
  1. **Sobre o Klub:** nome, slug (auto-gerado do nome via slugify, editável, validar uniqueness antes de submeter próxima etapa), tipo (`sports_club` / `condo` / `school` / `public_space` / `academy` / `individual`), plano (default `trial`)
  2. **Modalidades iniciais:** multi-select de `SportCatalog` (busca em `GET /sports`). Mínimo 1.
  3. **Confirmar:** preview do Klub + botão "Criar Klub"
- Submit:
  - `POST /klubs` cria o Klub
  - **VERIFICAR:** se backend cria automaticamente Membership + RoleAssignment KLUB_ADMIN pro user que criou. Se NÃO, fazer chamadas coordenadas.
  - Pra cada modalidade selecionada: `POST /klubs/:klubId/sports/:code`
  - Redirect pra `/k/:slug/dashboard`
- NÃO escopar nesta fase: KlubMedia upload, KlubConfig avançado (defaults razoáveis), KlubSportInterest

**B.4 — Sales-led intake: `/quero-criar-klub`**
- Página pública (fora do guard de auth, acessível em `draftklub.com/quero-criar-klub`)
- Formulário simples: nome do contato, email, telefone (opcional), nome do clube proposto, número aproximado de quadras, mensagem livre
- Submit: `POST /klub-requests`
- Página de confirmação: "Recebemos seu pedido. Vamos entrar em contato em até 2 dias úteis."
- Tom: convidativo, comunidade. Layout simples, mobile-first.

**B.5 — Aceite de convite: `/convite/:token`**
- Página pública (não exige login pré-existente)
- Fluxo:
  - Backend resolve token → retorna Klub + email convidado + role oferecida
  - Se user não está logado: form de signup/login com email pre-preenchido → após auth, aceita convite → redirect `/k/:slug/dashboard`
  - Se user já está logado com email diferente: avisar "Esse convite é pra outro email" + oferecer logout + retry
- **GAP DE BACKEND PROVÁVEL:** o `POST /klubs/:id/members` atual exige user existente. Pra fluxo de convite com link, pode precisar de endpoint novo `POST /klubs/:id/invitations` + `POST /invitations/:token/accept`. **VERIFICAR primeiro; se não existir, propor opção pragmática nesta Onda:** Klub Admin gera link copiável `/criar-conta?invite=:klubSlug` que captura o email no signup e chama `/klubs/:id/members` no backend após criação do user.

**B.6 — Inscrição em modalidade: `/k/:slug/modalidades`**
- Lista todas as `KlubSportProfile` do Klub (de `GET /klubs/:id/sports`)
- Pra cada uma:
  - Status do user atual: não inscrito / pending / active / suspended
  - CTA contextual: "Solicitar inscrição" → `POST /klubs/:klubId/sports/:sportCode/enrollments` ou "Aguardando aprovação" (disabled) ou "Inscrito ✓" (sem ação)
- View adicional pra Sports Committee/Klub Admin: tab "Aprovar pendentes" com lista de pending enrollments + botões approve/reject

### Fase C — Refator do Dashboard atual

**C.1 — Mover Dashboard pra rota Klub-scoped**
- De `/dashboard` → `/k/:slug/dashboard`
- Mover layout `apps/web/src/app/dashboard/layout.tsx` pra `apps/web/src/app/k/[klubSlug]/(dashboard)/layout.tsx` ou estrutura equivalente
- Redirect `/dashboard` → resolução via `/post-login` logic

**C.2 — Plugar dados reais**
- Tirar "Klub Carioca de Tênis" hardcoded — usar `useActiveKlub().name`
- KPIs: criar agregação client-side a partir de `GET /klubs/:klubId/bookings`, `GET /klubs/:klubId/calendar`, `GET /klubs/:klubId/sports/:sport/enrollments` enquanto endpoint dedicado não existe (`GET /klubs/:id/dashboard-stats` é candidato natural pra Onda 2 se a agregação client-side ficar pesada)
- Feed "Atividade recente": usar `GET /klubs/:klubId/bookings` recentes
- "Próximos torneios": iterar nas `KlubSportProfile` ativas + `GET /klubs/:klubId/sports/:sport/tournaments` filtrado por status `in_progress` ou `prequalifying`

**C.3 — Persona switcher (dev-only)**
- Em ambiente dev (`process.env.NODE_ENV === 'development'`), botão flutuante pra alternar visualização Player Free / Player Premium / Klub Admin
- Em produção, persona é determinada pelos roleAssignments reais do user

---

## 5. Decisões de UI delegadas ao Claude Code

Onde a gente NÃO desenhou explicitamente, decidir com bom senso seguindo:

- **Visual:** continuar a linguagem do Login + Dashboard atuais. NÃO introduzir novos primitives sem necessidade.
- **Tokens:** usar exclusivamente as CSS vars do `globals.css`. Não introduzir cores hardcoded.
- **Layouts não cobertos** (criar Klub, picker, intake, convite, modalidades): aplicar o design system existente — verde primary nos CTAs principais, neutros stone, cards com `--shadow-sm`, border-radius do design system.
- **Mobile:** stack vertical full-width, padding consistente com Dashboard.
- **Dark mode:** sempre testar; logo já faz auto-swap via filename.
- **Microcopy em PT-BR brasileiro:** direto, comunidade como protagonista. "Bora", "Klub" sempre com K, sem jargão corporativo. Premium é convite, não pressão.
- **Empty states:** ilustração leve (ou nenhuma) + headline curta + CTA único.
- **Loading:** skeleton consistente com o que o Dashboard atual usa.
- **Erros:** inline próximo ao campo (não toast); pra erros de rede, banner discreto no topo do form.

---

## 6. Critérios de aceite Onda 1

- [ ] User cria conta nova via Firebase Auth → cai em `/criar-klub` → cria Klub → vai pro Dashboard com nome real do Klub
- [ ] User existente com 1 membership → login → vai direto pro Dashboard correto
- [ ] User com N memberships → login → escolhe Klub no picker → vai pro Dashboard daquele Klub
- [ ] User troca de Klub no switcher inline → URL muda + dados atualizam sem flash
- [ ] Sales lead em `/quero-criar-klub` → submit funciona → registro aparece no banco via `klub_requests`
- [ ] Klub Admin vê tab de pending enrollments em `/k/:slug/modalidades` → aprova → Player vê status mudar
- [ ] CORS funcional em dev (localhost:3001 ↔ localhost:3000) e produção
- [ ] Build, typecheck, lint verdes em apps/web
- [ ] `@draftklub/shared-types` populado e importado em ambos os apps
- [ ] Deploy do `apps/web` rodando (Cloud Run preferencial pra consolidar GCP; Vercel ok como rota rápida pra preview)
- [ ] DNS apontando: pelo menos `staging.draftklub.com` ou `app.draftklub.com` mapeado

---

## 7. Fora do escopo desta Onda

- Calendar (Onda 2)
- Booking creation flow (Onda 2)
- Tournament screens (Onda 2)
- Rankings screens (Onda 2)
- Tabela `features` + hook `useFeature` (Onda 2 — antes do feature gating real ser necessário)
- Tabela `pricing_plans` + hook `usePricing` (Onda 2)
- Painel admin de configuração de features (Onda 3)
- Configuração avançada de Klub (KlubConfig editor) — Onda 3
- Espaços/quadras CRUD pelo Klub Admin — Onda 3
- Member invite via email transacional com mailer — pode ficar com link copiável manualmente nesta Onda se Resend não estiver plumb
- Domain mapping de `draftklub.com.br` → `draftklub.com` (DNS task separado, fazer só após app em produção)
- Mobile app nativo

---

## 8. Pontos de atenção a verificar ANTES de codar

Investigar primeiro, codar depois. Cada item é uma pergunta a responder lendo o `apps/api`:

1. **`POST /klubs` cria Membership + RoleAssignment automaticamente pro criador?**
   Olhar handler. Se sim: 1 chamada; se não: 3 chamadas coordenadas em transação (ou refatorar handler).

2. **Existe endpoint de invitation com token?**
   Grep por `invitation`, `invite`, `token` em `apps/api/src/modules/identity` e `apps/api/src/modules/klub`. Se não existir, propor approach simplificado (ver B.5).

3. **Resend está plumb pra envio transacional?**
   Verificar se há módulo de mailer/notifications no `apps/api`. Se sim, qual provider, quais templates já existem. Se não, pode ficar com link copiável nesta Onda.

4. **Slug uniqueness validado no backend?**
   Verificar handler de `POST /klubs`. Se não há validação, propor adicionar (e expor erro tipado pro frontend mostrar).

5. **Endpoint pra listar memberships do user atual?**
   `GET /me` retorna roleAssignments mas não Memberships. Verificar se há algo tipo `GET /me/klubs` ou se precisa derivar de roleAssignments. Critério: pro picker funcionar com nome+slug+role, qual endpoint serve melhor?

---

## 9. Sugestão de PRs (escopo focado)

| PR | Escopo | Estimativa |
|---|---|---|
| 1 | Fase A.1 (CORS) + A.4 (shared-types base) | 2-3h |
| 2 | Fase A.2 (Firebase Auth real) + A.3 (API client) | 3-4h |
| 3 | Fase A.5 (active Klub via URL) + Fase C.1 (move dashboard) | 2-3h |
| 4 | Fase B.3 (criar Klub) | 4-6h |
| 5 | Fase B.1 + B.2 (post-login + picker) | 3-4h |
| 6 | Fase B.4 (sales-led intake) | 1-2h |
| 7 | Fase B.6 (inscrição modalidade) | 3-4h |
| 8 | Fase B.5 (aceite de convite — depende de gap analysis) | 3-6h |
| 9 | Fase C.2 (Dashboard com dados reais) + C.3 (persona switcher) | 3-4h |
| 10 | Deploy `apps/web` no Cloud Run + DNS staging | 2-3h |

Total estimado: 26-39h de trabalho do Claude Code, dependendo de quanto investigação revela.
