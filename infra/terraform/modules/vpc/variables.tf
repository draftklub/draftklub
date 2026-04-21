variable "project_id" { type = string }
variable "region" { type = string }
variable "subnet_cidr" {
  type    = string
  default = "10.0.0.0/24"
}
variable "connector_machine_type" {
  type    = string
  default = "e2-micro"
}
variable "apis_ready" {
  type        = any
  description = "Dependência explícita nas APIs habilitadas"
  default     = null
}
