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
