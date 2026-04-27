# Setup operacional do Resend (email transacional)

Este doc fecha a Sprint D PR3 — habilita o envio real dos emails que o
`OutboxProcessorService` enfileira (klub review approved/rejected,
membership request created/approved/rejected). Sem este setup, a
aplicação sobe normal mas o `EmailService` opera em **log-only mode**:
warnings no Cloud Run logs ao invés de email enviado.

## Escopo

Os passos abaixo são **manuais** porque envolvem:

- Conta externa (Resend)
- DNS dos domínios oficiais (`draftklub.com` + `draftklub.com.br`)
- Secret Manager do GCP (escrita de valor)
- Trigger de Cloud Build (próximo deploy aplica)

Código necessário já está commitado:

- `infra/terraform/modules/secret-manager/main.tf` — recurso
  `resend-api-key` (cria o secret vazio, sem version).
- `cloudbuild.yaml` — `--set-secrets=RESEND_API_KEY=resend-api-key:latest`
  - `--set-env-vars=EMAIL_FROM=...,APP_BASE_URL=...` (com substitutions
    `_EMAIL_FROM` e `_APP_BASE_URL`).

## Sequência

### 1. Aplicar Terraform pra criar o secret

```bash
cd infra/terraform/environments/prod
terraform plan
terraform apply
```

O `plan` deve mostrar 1 recurso novo:
`google_secret_manager_secret.secrets["resend-api-key"]`. Apply cria o
secret vazio (sem version), pronto pra receber o valor.

### 2. Criar conta no Resend e verificar domínio

1. Acesse <https://resend.com> e crie conta com email do owner.
2. **Domains → Add Domain** → escolha `draftklub.com` (gTLD canônico).
3. Resend mostra 3 registros DNS pra verificação:
   - 1 SPF (TXT em `@` ou `send`)
   - 2 DKIM (CNAME em subdomínios `resend._domainkey` e similar)
4. Adicione esses 3 records no provedor de DNS do `draftklub.com`.
   Propagação leva 1-30 min.
5. Volte na Resend e clique **Verify**. Status precisa ficar verde
   antes de seguir.
6. Repita pra `draftklub.com.br` se quiser cobrir o ccTLD BR (CLAUDE.md
   diz pra cobrir os dois). Não obrigatório — emails funcionam só com
   um verificado.

### 3. Gerar API key

1. Resend dashboard → **API Keys → Create API Key**.
2. Nome: `draftklub-prod` (ou `-dev`/`-staging` se for setup multi-env).
3. Permissões: `Sending access` (default).
4. Copie a key (`re_xxxxxxxxxxxxxxxx`) — só aparece uma vez.

### 4. Popular o secret no GCP

```bash
echo -n "re_xxxxxxxxxxxxxxxx" | \
  gcloud secrets versions add resend-api-key \
    --project=draftklub-prod \
    --data-file=-
```

Ajuste `--project` pro env certo (`draftklub-dev`, `-staging`, ou
`-prod`). Verifique com:

```bash
gcloud secrets versions list resend-api-key --project=draftklub-prod
```

Deve mostrar `version-1` em estado `enabled`.

### 5. Atualizar substitutions do trigger Cloud Build

Cloud Run vai receber `EMAIL_FROM` e `APP_BASE_URL` do `--set-env-vars`
no próximo deploy. Os defaults em `cloudbuild.yaml` apontam pra
`onboarding@resend.dev` (sender de teste do Resend, só envia pra emails
registrados na conta) e `https://draftklub.com`.

**Pra produção real**, sobrescreva via trigger substitution no Cloud
Build console (ou via `gcloud builds triggers update`):

```
_EMAIL_FROM = "DraftKlub <noreply@draftklub.com>"
_APP_BASE_URL = "https://draftklub.com"
```

Sem essa override, emails saem do `onboarding@resend.dev` (funciona, mas
com cara de "teste"). E os links nos emails apontam pra `draftklub.com`
(domínio canônico, mesmo se o user costuma acessar via `.com.br` —
ambos resolvem pro mesmo Cloud Run via redirects).

### 6. Trigger novo deploy

```bash
git commit --allow-empty -m "chore: redeploy w/ resend env vars"
git push origin main
```

Ou re-run o último build no Cloud Build console. O step `deploy-api`
agora vai mountar `RESEND_API_KEY` do Secret Manager + setar
`EMAIL_FROM` / `APP_BASE_URL`. Cloud Run reinicia com as novas vars.

### 7. Verificar

Após deploy:

```bash
# Confere env do Cloud Run
gcloud run services describe draftklub-api \
  --project=draftklub-prod --region=southamerica-east1 \
  --format='value(spec.template.spec.containers[0].env[?name==RESEND_API_KEY],spec.template.spec.containers[0].env[?name==EMAIL_FROM],spec.template.spec.containers[0].env[?name==APP_BASE_URL])'
```

Trigger um email real (forma mais rápida):

1. Aprove um Klub pendente em `/admin/cadastros` ou aprove uma
   `MembershipRequest`.
2. Aguarde até 30s (cron do `OutboxProcessor`).
3. Confira no log do Cloud Run pelo log line `Outbox: processed=1 sent=1`.
4. O destinatário (criador do Klub / solicitante) deve receber o email.

Se algo falhar, o evento fica em `audit.outbox_events` com
`status='pending'` (5xx/timeout, retry automático até 5x) ou
`status='dead'` (4xx, não retentável). Inspecione com:

```sql
SELECT id, event_type, status, attempts, last_error, occurred_at
FROM audit.outbox_events
WHERE status IN ('pending', 'dead')
  AND event_type LIKE 'klub.%'
ORDER BY occurred_at DESC
LIMIT 20;
```

## Sem fazer setup

Sem o secret populado:

- Cloud Build vai falhar no step `deploy-api` (`--set-secrets` exige
  uma version do secret existir).
- **Workaround**: popule com placeholder vazio: `printf '' | gcloud
secrets versions add resend-api-key --data-file=-`. EmailService
  detecta `apiKey` vazio e cai em log-only mode. Tudo funciona, só
  emails não saem.

## Limites

- **Free tier Resend**: 100 emails/dia, 3000/mês. Pra MVP é suficiente;
  alerta de upgrade chega via dashboard.
- **Reputação de domínio**: SPF/DKIM via Resend dão deliverability boa
  por default. Adicione DMARC (`_dmarc.draftklub.com TXT "v=DMARC1;
p=none; rua=mailto:postmaster@draftklub.com"`) pra monitorar bounces.
- **DKIM rotation**: Resend roda automaticamente; não precisa intervir.
