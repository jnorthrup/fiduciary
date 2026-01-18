variable "project_id" {
  type = string
}

variable "service_account_name" {
  type    = string
  default = "ledger-svc-acc"
}

variable "namespace" {
  type    = string
  default = "default"
}

variable "k8s_service_account_name" {
  type    = string
  default = "ledger-ksa"
}

resource "google_service_account" "sa" {
  account_id   = var.service_account_name
  display_name = "Workload Identity Service Account for Ledger"
  project      = var.project_id
}

resource "google_project_iam_member" "sa_roles" {
  for_each = toset([
    "roles/cloudsql.client",
    "roles/storage.objectViewer",
    "roles/pubsub.publisher",
    "roles/pubsub.subscriber"
  ])
  project = var.project_id
  role    = each.key
  member  = "serviceAccount:${google_service_account.sa.email}"
}

resource "google_service_account_iam_member" "workload_identity_user" {
  service_account_id = google_service_account.sa.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[${var.namespace}/${var.k8s_service_account_name}]"
}

output "service_account_email" {
  value = google_service_account.sa.email
}
