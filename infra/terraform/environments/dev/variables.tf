variable "organization_id" { type = string }
variable "billing_account_id" { type = string }
variable "terraform_sa_email" { type = string }
variable "region" {
  type    = string
  default = "southamerica-east1"
}
variable "api_db_password" {
  type      = string
  sensitive = true
}

variable "alert_email" {
  description = "E-mail que recebe alertas de monitoring/uptime."
  type        = string
  default     = "alerts@draftklub.com"
}

variable "api_uptime_host" {
  description = "Hostname do API pra uptime check (sem https://). Ex.: draftklub-api-xxx.run.app ou api.draftklub.com."
  type        = string
  default     = ""
}

variable "web_uptime_host" {
  description = "Hostname do web pra uptime check (sem https://). Vazio desabilita o check do web."
  type        = string
  default     = ""
}
