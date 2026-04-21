variable "project_id" {
  type        = string
  description = "ID único do projeto GCP (globalmente único)"
}

variable "display_name" {
  type        = string
  description = "Nome de exibição do projeto"
}

variable "organization_id" {
  type        = string
  description = "ID numérico da organization GCP"
}

variable "billing_account_id" {
  type        = string
  description = "ID da billing account (formato XXXXXX-XXXXXX-XXXXXX)"
}

variable "environment" {
  type        = string
  description = "Ambiente: dev, staging ou prod"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment deve ser dev, staging ou prod"
  }
}

variable "terraform_sa_email" {
  type        = string
  description = "Email da SA do Terraform (recebe roles/owner no projeto)"
}

variable "apis" {
  type        = list(string)
  description = "Lista de APIs a habilitar no projeto"
  default     = []
}
