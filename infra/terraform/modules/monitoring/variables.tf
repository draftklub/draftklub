variable "project_id" { type = string }
variable "region" { type = string }
variable "environment" { type = string }

variable "alert_email" {
  description = "E-mail que recebe alertas (uptime + SLOs). Trocar por DL quando time crescer."
  type        = string
}

variable "api_service_name" {
  description = "Nome do Cloud Run service da API (default: draftklub-api)."
  type        = string
  default     = "draftklub-api"
}

variable "api_uptime_host" {
  description = "Hostname do API pra uptime check (sem https://). Vem do output do módulo cloud-run."
  type        = string
}

variable "web_uptime_host" {
  description = "Hostname do web pra uptime check (sem https://). Pode ser vazio até o web ter URL estável."
  type        = string
  default     = ""
}

variable "cloud_sql_database_id" {
  description = "Database ID full no formato project:region:instance — pra alert de conexões."
  type        = string
}

variable "api_5xx_rate_threshold" {
  description = "Taxa de 5xx que dispara o alerta (0.01 = 1%)."
  type        = number
  default     = 0.01
}

variable "api_p99_latency_ms_threshold" {
  description = "P99 latência API em ms que dispara alerta."
  type        = number
  default     = 2000
}

variable "db_connections_pct_threshold" {
  description = "Percentual de uso do pool de conexões pra alertar (0.8 = 80%)."
  type        = number
  default     = 0.8
}

variable "db_max_connections" {
  description = "Limite configurado em max_connections do Cloud SQL — usado pra calcular o threshold absoluto."
  type        = number
}
