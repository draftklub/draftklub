# ADR 0023 — Sprint N Deferrals (BullMQ + API Versioning)

**Status:** Accepted
**Data:** 2026-04-29

## Contexto

A auditoria de 8 agentes (29/04/2026) identificou ~80 itens distribuídos
em 4 sprints (M/N/O/P). Sprint M e Sprint N foram executados quase
completamente — ~50 itens entregues, ~30 deferidos. Este ADR documenta
**dois itens explicitamente deferidos** durante o closeout de Sprint N
porque excedem o escopo de "batch" (refactor estrutural com riscos
operacionais).

Os outros pendentes de Sprint N (ETag em listas paginadas, createZodDto
extensão pros DTOs restantes, output presenters incrementais) seguem o
padrão "incremental — toca quando pisar no caller", e não precisam de
ADR próprio.

## Itens deferidos

### 1. BullMQ / Cloud Tasks pra jobs longos

**Contexto:** Hoje, recompute de ranking, draw de 128 players, e
recalculo de tournament_points rodam dentro do request-response do
Nest. Pra rankings/torneios pequenos isto é OK (P95 < 1s). Conforme a
base cresce, aparecem dois problemas:

- Request fica lento (P95 > 5s pra ranking de 1000+ players)
- Cloud Run timeout default (60s) começa a ficar perigoso pra
  torneios com 128+ players + cálculo de seeds + alocação de quadras
- Sem queue, retries em falhas parciais não existem (uma exception no
  meio do recompute deixa estado inconsistente)

**Decisão:** Deferido pra Sprint O ou posterior. Quando entrar:

- **Provider:** BullMQ + Redis. Razão: já temos Cloud Memorystore
  disponível via Terraform; BullMQ é o padrão de mercado e tem boa
  observabilidade (UI dashboard, retries, DLQ). Cloud Tasks foi
  considerado mas exige HTTP push handler dedicado por job — overhead
  maior pro nosso caso.
- **Jobs candidatos (priorizado):**
  1. `RecomputeRankingJob` — disparado por `submit-match.handler`
     hoje síncrono. Async com debounce de 30s (várias submissions
     batch num único job).
  2. `DrawTournamentJob` — disparado por `start-tournament-draw.handler`.
     Inclui alocação de seed + cálculo de bracket + alocação inicial
     de quadras.
  3. `ApplyTournamentPointsJob` — disparado quando torneio finaliza.
     Aplica pontos pra todos os players + recompute ranking afetado.
- **Padrão:** Job grava resultado em `JobRun` table (status, startedAt,
  finishedAt, error?). Front polla `/jobs/:id` durante UI loading. Mobile
  recebe push notification "Sorteio do torneio X concluído".
- **Não-objetivo:** Não vamos migrar tudo. Hooks como
  `mark-booking-completed.handler` continuam sync — duração trivial,
  sem benefício de queue.

**Trade-off aceito:** Manter sync até dor real. Cloud Run cold-start

- in-process já cobre o uso atual sem queue.

### 2. API versioning (`/v1`)

**Contexto:** API hoje serve em `/<resource>` direto (sem prefixo de
versão). Quando precisar quebrar contrato (rename de field, mudança de
shape, remoção de endpoint), não há mecanismo de coexistência —
clients antigos quebram.

**Decisão:** Deferido. Razão técnica:

- Mobile ainda **não foi shipado em loja** (Sprint P). Web
  controlamos atomicamente (deploy junto com API). Sem clients legacy
  no mundo, versionamento agora é overhead sem benefício.
- Quando mobile entrar em produção, vamos precisar:
  - Prefixar tudo com `/v1` (`URI` versioning, padrão Stripe/GitHub)
  - Setup de strangler fig: `/v2` com mudanças, `/v1` permanece até X meses
  - Deprecation header (`Sunset: <date>`) automatizado

**Quando entrar:** Junto com a primeira release de mobile pública.
Antes disso, não. Vamos pinning major version no Capacitor `appVersion`

- rejeitar requests com major < N (server-side gate, sem precisar
  versionar URL).

**Trade-off aceito:** Quebra de contrato hoje exige deploy
coordenado de api+web no mesmo PR. Não é problema enquanto não houver
mobile em loja. Versionamento é dívida técnica intencional pra evitar
prematuração.

## Consequências

### Positivas

- Sprint N fechado sem expandir escopo pra refactors estruturais
  (queue infra + URL prefix são trabalhos de setup que precisam dia
  inteiro cada)
- Decisões documentadas — próxima auditoria automática (27/05/2026)
  não vai re-questionar como "esquecimento"
- Trade-offs explícitos: alguém vendo o código entende _por quê_ não
  está lá

### Negativas

- Rankings com 1000+ players já podem ter latência alta. Mitigação:
  N-16 já fez DB-side keyset (response payload constante); o fetch
  ainda full-scan ranking entries pra cálculos.
- Quando mobile shipar, vamos ter um momento de "rip-and-replace"
  pra adicionar `/v1` em todos endpoints + clients. Mitigado se
  fizer junto com primeira RC pública.

## Re-avaliação

Re-auditoria agendada pra **27/05/2026 9:37**. Os dois itens devem
voltar à mesa nesse momento. Se um deles ficar urgente antes
(ex.: timeout 504 em produção pelo recompute), promovemos pra
sprint próprio.
