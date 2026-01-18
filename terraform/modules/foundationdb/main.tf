# FoundationDB Terraform Module for GKE Autopilot
# Deploys FoundationDB cluster compatible with GKE Autopilot (scale-to-zero)

resource "google_container_cluster" "foundationdb" {
  name     = "${var.cluster_name}"
  location = var.region

  # Enable Autopilot
  enable_autopilot = true

  # Networking
  network    = var.network_id
  subnetwork = var.subnetwork_id

  # Private cluster
  private_cluster_config {
    enable_private_nodes = true
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  # Workload Identity for secure access
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Release channel
  release_channel {
    channel = "REGULAR"
  }

  # Remove default node pool (Autopilot manages nodes)
  remove_default_node_pool = true
  initial_node_count       = 1

  # IP allocation for Pods
  ip_allocation_policy {
    cluster_secondary_range_names = [
      var.pods_ip_range_name,
      var.services_ip_range_name
    ]
  }

  # Master auth
  master_auth {
    username = ""
    password = ""

    # Client certificate
    client_certificate_config {
      issue_client_certificate = false
    }
  }

  # Maintenance window
  maintenance_policy {
    daily_maintenance_window {
      start_time = "03:00"
    }
  }

  # Tags
  tags = var.tags
}

# FoundationDB StatefulSet (deployed via kubectl after cluster creation)
# This is referenced for documentation purposes
resource "local_file" "fdb_cluster_spec" {
  content = templatefile("${path.module}/templates/fdb-cluster.yaml.tmpl", {
    cluster_name      = var.cluster_name
    namespace         = var.namespace
    fdb_version       = var.fdb_version
    replication_factor = var.replication_factor
    storage_class     = var.storage_class
    storage_size      = var.storage_size
    coordinator_count = var.coordinator_count
  })

  filename = "${path.module}/generated/fdb-cluster.yaml"
}

resource "local_file" "fdb_service_spec" {
  content = templatefile("${path.module}/templates/fdb-service.yaml.tmpl", {
    cluster_name = var.cluster_name
    namespace    = var.namespace
  })

  filename = "${path.module}/generated/fdb-service.yaml"
}

# Service account for FoundationDB pods
resource "google_service_account" "fdb" {
  account_id   = "${var.cluster_name}-fdb"
  display_name = "FoundationDB Service Account"
}

# IAM binding for Workload Identity
resource "google_service_account_iam_member" "fdb_workload_identity" {
  service_account_id = google_service_account.fdb.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[${var.namespace}/foundationdb]"
}

# Grant GCS access (for backups)
resource "google_project_iam_member" "fdb_storage" {
  for_each = toset(var.storage_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.fdb.email}"
}
