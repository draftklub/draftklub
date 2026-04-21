# ADR 0003 — Multi-tenancy via Membership (identidade global cross-Klub)

**Status:** Accepted
**Data:** 2026-04-21

## Contexto

O produto precisa suportar: (a) clube como tenant comercial; (b) jogador transitando entre clubes sem duplicar identidade.

Modelos alternativos considerados:

- Tenant isolado por Klub (schema ou DB separado) → impede jogador cross-Klub.
- Discriminator `klub_id` em todas as tabelas → viável mas sem explicitar a relação user-klub.

## Decisão

Três entidades ortogonais em `identity/`:

1. **User** — identidade global (um por pessoa física, ligada ao Firebase Auth).
2. **Membership** — vínculo User ↔ Klub (status, tipo: member/guest/staff).
3. **RoleAssignment** — atribuição de papel com escopo opcional: `(user_id, role, scope_klub_id?, scope_sport_id?)`.

Entidades de outros módulos referenciam `user_id` e `klub_id` como IDs (sem FK cross-schema). Rankings e stats podem ser projetados localmente (por Klub) e globalmente (por esporte).

## Consequências

- Jogador leva rating, histórico e conquistas consigo ao entrar em novo Klub.
- Autorização escopada (ver ADR 0004) aproveita essa modelagem.
- Queries precisam filtrar por `klub_id` explicitamente — row-level security é opcional para defesa em profundidade.
