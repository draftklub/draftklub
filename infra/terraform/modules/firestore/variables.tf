variable "project_id" { type = string }
variable "region" { type = string }
variable "delete_protection" {
  type    = bool
  default = false
}
variable "apis_ready" {
  type    = any
  default = null
}
