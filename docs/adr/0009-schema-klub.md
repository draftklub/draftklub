# ADR 0009 — Schema do módulo Klub

**Status:** Accepted
**Data:** 2026-04-24

## Contexto

O módulo Klub é o tenant lógico do DraftKlub. Precisa suportar desde
condomínios com 2 quadras até redes de clubes com múltiplas filiais.

## Decisão

### Tabelas no schema `klub`

- `klubs` — entidade principal com suporte a filiais (parentKlubId)
- `klub_configs` — regras operacionais, criada automaticamente com defaults
- `klub_sports` — esportes ativos no Klub
- `klub_sport_interests` — esportes desejados não disponíveis ainda
- `klub_requests` — solicitações públicas de cadastro
- `klub_media` — fotos e vídeos do Klub

### Tabelas no schema `space`

- `spaces` — espaços físicos genéricos (quadra é um tipo de space)

### Documento (CNPJ/CPF)

Encriptado com AES-256-GCM, chave no Secret Manager.
Campo `documentHint` guarda últimos 4 dígitos em texto plano para exibição.
CNPJ/CPF nunca exposto via API — apenas hint.

### Space genérico

Space é a entidade base para qualquer espaço físico reservável.
type: court | room | pool | field | other
Court é um Space com type=court e sportCode preenchido.

### Soft delete e retenção

Klubs deletados ficam em status=churned.
Dados retidos por 90 dias, depois anonimizados (LGPD).
Nunca apaga completamente — jogadores têm direito ao histórico.

## Consequências

- Migration única cria todos os schemas e tabelas
- Módulo booking usará Space, não uma tabela Court separada
- Encriptação de documento requer chave AES no Secret Manager
- Slug único global com sufixo de cidade em caso de conflito
