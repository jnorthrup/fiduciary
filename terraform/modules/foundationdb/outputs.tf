output "cluster_name" {
  description = "FoundationDB GKE cluster name"
  value       = google_container_cluster.foundationdb.name
}

output "cluster_endpoint" {
  description = "GKE cluster endpoint"
  value       = google_container_cluster.foundationdb.endpoint
}

output "cluster_ca_certificate" {
  description = "GKE cluster CA certificate"
  value       = google_container_cluster.foundationdb.master_auth[0].cluster_ca_certificate
  sensitive   = true
}

output "service_account_email" {
  description = "FoundationDB service account email"
  value       = google_service_account.fdb.email
}

output "fdb_cluster_spec_path" {
  description = "Path to generated FoundationDB cluster spec"
  value       = local_file.fdb_cluster_spec.filename
}

output "fdb_service_spec_path" {
  description = "Path to generated FoundationDB service spec"
  value       = local_file.fdb_service_spec.filename
}
