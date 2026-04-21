# ADR 0007 — Cloud Run privado com acesso via Load Balancer

**Status:** Accepted
**Data:** 2026-04-21

## Contexto

Org policy `constraints/iam.allowedPolicyMemberTypes` bloqueia `allUsers` em IAM do GCP. Tentativa de tornar Cloud Run publicamente acessível via binding `allUsers` foi rejeitada.

## Decisão

Cloud Run services (`api`, `worker`) são privados por padrão em todos os ambientes. Acesso externo em produção será feito via Cloud Load Balancer com domínio próprio (`api.draftklub.com`), que invoca Cloud Run internamente com SA autorizada. Em dev/staging, acesso via `gcloud run services proxy` ou token temporário durante desenvolvimento.

## Consequências

- Maior segurança por padrão.
- Requer Cloud Load Balancer em prod (custo adicional ~R$50-100/mês).
- URLs do Cloud Run não são expostas diretamente.
- Próxima ação: provisionar Load Balancer no briefing de prod.
