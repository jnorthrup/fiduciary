resource "google_container_cluster" "primary" {
  name     = var.cluster_name
  location = var.region
  project  = var.project_id

  enable_autopilot = true

  network    = var.network
  subnetwork = var.subnetwork

  # Workload Identity is enabled by default in GKE Autopilot
  # but can be explicitly managed if needed.
  
  # Set release channel to regular
  release_channel {
    channel = "REGULAR"
  }

  ip_allocation_policy {
    # Using default ranges for VPC-native cluster
  }
}
