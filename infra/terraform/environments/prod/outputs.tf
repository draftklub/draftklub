output "project_id" { value = module.project.project_id }
output "api_url" { value = module.cloud_run.api_url }
output "worker_url" { value = module.cloud_run.worker_url }
output "db_instance_name" { value = module.cloud_sql.instance_name }
output "db_connection_name" { value = module.cloud_sql.instance_connection_name }
output "db_private_ip" { value = module.cloud_sql.private_ip }
