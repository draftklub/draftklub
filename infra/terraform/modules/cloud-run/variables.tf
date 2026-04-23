variable "project_id" { type = string }
variable "region" { type = string }
variable "environment" { type = string }
variable "vpc_connector_id" { type = string }
variable "api_sa_email" { type = string }
variable "worker_sa_email" { type = string }

variable "api_min_instances" {
  type    = number
  default = 0
}
variable "api_max_instances" {
  type    = number
  default = 5
}
variable "api_cpu" {
  type    = string
  default = "1"
}
variable "api_memory" {
  type    = string
  default = "512Mi"
}

variable "worker_min_instances" {
  type    = number
  default = 1
}
variable "worker_max_instances" {
  type    = number
  default = 3
}
variable "worker_cpu" {
  type    = string
  default = "1"
}
variable "worker_memory" {
  type    = string
  default = "512Mi"
}

variable "cloud_sql_instance" {
  type        = string
  default     = ""
  description = "Cloud SQL instance connection name (e.g. project:region:instance)"
}
