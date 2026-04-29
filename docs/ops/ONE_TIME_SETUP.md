# One-time setup ops (Sprint M batch SM-7)

Runbook de comandos `gcloud`/`gsutil` que precisam rodar uma única vez por
ambiente. Não estão automatizados via Terraform porque ou são bootstrap
(chicken-and-egg do TF state) ou não compensam complexidade do TF apply
pra rodar 1 vez na vida do projeto.

## 1. GCS versioning no bucket de TF state

Sem versioning, um `terraform apply` corrompido apaga state. Recover: zero.

```bash
gcloud auth login --update-adc

gcloud storage buckets update gs://draftklub-tf-state \
  --versioning \
  --soft-delete-duration=30d

# Verificar
gcloud storage buckets describe gs://draftklub-tf-state --format='value(versioning)'
```

## 2. Popular secret `sentry-dsn` (quando criar projeto Sentry)

Cloud Build gating depende de `_SENTRY_ENABLED=true` no trigger.

```bash
echo -n "<sentry-dsn-url>" | gcloud secrets versions add sentry-dsn \
  --data-file=- --project=draftklub-dev

# No trigger Cloud Build, sobrescrever substitution:
#   _SENTRY_ENABLED = true
```

## 3. Atualizar liveness probe Cloud Run pra `/livez`

Sprint M batch 1 split `/health` (DB ping) em `/livez` (sem deps) +
`/readyz` (com DB). Liveness probe do Cloud Run ainda aponta pra `/health`
— TF apply do módulo cloud-run cuida disso após editar
`infra/terraform/modules/cloud-run/main.tf` (procurar `livenessProbe`).

```bash
cd infra/terraform/environments/dev
terraform apply -target=module.cloud_run
```

## 4. Re-auditoria periódica

Auditoria de 8 agentes inicial:
`/Users/bouhid/.claude/plans/draftklub-to-do-inherited-pumpkin.md`.

Re-rodar a cada 4 semanas (já agendada session-cron pra 27/05/2026 mas
sessão pode ter morrido — calendário recomendado).
