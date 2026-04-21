output "network_id" { value = google_compute_network.vpc.id }
output "subnet_id" { value = google_compute_subnetwork.subnet.id }
output "connector_id" { value = google_vpc_access_connector.connector.id }
output "connector_name" { value = google_vpc_access_connector.connector.name }
output "private_vpc_connection" { value = google_service_networking_connection.private_vpc_connection.id }
