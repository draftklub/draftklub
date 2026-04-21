variable "project_id" { type = string }
variable "region" { type = string }
variable "vpc_network_id" { type = string }
variable "private_vpc_connection" { type = string }

variable "edition" {
  type    = string
  default = "ENTERPRISE"
  validation {
    condition     = contains(["ENTERPRISE", "ENTERPRISE_PLUS"], var.edition)
    error_message = "edition deve ser ENTERPRISE ou ENTERPRISE_PLUS"
  }
}

variable "tier" {
  type    = string
  default = "db-g1-small"
}

variable "high_availability" {
  type    = bool
  default = false
}

variable "disk_size_gb" {
  type    = number
  default = 10
}

variable "disk_autoresize_limit_gb" {
  type    = number
  default = 100
}

variable "pitr_enabled" {
  type    = bool
  default = false
}

variable "log_retention_days" {
  type    = number
  default = 1
}

variable "backup_retention_count" {
  type    = number
  default = 7
}

variable "max_connections" {
  type    = string
  default = "100"
}

variable "deletion_protection" {
  type    = bool
  default = true
}

variable "ipv4_enabled" {
  type    = bool
  default = false
}

variable "api_db_password" {
  type      = string
  sensitive = true
}
