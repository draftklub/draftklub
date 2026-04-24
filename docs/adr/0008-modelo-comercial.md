# ADR 0008 — Modelo comercial DraftKlub

**Status:** Accepted
**Data:** 2026-04-24

## Contexto

DraftKlub atende dois públicos pagantes com modelos independentes.

## Decisão

### Receita B2B — Klub
Modelo híbrido: mensalidade fixa por tier + fee % sobre transações processadas.
Diferenciação por limites operacionais (membros, quadras, esportes) — todos os
módulos inclusos em todos os planos.

Tiers:
- Starter: R$99/mês, 50 membros, 2 esportes, 3 quadras, fee 2.5%
- Pro: R$299/mês, 300 membros, 4 esportes, quadras ilimitadas, fee 1.8%
- Elite: R$699/mês, ilimitado, fee 1.2%
- Enterprise: negociado, sales-led

Trial: 30 dias no plano Starter para self-service.

### Receita B2C — Jogador Premium
Assinatura individual independente do clube.
R$9,90/mês ou R$99/ano.
Features: stats avançadas, matchmaking ilimitado, ranking global, badges.

### Tipos de Klub
Qualquer entidade que gerencia espaço esportivo:
sports_club | condo | school | public_space | academy | individual

### Dois fluxos de entrada
- Self-service: Klub cria conta direto via formulário público, plano Starter trial
- Sales-led: SuperAdmin cria manualmente com plano e condições customizadas

### Suporte a filiais
Campo parentKlubId nullable no Klub.
isGroup boolean para entidades mãe.
billingKlubId para consolidar faturamento no grupo.

## Consequências

- Schema Klub inclui campos de plano, limites, tipo, dados legais, filiais
- Guards futuros verificam limites do plano antes de operações
- Módulo billing separado de payment
- Fee transacional via split payment no gateway
- KlubRequest para capturar interesse público antes de criar Klub oficial
