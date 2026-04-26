# DraftKlub — Pacote de Partida Frontend

> Pacote completo pra você levar pro Claude Design + briefing técnico inicial.
> Estrutura: 3 partes sequenciais.
>
> 1. **Identidade visual de partida** — paleta, tipografia, tom (input pro Claude Design)
> 2. **7 prompts específicos por tela** — copiar/colar no Claude Design
> 3. **BRIEFING_DIA11_FRONTEND.md inicial** — assumptions razoáveis pra Claude Code

---

# PARTE 1 — Identidade Visual de Partida

## 1.1 Conceito de marca

### Tom de voz visual
DraftKlub deve transmitir **profissionalismo esportivo brasileiro**. Não é Wimbledon (frio, britânico). Não é academia popular (descontraído demais). É o **clube de tênis carioca de classe média alta** — tradicional mas moderno, sério mas vibrante.

Atributos:
- **Confiável**: Klub Admin de 60 anos precisa ver e sentir "aqui é sério"
- **Vibrante**: Player de 30 anos precisa achar bonito e querer abrir
- **Direto**: Staff que opera no balcão precisa de UI sem fricção
- **Brasileiro**: cor + tipografia com personalidade nossa, sem ser caricatural

### Inspirações de referência (pra mostrar ao Claude Design)
- **Linear**: minimalismo + tokens de design rigorosos
- **Notion**: legibilidade + hierarquia visual clara
- **Strava**: vibração esportiva sem perder profissionalismo
- **Figma comunidade brasileira**: várias plataformas SaaS BR têm palette em teal/coral que funciona bem

## 1.2 Paleta de cores sugerida

### Tema claro (light)
```
Primary       #0E7C66 (verde profundo, lembra grama de tênis + Brasil)
Primary-soft  #14A085 (variante mais clara pra hover/active)
Secondary     #DC4F2F (laranja terracota, calor brasileiro, alerta visual)
Accent        #F59E0B (âmbar, pra destaques sutis tipo "prime time")

Background    #FAFAF9 (off-white, mais quente que branco puro)
Surface       #FFFFFF (cards, modais)
Surface-2     #F4F4F2 (variant pra distinção sutil)

Text          #18181B (quase preto, alta legibilidade)
Text-muted    #71717A (cinza médio, para secundário)
Text-subtle   #A1A1AA (cinza claro, para terciário)

Border        #E4E4E7 (cinza muito claro)
Border-strong #D4D4D8 (mais visível em focus)

Success       #16A34A (verde alegre)
Warning       #F59E0B (mesmo accent, pra consistência)
Danger        #DC2626 (vermelho controlado)
Info          #0EA5E9 (ciano informativo)
```

### Tema escuro (dark)
```
Primary       #14B89A (mais saturado pra contraste em dark)
Primary-soft  #1ED9B0
Secondary     #F26B47
Accent        #FBBF24

Background    #0A0A0A (preto suave, não black-on-OLED)
Surface       #18181B
Surface-2     #27272A

Text          #FAFAFA
Text-muted    #A1A1AA
Text-subtle   #71717A

Border        #27272A
Border-strong #3F3F46

(Success/Warning/Danger/Info ajustam saturação)
```

### Por que essa paleta?

- **Verde profundo**: cor primária do tênis (grama) + Brasil sem ser brega
- **Laranja terracota**: warm color pra balancear o verde (não usar vermelho puro, que dá agressivo demais)
- **Âmbar**: específico pra "prime time" hour bands — sem inventar cor nova
- **Background off-white**: clubes brasileiros físicos têm essa paleta acolhedora (madeira clara, parquet)

## 1.3 Tipografia

### Família principal
**Inter** (Google Fonts)
- Por que: legibilidade absoluta em todos os tamanhos, suporta português perfeitamente, está em quase todos os sistemas modernos
- Pesos: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
- Fallback: `system-ui, -apple-system, BlinkMacSystemFont, sans-serif`

### Família display (opcional, pra titulos grandes)
**Geist** ou **General Sans**
- Por que: personalidade mais distintiva pra hero/landing
- Apenas pra títulos grandes (>32px)

### Família monospace (pra códigos/IDs)
**JetBrains Mono** ou **IBM Plex Mono**
- Pra exibir IDs de booking, ranking position, scores

### Escala tipográfica (mobile-first)
```
2xs   10px / line 12   uppercase labels
xs    12px / line 16   captions, metadata
sm    14px / line 20   body secondário, inputs
base  16px / line 24   body principal
lg    18px / line 28   subtítulos
xl    20px / line 28   títulos de card
2xl   24px / line 32   títulos de página
3xl   30px / line 36   títulos hero (mobile)
4xl   36px / line 40   títulos hero (desktop)
```

## 1.4 Sistema de espaçamento

**Grid 8pt** (clássico):
- Tokens: 4, 8, 12, 16, 24, 32, 48, 64, 80, 96
- Componentes pequenos (botão, badge): padding interno 8/12
- Cards: padding 16/24
- Sections: gap entre seções 32/48

## 1.5 Iconografia

**Lucide Icons** (compatível com shadcn/ui out-of-the-box).
- Stroke-based, peso 1.5-2px
- Tamanho default: 20px (inline), 24px (botões), 16px (badges)

## 1.6 Border radius (sistema)

```
sm    4px   inputs, badges
base  6px   botões, cards pequenos
md    8px   cards padrão
lg    12px  modais, sheets
xl    16px  hero panels
full  9999px círculos (avatares)
```

## 1.7 Sombras (elevação)

```
xs   0 1px 2px rgba(0,0,0,0.05)        botões, inputs
sm   0 1px 3px rgba(0,0,0,0.1)         cards leves
md   0 4px 6px -1px rgba(0,0,0,0.1)    cards padrão
lg   0 10px 15px -3px rgba(0,0,0,0.1)  modais, dropdowns
xl   0 20px 25px -5px rgba(0,0,0,0.1)  popups elevados
```

## 1.8 Voz do produto

> Resumo da identidade verbal — referência rápida para microcopy
> e nomenclatura. Para o sistema completo, ver `GUIA_DE_VOZ_DRAFTKLUB.md`.

### Princípios

1. **Presente do indicativo** — "acontece", "joga", "reserva"
2. **Sujeito ativo** — "você reserva" (não "reserva é feita")
3. **Palavras concretas** — "quadra", "torneio", "ranking"

### Palavra-chave do produto: ACONTECER

Usar em headers, empty states, notificações:

```
"Hoje no Klub" (não "Calendar")
"O que está acontecendo no Klub" (não "Atividade recente")
"Acontecendo agora" (não "Em andamento")
"Nada acontecendo aqui ainda" (empty state)
```

### Vocabulário oficial

```
Use:                          Em vez de:
─────────────────────────     ─────────────────────────
Klub (com K)                  clube, plataforma, sistema
sócio, jogador, comissão      usuário, membro, cliente
reservar, jogar, vencer       agendar, executar, finalizar
quadra                        instalações, recurso
hoje, agora, próximo          atual, vigente, subsequente
```

### Palavras proibidas (corporativês)

❌ usuário · plataforma · ecossistema · solução · funcionalidade ·
experiência · jornada · engajamento · stakeholder · gestão

### Microcopy patterns

**CTAs (botões):** verbo no infinitivo, direto.
```
✅ Reservar  ✅ Estender +30min  ✅ Ver detalhes
❌ Clique para reservar  ❌ Realizar agendamento
```

**Erros:** diz o que aconteceu e o que fazer.
```
✅ "Quadra ocupada nesse horário. Escolha outro."
❌ "Erro ao processar requisição."
```

**Sucesso:** curto, fato + opcional próxima ação.
```
✅ "Reservado! Quadra 1 • 19:00–20:00."
❌ "Sua reserva foi processada com sucesso."
```

**Empty states:** foco em ação.
```
✅ "Nenhuma reserva ainda. [Reservar quadra]"
❌ "Você não possui registros para visualizar."
```

### Tom por contexto

```
Sócio (B2C):       Caloroso, próximo, esportivo
Klub Admin (B2B):  Profissional, eficiente, respeitoso
Comissão:          Técnico, preciso, cooperativo
Staff (balcão):    Direto, operacional, rápido
```

### Tagline e variações

```
PRIMÁRIA:        "Onde o Klub acontece."
LANDING B2B:     "Onde seu Klub acontece todos os dias."
LANDING B2C:     "O seu Klub acontece aqui."
EMAIL FOOTER:    "DraftKlub — onde o Klub acontece."
CTA LANDING:     "Faça o Klub acontecer."
```

### Naming canônico das features

| Backend | UI label |
|---------|----------|
| Klub | Klub |
| Space | Quadra |
| Booking | Reserva |
| TournamentMatch | Partida |
| Tournament | Torneio |
| Ranking | Ranking |
| PlayerSportEnrollment | Inscrição |

---

# PARTE 2 — Prompts pro Claude Design

> Antes de usar, abra https://claude.ai/design e crie a organização.
> Cole o **prompt 0** primeiro pra setup do design system.
> Depois itera com os prompts 1-7 das telas.

## Prompt 0 — Setup do design system

```
Estou construindo o DraftKlub, plataforma SaaS para clubes brasileiros 
de esportes de raquete (tennis, squash, padel, beach tênis).

Tagline: "Onde o Klub acontece."

Tom desejado da copy: simples (não corporativo), foco em ação, 
comunidade como protagonista. Microcopy curta e direta — "Reserve 
sua quadra" em vez de "Sistema de gestão de reservas".

A plataforma é híbrida B2B+B2C:
- B2B: clubes administram torneios, reservas de quadras, rankings
- B2C: jogadores reservam quadras, jogam torneios, acompanham rankings 
  cross-clube

Quero que use o design system abaixo como ponto de partida — pode 
sugerir refinamentos mas mantenha a essência.

PALETA — TEMA CLARO:
Primary: #0E7C66 (verde profundo)
Primary-soft: #14A085
Secondary: #DC4F2F (laranja terracota)
Accent: #F59E0B (âmbar, pra hour bands "prime time")
Background: #FAFAF9
Surface: #FFFFFF
Surface-2: #F4F4F2
Text: #18181B
Text-muted: #71717A
Text-subtle: #A1A1AA
Border: #E4E4E7
Success: #16A34A
Warning: #F59E0B
Danger: #DC2626
Info: #0EA5E9

PALETA — TEMA ESCURO:
Primary: #14B89A
Primary-soft: #1ED9B0
Secondary: #F26B47
Accent: #FBBF24
Background: #0A0A0A
Surface: #18181B
Surface-2: #27272A
Text: #FAFAFA
Text-muted: #A1A1AA
Border: #27272A

TIPOGRAFIA:
- Principal: Inter (Google Fonts)
- Display: Geist ou General Sans (apenas títulos grandes)
- Monospace: JetBrains Mono (IDs, scores)

ESCALA TIPOGRÁFICA (mobile-first):
2xs 10px / xs 12px / sm 14px / base 16px / lg 18px / xl 20px / 
2xl 24px / 3xl 30px / 4xl 36px

ESPAÇAMENTO: grid 8pt — tokens 4, 8, 12, 16, 24, 32, 48, 64

BORDER RADIUS: sm 4px / base 6px / md 8px / lg 12px / xl 16px

ICONOGRAFIA: Lucide Icons (stroke-based, 1.5-2px)

SOMBRAS: 5 níveis de elevação (xs/sm/md/lg/xl)

PERSONALIDADE:
- Profissionalismo esportivo brasileiro
- Confiável (Klub Admin 60 anos), Vibrante (Player 30 anos), 
  Direto (Staff balcão)
- Mobile-first (80% dos usos)
- Dark mode obrigatório (toggle no header)

VOZ DO PRODUTO (importante pra microcopy):
- Presente do indicativo, sujeito ativo, palavras concretas
- Palavra-chave: "acontecer" (Hoje no Klub, Acontecendo agora)
- Use "Klub" com K, não "clube"
- Use "sócio/jogador/comissão", não "usuário"
- CTAs: verbos no infinitivo direto (Reservar, Estender, Ver)
- Errors: diz o que aconteceu E o que fazer
- Empty states: foco em ação
- Proibidas: plataforma, sistema, solução, jornada, engajamento

REFERÊNCIAS:
- Linear (rigor de tokens)
- Strava (vibração esportiva)
- Notion (hierarquia visual)

Comece criando o design system completo: tokens, primitives 
(button, input, badge, card, modal), e me mostre uma preview de 
exemplo aplicando essa identidade num card de torneio com 
informações: nome, modalidade, status, próxima partida, players 
inscritos.
```

## Prompt 1 — Login

```
Crie a tela de login do DraftKlub.

Contexto:
- Mobile-first
- Auth via Firebase: Email/Password OU Google
- Nenhum signup público — usuários são criados pelo Klub Admin
- Tagline visível: "Onde o Klub acontece."

Elementos:
- Logo DraftKlub (texto se não houver logo)
- Form: email + senha
- Botão primary "Entrar"
- Divisor "ou"
- Botão Google (com ícone Google)
- Link sutil "Esqueci minha senha"
- Texto rodapé: "Sem conta? Fale com seu clube."

Estados:
- Default
- Loading (botão entra em spinner)
- Erro de credenciais (mensagem inline, não toast)
- Sucesso (transição pra dashboard)

Estilo:
- Centralizado em mobile, formulário de 320px
- Background sutil (gradient leve do background pro surface-2)
- Sem distrações
```

## Prompt 2 — Dashboard pós-login

```
Crie o dashboard pós-login do DraftKlub.

Contexto:
- Mobile-first
- Usuário é Player do clube (papel mais comum)
- Tela depois do login
- Resumo + ações rápidas

Elementos (em mobile, scroll vertical):
1. Header com logo, avatar do user, toggle dark mode
2. Saudação personalizada ("Olá, João!")
3. Card "Minha próxima reserva":
   - Quadra X, hoje 19:00-20:00
   - Tipo (singles/doubles)
   - Adversários (avatares + nomes)
   - Botão "Ver detalhes"
4. Card "Torneio em andamento":
   - Nome do torneio
   - Status (próxima partida, ranking atual)
   - Botão "Ver torneio"
5. Quick actions horizontais:
   - "Reservar quadra" (primary)
   - "Ver calendário"
   - "Ver rankings"
6. Card "Meu ranking" (compact):
   - Posição atual
   - Pontos
   - Tendência (subindo/descendo)

Em desktop:
- Layout em 3 colunas
- Sidebar fixa esquerda com navegação principal

Tom:
- Energético sem ser exagerado
- Informação densa mas não overwhelming
- Mostrar atividade do clube ("vibração")
```

## Prompt 3 — Calendar de quadras (TELA CRÍTICA)

```
Crie a tela de calendar de quadras do DraftKlub. Esta é a tela mais 
importante da plataforma — usada várias vezes ao dia por todos os perfis.

Contexto:
- Mobile-first (staff usa no balcão pelo celular, sócios usam pra reservar)
- Visualização tipo "TV de balcão de clube" (grid hora x quadra)
- Klub tem múltiplas quadras (3-15)

Layout:
- Top: navegação de data (← Hoje, 26 Abr →)
- Filtros: modalidade (Tennis/Squash/All), tipo de quadra
- Grid principal:
  * Linhas: horas (de 06:00 a 22:00, granularity 30min)
  * Colunas: quadras (Quadra 1, Quadra 2, Quadra 3...)
  * Em mobile: scroll horizontal pelas quadras + scroll vertical pelas horas
  * Em desktop: tudo visível

Estados de slot:
- LIVRE: background surface, com hint sutil de hover (bg-success-soft)
- HOUR BAND: background sutilmente diferente (off_peak/regular/prime)
  * off_peak: surface (default)
  * regular: surface-2 (levemente mais escuro)
  * prime: accent-soft (sugestão âmbar bem claro)
- RESERVADO COM NOMES VISÍVEIS:
  * Background primary-soft
  * Mostra: nomes dos players (até 2 primeiros), matchType (singles/doubles)
- RESERVADO LIMITADO:
  * Background primary-soft
  * Mostra: "Reservado", matchType
- TORNEIO:
  * Background secondary (laranja)
  * Mostra: nome do torneio + fase (ex: "Open Verão • Quartas")
- MANUTENÇÃO/CHUVA:
  * Background warning-soft (cinza-âmbar)
  * Mostra: "Manutenção" ou "Chuva" com ícone
- TAP num slot LIVRE: modal pra criar booking
- TAP num slot RESERVADO: modal de detalhes (ações: cancelar, estender)

Visualizar:
- Bordas pretas sutis entre slots
- Header das colunas (quadras) sticky no topo do scroll
- Linhas de hora com label "11:00", "11:30"
- Hint visual de banda (linha vertical leve à esquerda do bloco da banda)

Inclua:
- Botão flutuante "Reservar" (primary, canto inferior direito mobile)
- Indicador "Agora" (linha horizontal vermelha sutil onde estamos no horário)

Tom:
- Densa mas legível
- Cores funcionais (cada estado tem identidade visual clara)
- Touch-friendly em mobile (slots não muito pequenos)
```

## Prompt 4 — Detalhe de booking

```
Crie a tela/modal de detalhe de um booking no DraftKlub.

Contexto:
- Aberto ao clicar num slot reservado no calendar
- Mobile: full-screen sheet (deslizando de baixo)
- Desktop: modal centralizado

Elementos:
- Header: data, hora, quadra (ex: "Quadra 1 • Hoje • 19:00-20:00")
- Badge de status: Confirmado / Pendente / Cancelado
- Badge matchType: Singles / Doubles
- Badge bandType: Off-peak / Regular / Prime
- Players section:
  * Avatar + nome do primary player (com badge "Você" se aplicável)
  * Avatares + nomes dos outros players
  * Se há guests, badge "(convidado)" ao lado do nome
- Quem reservou (responsibleMember se diferente do primary)
- Notas (se houver)
- Histórico de extensões (se houver):
  * Lista compacta: "+30min • aprovado às 20:01"
- Ações (se permitidas):
  * Cancelar (danger, com confirmação)
  * Estender +30min (primary, só aparece após endsAt no modo player)
  * Editar (secondary, só staff)

Estados:
- Booking ativo (em andamento agora)
- Booking futuro
- Booking passado
- Booking cancelado (mostra motivo)

Tom:
- Informativo, denso mas claro
- Ações claras em CTAs visíveis
- Players são o foco visual
```

## Prompt 5 — Criar booking

```
Crie a tela/sheet de criar booking no DraftKlub.

Contexto:
- Aberto ao clicar num slot livre OU botão "Reservar"
- Mobile: full-screen sheet
- Desktop: modal

Fluxo step-by-step (em mobile pode ser 1 tela inteira ou steps):

STEP 1 — Quadra e horário:
- Se vier de slot do calendar: pré-preenchido (Quadra 1, 19:00)
- Se vier do botão flutuante: precisa selecionar
  * Date picker
  * Quadra picker (lista visual com tipo de superfície)
  * Time picker (alinhado à granularity)

STEP 2 — Tipo de partida:
- Radio cards: Singles vs Doubles
- Mostra duração calculada automaticamente baseada na hour band
- Hint: "Banda regular • 60min"

STEP 3 — Players:
- Você (primary) marcado por default
- Botão "Adicionar jogador":
  * Search input (busca por nome, email, CPF)
  * Resultados em lista com avatar, nome, badge "(convidado)" se kind='guest'
  * Botão "Adicionar convidado externo" no fim:
    * Form expansível: firstName, lastName, email
- Lista atual de players selecionados (com X pra remover)

STEP 4 — Confirmação:
- Resumo: quadra, hora, tipo, players
- Notas (textarea opcional)
- Botão "Reservar" (primary)

Validações em tempo real:
- Banda prime + outros players → erro "Banda prime não permite convidados"
- Conflitos → erro "Você já tem reserva nesse horário"

Tom:
- Confiante e direto
- Validação inline (não toast)
- Mobile-first com steps claros
```

## Prompt 6 — Página de torneio

```
Crie a página de detalhe de um torneio no DraftKlub.

Contexto:
- Torneio é o coração da experiência B2B
- Comissão configura, Players visualizam, Staff acompanha

Header:
- Nome do torneio
- Modalidade (Tennis / Squash)
- Categoria (ex: "Singles Avançado Masculino")
- Status: Draft / Em andamento / Concluído / Cancelado
- Datas: início e fim previstos

Tabs (3 abas):
1. Bracket (visualização do chaveamento)
2. Agenda (cronograma de jogos)
3. Resultados (matches finalizados + ranking provisório)

ABA 1 — Bracket:
- Visualização gráfica do chaveamento
- Em mobile: scroll horizontal (bracket é muito largo)
- Em desktop: zoom/pan
- Cada match mostra: 2 players (nomes + avatars), score se completed,
  status (scheduled / in_progress / completed)
- Match com winner: nome em bold, lado vencedor destacado
- Linhas conectoras entre matches (estilo bracket clássico)
- Hover/tap em match: tooltip com detalhes (data, hora, quadra)

ABA 2 — Agenda:
- Lista cronológica de matches:
  * Group by data
  * Cada item: hora, quadra, players, fase (R1, QF, SF, F)
  * Status visual: scheduled (default) / in_progress (pulsing) / completed (✓)

ABA 3 — Resultados:
- Tabela de matches completados:
  * Players, score, winner, data
- Ranking provisório:
  * Posição, player, vitórias, derrotas, pontos

Permissões visuais:
- Players: vê tudo das suas próprias partidas com detalhes; outras como readonly
- Comissão: vê tudo + botões "Reportar resultado" / "Reagendar"
- Staff: read-only

Tom:
- Esportivo, energético
- Informação densa mas organizada por tabs
- Visualização de bracket é o "wow factor"
```

## Prompt 7 — Lista de rankings

```
Crie a página de rankings do DraftKlub.

Contexto:
- Rankings são valor alto pro player (FOMO, comparação social)
- Pode ser ranking do clube OU ranking cross-clube (futuro)

Header:
- Modalidade selecionada (Tennis / Squash) — toggle
- Tipo: Casual / Torneio / Combinado — toggle
- Período (filtro): Todo período / Últimos 30 dias / Últimos 90 dias

Top 3 (highlighted):
- Cards grandes com:
  * Avatar grande
  * Nome
  * Posição (1, 2, 3 — destaques de medalha)
  * Pontos
  * Tendência (↑ 2 posições essa semana)

Lista (4+ em diante):
- Linha por jogador:
  * Posição (#4, #5, ...)
  * Avatar pequeno
  * Nome
  * Pontos
  * Tendência (sutil)
- Badge "Você" no jogador atual (se logado for um deles)

Filtros adicionais:
- Search por nome
- Toggle "Mostrar só ativos" (com partidas no período)

Estado vazio:
- Se ranking não tem ninguém: ilustração + "Nenhum jogador ranqueado ainda"

Tom:
- Competitivo mas não agressivo
- Dados precisos e claros
- Top 3 é o destaque visual
```

---

# PARTE 3 — BRIEFING_DIA11_FRONTEND.md (versão inicial)

> Esse briefing usa **assumptions razoáveis** que podem precisar ajustar
> depois que você voltar do Claude Design com os designs aprovados.
>
> Marquei `[CONFIRMAR]` em decisões que dependem do output do Claude Design.

## D11.0 Estado atual

```
Backend: 100% MVP-ready (256 testes, ~50 endpoints)
Domínio: www.draftklub.com (a configurar)
Stack frontend definido: Next.js 16.2 + shadcn/ui + TanStack Query
Localização: apps/web na turborepo
```

## D11.1 Objetivo

**Frontend mínimo focado em validação.** Construir 4-5 telas críticas
consumindo o backend real, pra:
1. Pegar bugs de DX da API
2. Validar contradições entre endpoints
3. Construir intuição do produto
4. Foundation pro Dia 11+ completo

**Out of scope desse mínimo:**
- Telas de admin (gerenciar Klub, criar torneio)
- Notificações push
- Mobile app nativo (Dia 12)
- Pagamentos
- Onboarding/signup

## D11.2 Setup do `apps/web`

### 2.1 Estrutura

```
apps/web/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # landing/redirect
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   └── (app)/
│   │       ├── layout.tsx              # auth-protected layout
│   │       ├── dashboard/page.tsx
│   │       ├── calendar/page.tsx
│   │       ├── bookings/[id]/page.tsx
│   │       ├── tournaments/[id]/page.tsx
│   │       └── rankings/page.tsx
│   ├── components/
│   │   ├── ui/                         # shadcn primitives
│   │   ├── layout/                     # header, sidebar, footer
│   │   ├── booking/                    # BookingCard, CalendarGrid, etc
│   │   ├── tournament/                 # BracketView, MatchCard
│   │   └── shared/                     # Avatar, EmptyState, etc
│   ├── lib/
│   │   ├── api/                        # API client (TanStack Query hooks)
│   │   ├── auth/                       # Firebase Auth setup
│   │   ├── utils/                      # date helpers, formatters
│   │   └── theme/                      # design tokens, dark mode
│   └── hooks/
├── public/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

### 2.2 Dependencies principais

```json
{
  "dependencies": {
    "next": "^16.2.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@tanstack/react-query": "^5.66.0",
    "@tanstack/react-query-devtools": "^5.66.0",
    "firebase": "^11.0.0",
    "zod": "^3.24.0",
    "react-hook-form": "^7.54.0",
    "@hookform/resolvers": "^3.10.0",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.468.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.9.0"
  }
}
```

### 2.3 Tailwind v4 config

`tailwind.config.ts` — sem necessidade no v4 (configuração via CSS).
Em vez disso, usar `@theme` no CSS:

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  --color-primary: #0E7C66;
  --color-primary-soft: #14A085;
  --color-secondary: #DC4F2F;
  --color-accent: #F59E0B;
  --color-background: #FAFAF9;
  --color-surface: #FFFFFF;
  /* ... resto da paleta */
  
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}

@theme dark {
  --color-primary: #14B89A;
  /* ... overrides do tema escuro */
}
```

[CONFIRMAR] Os tokens exatos vão sair do output do Claude Design.

### 2.4 Firebase Auth setup

`src/lib/auth/firebase.ts`:

```typescript
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
```

`src/lib/auth/AuthContext.tsx`:
- Provider que escuta `onAuthStateChanged`
- Expõe `user`, `loading`, `signIn`, `signOut`
- Hook `useAuth()` pra acessar

### 2.5 API client (TanStack Query)

`src/lib/api/client.ts`:

```typescript
import { auth } from '@/lib/auth/firebase';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export async function apiClient(
  path: string,
  options: RequestInit = {},
): Promise<any> {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new APIError(response.status, error.message ?? response.statusText, error);
  }

  return response.json();
}

export class APIError extends Error {
  constructor(
    public status: number,
    message: string,
    public data: any,
  ) {
    super(message);
  }
}
```

`src/lib/api/hooks/`:
- `useKlubCalendar(klubId, date)`
- `useBooking(bookingId)`
- `useCreateBooking()`
- `useTournament(tournamentId)`
- `useRanking(klubSportId)`

Cada hook é um `useQuery` ou `useMutation` do TanStack Query
chamando `apiClient`.

### 2.6 Provider raiz

`src/app/layout.tsx`:

```typescript
import { QueryProvider } from '@/lib/api/QueryProvider';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>{children}</AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

## D11.3 Telas mínimas a construir

Em ordem de implementação:

```
1. Login (Firebase auth flow)
2. Layout autenticado (header + sidebar + dark toggle)
3. Dashboard (cards básicos consumindo /klubs/:id, /me/bookings, /me/rankings)
4. Calendar (consumindo /klubs/:id/calendar?date=)
5. Booking detail (consumindo /bookings/:id)
6. Create booking (mutation /klubs/:id/bookings)
```

[CONFIRMAR] Designs específicos vão vir do Claude Design.

## D11.4 Endpoints consumidos no MVP

```
POST /auth (Firebase ID token)
GET  /klubs/:id                          # info do clube
GET  /klubs/:id/calendar?date=           # calendar grid
GET  /klubs/:id/bookings?from=&to=&user= # listar bookings
POST /klubs/:id/bookings                 # criar booking
GET  /bookings/:id                       # detalhe (com presenter visibility)
PATCH /bookings/:id                      # editar (limitado)
DELETE /bookings/:id                     # cancelar
POST /bookings/:id/extensions            # estender
GET  /users/search?query=                # buscar players
GET  /tournaments/:id                    # detalhe torneio
GET  /tournaments/:id/bracket            # bracket view
GET  /tournaments/:id/agenda             # agenda
GET  /tournaments/:id/results            # resultados
GET  /klub-sports/:id/ranking            # rankings
```

## D11.5 Deploy

### 5.1 Cloud Run com Next.js
- Mesmo padrão do `api`
- `Dockerfile` em `apps/web/Dockerfile`
- Cloud Build trigger em `apps/web/cloudbuild.yaml`
- Service: `draftklub-web`

### 5.2 Domínio
- `www.draftklub.com` → Cloud Run service via Cloud Run domain mapping
- HTTPS automático via Google managed cert
- DNS já configurado em `draftklub.com` (apontar CNAME `www` pra `ghs.googlehosted.com`)

### 5.3 Variáveis de ambiente

```
NEXT_PUBLIC_API_URL=https://draftklub-api-uwlikcs6ka-rj.a.run.app
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyD0zTZCWWJjgCg3FLexNOgnI0TDgy8dEX0
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=draftklub-dev.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=draftklub-dev
```

## D11.6 Critério de "D11 mínimo pronto"

```
[ ] apps/web monta + roda local
[ ] Login Firebase funcionando (email + Google)
[ ] Layout autenticado com header + dark mode toggle
[ ] Dashboard renderiza próxima reserva + ranking básico
[ ] Calendar renderiza grid hora x quadras com bandas e estados
[ ] Booking detail renderiza payload completo (full e limited)
[ ] Create booking executa fluxo completo (com guest novo)
[ ] Deploy em Cloud Run + domínio funcionando
[ ] Pelo menos 5 bugs de DX/integração documentados (esperado!)
```

## D11.7 Decisões que vão emergir do Claude Design

```
[ ] Design tokens exatos (paleta refinada, tipografia final)
[ ] Componentes específicos pra clube (CalendarGrid customizado)
[ ] Padrão de empty states e loading states
[ ] Padrão de animações (transition, hover, etc)
[ ] Iconografia complementar pra modalidades esportivas
```

---

## Próximos passos

```
1. Vai pro https://claude.ai/design
2. Cria organização, cola Prompt 0 (design system)
3. Itera até gostar do output
4. Cola Prompts 1-7 das telas (uma por sessão é tranquilo)
5. Quando aprovar designs:
   - Aproveita o handoff bundle pro Claude Code
   - OU exporta como HTML/figma e me manda
6. Volta aqui — eu finalizo BRIEFING_DIA11_FRONTEND.md com 
   os tokens reais e o que aprendemos dos designs
7. Claude Code constrói Dia 11 mínimo
```

---

## Fim do pacote
