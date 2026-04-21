resource "google_compute_network" "vpc" {
  name                    = "draftklub-vpc"
  project                 = var.project_id
  auto_create_subnetworks = false

  depends_on = [var.apis_ready]
}

resource "google_compute_subnetwork" "subnet" {
  name          = "draftklub-subnet"
  project       = var.project_id
  region        = var.region
  network       = google_compute_network.vpc.id
  ip_cidr_range = var.subnet_cidr

  private_ip_google_access = true
}

resource "google_vpc_access_connector" "connector" {
  name    = "draftklub-connector"
  project = var.project_id
  region  = var.region

  subnet {
    name       = google_compute_subnetwork.subnet.name
    project_id = var.project_id
  }

  machine_type  = var.connector_machine_type
  min_instances = 2
  max_instances = 3

  depends_on = [google_compute_subnetwork.subnet]
}

resource "google_compute_global_address" "private_ip_range" {
  name          = "draftklub-private-ip-range"
  project       = var.project_id
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]
}
