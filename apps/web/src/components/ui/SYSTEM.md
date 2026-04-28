# DraftKlub UI — Design System

Sprint L PR-L1 estabelece os primitivos da plataforma. Todo PR de
refator de página deve usar esses componentes em vez de reinventar.

## Princípios

- **Token-first**: classe arbitrária (ex: `text-[13px]`,
  `bg-[hsl(142_71%_32%)]`) só quando o token não cobre. Se aparece
  3+ vezes, vira token.
- **Consistência > individualidade**: melhor 90% das páginas com
  visual idêntico do que cada uma "polished" diferente.
- **Mobile-aware sempre**: modal ou form não pode quebrar em <640px.

## Tokens

### Cores semânticas (`globals.css`)

| Token           | HSL light   | HSL dark    | Uso                             |
| --------------- | ----------- | ----------- | ------------------------------- |
| `--primary`     | 168 80% 27% | 158 64% 52% | CTAs principais, links          |
| `--accent`      | 12 73% 52%  | 12 75% 58%  | Destaque secundário (terracota) |
| `--destructive` | 0 72% 51%   | 0 62% 45%   | Ações destrutivas, erros        |
| `--success`     | 142 71% 32% | 142 60% 42% | Confirmações, sucessos          |
| `--warning`     | 38 92% 50%  | 38 92% 55%  | Avisos, walkover, status amber  |
| `--muted`       | 60 5% 96%   | 24 6% 16%   | Backgrounds neutros, badges     |

**Use sempre via classe Tailwind**: `bg-primary`, `text-success`,
`border-destructive`. Não escreva `[hsl(142_71%_32%)]` direto.

### Brand palette (`--brand-primary-50..900`)

Use só pra detalhes específicos onde a escala neutra do tema não dá
o contraste certo. Default: prefira semantic tokens.

### Tipografia

Tailwind v4 default scale:

- `text-xs` (12px) — labels uppercase, meta, badges
- `text-sm` (14px) — body small, descrições, hints
- `text-base` (16px) — body padrão
- `text-lg` (18px) — subtítulos
- `text-xl` (20px) — títulos de section
- `text-2xl` (24px) — títulos de página (h1)
- `text-3xl` (30px) — display

**Migrar progressivamente** — `text-[13px]` → `text-sm`,
`text-[11px]` → `text-xs`, etc. Codemod via regex sweep no PR de
cada página.

`font-display` é Geist (definido em `--font-geist`). Use em headings
(h1/h2/h3) e em elementos de identidade (números KPI, scores).

### Spacing

Use a escala 4px:

- `p-2` (8px) — apertado
- `p-3` (12px) — compacto (cards de lista)
- `p-4` (16px) — padrão (cards principais, sections)
- `p-6` (24px) — espaçoso (modais, panels grandes)

**Evitar**: p-3.5, p-5 (não fazem parte da escala).

`gap-1.5` (6px), `gap-2` (8px), `gap-3` (12px), `gap-4` (16px) são os
gaps válidos. Mais que isso, pense se faz sentido.

### Container widths

3 tamanhos:

- `max-w-2xl` (672px) — forms compactos, modais sm
- `max-w-3xl` (768px) — **default** pra forms, settings, listas
- `max-w-5xl` (1024px) — dashboards com KPI grid

Não usar `max-w-4xl` ou outros sem justificativa.

### Border radius

- `rounded-sm` (4px) — badges, chips minimal
- `rounded-md` (8px) — inputs, buttons
- `rounded-lg` (12px) — cards
- `rounded-xl` (16px) — cards destaque, modais

**Evitar** `rounded-[10px]` arbitrário.

## Primitivos

### `<Modal>`

```tsx
import { Modal } from '@/components/ui/modal';

<Modal
  open={isOpen}
  onClose={() => setIsOpen(false)}
  title="Editar torneio"
  description="Mudanças refletem imediatamente."
  size="md"
  footer={
    <>
      <Button variant="outline" onClick={close}>
        Cancelar
      </Button>
      <Button onClick={save}>Salvar</Button>
    </>
  }
>
  {/* content scroll-able */}
</Modal>;
```

**Use quando**: ação modal/dialog (criar/editar, confirmar
destrutivo). Evite pra fluxos longos — prefira sub-rota.

### `<Tabs>`

```tsx
import { Tabs } from '@/components/ui/tabs';

// Mode searchParam (default — tab muda ?tab= sem navegar)
<Tabs
  tabs={[
    { id: 'overview', label: 'Visão geral' },
    { id: 'team', label: 'Equipe', hidden: !canManage },
  ]}
  active={tab}
  onChange={setTab}
/>

// Mode link (tab é sub-rota — code split, URL real)
<Tabs
  mode="link"
  tabs={[
    { id: 'overview', label: 'Visão geral', href: `/torneios/${id}` },
    { id: 'chave', label: 'Chave', href: `/torneios/${id}/chave` },
  ]}
  active={pathname.endsWith('/chave') ? 'chave' : 'overview'}
/>
```

**Use link mode** quando a página inteira é separada (PR-L2 split de
torneio detail). **Use searchParam** pra forms tab-organized.

### `<EmptyState>`

```tsx
import { EmptyState } from '@/components/ui/empty-state';
import { Trophy } from 'lucide-react';

<EmptyState
  icon={Trophy}
  title="Nenhum torneio ainda"
  description="A comissão pode criar torneios pelo botão acima."
  action={<Button>Criar torneio</Button>}
/>;
```

### `<Banner>`

```tsx
import { Banner } from '@/components/ui/banner';

<Banner tone="success" title="Salvo!">
  Mudanças aplicadas.
</Banner>

<Banner tone="warning">
  Datas exibidas no fuso do Klub: <strong>America/Sao_Paulo</strong>.
</Banner>

<Banner tone="error" title="Falha ao salvar">
  {error.message}
</Banner>
```

Substitui hard-coded `bg-[hsl(142_71%_32%/0.05)]` etc.

### `<PageHeader>`

```tsx
import { PageHeader } from '@/components/ui/page-header';
import { Plus } from 'lucide-react';

<PageHeader
  back={{ href: `/k/${slug}/dashboard`, label: 'Voltar pro Klub' }}
  eyebrow={`${klub.name} · Tênis`}
  title="Configurar Klub"
  description="Identidade, datas e equipe da modalidade."
  action={
    <Button>
      <Plus className="size-3.5" />
      Criar
    </Button>
  }
/>;
```

### `<FormField>`

```tsx
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';

<FormField
  label="Nome"
  required
  hint="Como aparece nas listagens."
  error={errors.name}
>
  <Input value={name} onChange={...} />
</FormField>

// Layout horizontal (settings):
<FormField label="Email" layout="horizontal">
  <Input type="email" />
</FormField>
```

Não controla o input — só wrap visual + hint/error consistentes.

## Ordem de adoção

PR-L1 entrega os primitivos. **Não migra páginas existentes** —
elas continuam funcionando com os componentes inline antigos.

Cada PR de refator de página seguinte (PR-L2 = `/torneios/:id`,
PR-L3 = `/configurar`, etc) **substitui** o ad-hoc pelos primitivos

- aplica os tokens.

## Anti-patterns a corrigir progressivamente

- `text-[Npx]` → tokens `text-xs/sm/base/...`
- `bg-[hsl(142_71%_32%/0.05)]` → `bg-success/5` (após cores
  semânticas)
- `rounded-[10px]` → `rounded-md` ou `rounded-lg`
- modal inline com `fixed inset-0 z-50 flex items-end ...` →
  `<Modal>`
- back-link + h1 ad-hoc → `<PageHeader>`
- empty state inline → `<EmptyState>`
- p-3.5 / p-5 → p-3 / p-4 / p-6 (escolher próximo da escala)
