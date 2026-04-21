# ADR 0004 — Autorização escopada via Policy Engine

**Status:** Accepted
**Data:** 2026-04-21

## Contexto

Papéis no DraftKlub têm escopo variável:

- SuperAdmin (operador do SaaS) — escopo global.
- KlubAdmin — escopo de um Klub.
- SportsCommittee — escopo de um esporte dentro de um Klub (papel mais complexo).
- Teacher — escopo de turmas específicas de um esporte num Klub.
- Player — escopo de si mesmo, relações sociais.

Modelar como papéis fixos explode combinatorialmente (um papel por Klub × esporte).

## Decisão

**Permissões escopadas** via tabela `role_assignments`:

```
role_assignments:
  id, user_id, role, scope_klub_id?, scope_sport_id?, granted_at, granted_by
```

Um **Policy Engine** centralizado expõe `can(user, action, resource): boolean` onde `action` é string (`tournament.create`, `reservation.cancel.any`) e `resource` carrega contexto (`klubId`, `sportId`, `ownerId`).

Controllers declaram policy exigida via decorator `@RequirePolicy(action, contextExtractor)`. Guard intercepta, consulta engine, decide.

Firebase custom claims carregam `role_assignments` do usuário com TTL curto (15min) para evitar hit no banco por request.

## Consequências

- Zero condicional de permissão espalhado pelo código.
- Auditoria de quem pode o quê é consulta SQL.
- Adicionar novo papel = regra nova no engine + migration de `role_assignments`.
- Trade-off: claims cached podem ficar 15min desatualizadas — aceitável para o contexto.
