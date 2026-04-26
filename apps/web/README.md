# @draftklub/web

Frontend web do DraftKlub. Next.js 15 (App Router) + React 19 + Tailwind CSS 4 + TypeScript.

> **Tagline:** "Onde o Klub acontece."

## Status

Scaffold inicial com base no design system (`draftklub-design-system`):

- Design tokens (paleta verde brasileira `#0E7C66` + terracota `#DC4F2F` + âmbar `#F59E0B`, stone neutrals)
- Tipografia (Inter body + Geist display + JetBrains Mono)
- Light + dark mode (toggle no topbar, sem flash via inline script)
- Primitives shadcn-style: `Button`, `Input`, `Label`, `Card`
- **Tela de login** (`/login`) — auth stub (pendente plugar Firebase Auth)
- **Dashboard** (`/dashboard`) — sidebar + topbar + KPIs + listagem de reservas + "acontecendo agora"
- BrandMark SVG (ícone "A/peak" verde + wordmark Geist)

## Rodar local

```bash
# do root do monorepo
pnpm install
pnpm --filter @draftklub/web dev
# http://localhost:3001
```

A API DraftKlub (`apps/api`) roda separada na porta 3000 — sem dependência runtime ainda.

## Decisões de stack

- **Next.js App Router** — alinha com o protótipo do design system (tinha `app/(auth)/login/page.tsx`).
- **Tailwind 4** com `@import "tailwindcss"` + `@theme inline` — sem `tailwind.config.js`, todos os tokens em CSS.
- **shadcn-style primitives** (não a CLI; código copiado e ajustado pra ficar em sintonia com os tokens do design system).
- **Theme provider próprio** (lightweight, sem `next-themes`) — class `.dark` na `<html>` + `localStorage`.
- **Auth stub** em `src/lib/auth-stub.ts` — placeholder até Firebase JS SDK ser adicionado. Interface estável: trocar implementação não vai quebrar o login.

## TODO

- [ ] Plugar Firebase Auth client real (substitui `src/lib/auth-stub.ts` por chamadas Firebase)
- [ ] API client tipado (consumindo `/me`, `/klubs`, `/bookings` do `apps/api`)
- [ ] Mobile drawer pra sidebar (hoje só desktop ≥ md)
- [ ] Demais telas: Reservas, Quadras, Torneios, Jogadores, Settings
- [ ] CORS no `apps/api` pra `localhost:3001` em dev
- [ ] Bracket view, court card, slot grid (já têm protótipo no design-system bundle)

## Estrutura

```
src/
├── app/
│   ├── layout.tsx          # root: ThemeProvider + fonts + metadata
│   ├── globals.css         # tokens (verde palette + chrome v2)
│   ├── page.tsx            # redirect → /login
│   ├── login/page.tsx      # tela de entrada
│   └── dashboard/
│       ├── layout.tsx      # shell (Sidebar + Topbar)
│       └── page.tsx        # KPIs + reservas + ao vivo
├── components/
│   ├── brand/brand-mark.tsx
│   ├── dashboard/{sidebar,topbar}.tsx
│   ├── theme-provider.tsx
│   └── ui/{button,input,label,card}.tsx
└── lib/
    ├── auth-stub.ts        # placeholder até Firebase
    └── utils.ts            # cn() helper
```
