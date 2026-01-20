# Enable required APIs
resource "google_project_service" "compute_api" {
  service = "compute.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "storage_api" {
  service = "storage.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "run_api" {
  service = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "eventarc_api" {
  service = "eventarc.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "pubsub_api" {
  service = "pubsub.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloudbuild_api" {
  service = "cloudbuild.googleapis.com"
  disable_on_destroy = false
}

# GCS Static Hosting (replaces Firebase Hosting)
resource "google_storage_bucket" "static_hosting" {
  count         = var.enable_gcs_hosting ? 1 : 0
  name          = "${var.project_id}-fullstack-static"
  location      = "US"
  force_destroy = false

  uniform_bucket_level_access = true

  website {
    main_page_suffix = "index.html"
    not_found_page   = "404.html"
  }

  lifecycle {
    prevent_destroy = false
  }
}

# Make bucket publicly readable
resource "google_storage_bucket_iam_member" "static_public" {
  count  = var.enable_gcs_hosting ? 1 : 0
  bucket = google_storage_bucket.static_hosting[0].name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# Cloud CDN for GCS backend
resource "google_compute_backend_bucket" "static_backend" {
  count       = var.enable_cloud_cdn && var.enable_gcs_hosting ? 1 : 0
  name        = "${var.project_id}-fullstack-backend"
  description = "GCS backend for static hosting"
  bucket_name = google_storage_bucket.static_hosting[0].name
  enable_cdn  = true

  cdn_policy {
    signed_url_cache_max_age_sec = 0
    default_cache_mode            = "CACHE_MODE_STATIC"
    client_ttl                   = 3600
    max_ttl                      = 86400
    serve_while_stale             = 86400
  }
}

resource "google_compute_url_map" "static_lb" {
  count           = var.enable_cloud_cdn && var.enable_gcs_hosting ? 1 : 0
  name            = "${var.project_id}-fullstack-lb"
  default_service = google_compute_backend_bucket.static_backend[0].id
}

resource "google_compute_target_http_proxy" "static_proxy" {
  count   = var.enable_cloud_cdn && var.enable_gcs_hosting ? 1 : 0
  name    = "${var.project_id}-fullstack-proxy"
  url_map = google_compute_url_map.static_lb[0].id
}

resource "google_compute_global_forwarding_rule" "static_forwarding" {
  count       = var.enable_cloud_cdn && var.enable_gcs_hosting ? 1 : 0
  name        = "${var.project_id}-fullstack-forwarding"
  target      = google_compute_target_http_proxy.static_proxy[0].id
  port_range  = "80"
  ip_protocol = "TCP"
}

# Pub/Sub Topic for Dispatch Events
resource "google_pubsub_topic" "dispatch_topic" {
  name = "payment-order-dispatch"
  depends_on = [google_project_service.pubsub_api]
}

# Service Account for the Dispatch Service
resource "google_service_account" "dispatch_sa" {
  account_id   = "dispatch-sa"
  display_name = "Dispatch Service Account"
}

# Cloud Run Service for Fullstack App (optional - keep for API server)
resource "google_cloud_run_v2_service" "default" {
  name     = var.service_name
  location = var.region
  ingress = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.dispatch_sa.email
    containers {
      image = var.image_url
      env {
        name  = "LOG_LEVEL"
        value = "info"
      }
      ports {
        container_port = 3001
      }
    }
  }

  depends_on = [google_project_service.run_api]
}

# Allow Eventarc to invoke the service
resource "google_cloud_run_service_iam_binding" "invoker" {
  location = google_cloud_run_v2_service.default.location
  service  = google_cloud_run_v2_service.default.name
  role     = "roles/run.invoker"
  members = [
    "serviceAccount:${google_service_account.dispatch_sa.email}",
    "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
  ]
}

# We need the Eventarc Identity to have permission to invoke Cloud Run
data "google_project" "project" {}

# Eventarc Trigger
resource "google_eventarc_trigger" "trigger" {
  name     = "${var.service_name}-trigger"
  location = var.region
  matching_criteria {
    attribute = "type"
    value     = "google.cloud.pubsub.topic.v1.messagePublished"
  }
  destination {
    cloud_run_service {
      service = google_cloud_run_v2_service.default.name
      region  = var.region
    }
  }
  transport {
    pubsub {
      topic = google_pubsub_topic.dispatch_topic.id
    }
  }
  service_account = google_service_account.dispatch_sa.email

  depends_on = [google_project_service.eventarc_api]
}

# Grant the Eventarc trigger service account permission to invoke the Cloud Run service
resource "google_cloud_run_service_iam_member" "eventarc_invoker" {
  location = google_cloud_run_v2_service.default.location
  service  = google_cloud_run_v2_service.default.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.dispatch_sa.email}"
}

# Cloud Build Trigger for GCS Static Deployment (Fullstack Branch)
resource "google_cloudbuild_trigger" "gcs_static_deploy" {
  count       = var.enable_gcs_hosting ? 1 : 0
  name        = "fullstack-gcs-deploy"
  description = "Deploy static frontend to GCS on push to fullstack branch (no Gmail auth)"

  github {
    owner = "jnorthrup"
    name  = "fiduciary"
    push {
      branch = "^fullstack$"
    }
  }

  filename = "cloudbuild-gcs.yaml"

  substitutions = {
    _GCS_BUCKET = "${var.project_id}-fullstack-static"
  }

  depends_on = [google_project_service.cloudbuild_api]
}

# Cloud Build Trigger for Cloud Run Deployment (existing - keep for API server)
resource "google_cloudbuild_trigger" "cloudrun_deploy" {
  name        = "fullstack-cloudrun-deploy"
  description = "Deploy API server to Cloud Run on push to fullstack branch"

  github {
    owner = "jnorthrup"
    name  = "fiduciary"
    push {
      branch = "^fullstack$"
    }
  }

  filename = "cloudbuild.yaml"

  substitutions = {
    _SERVICE_NAME = var.service_name
  }
}

# Output values
output "gcs_bucket_name" {
  value       = var.enable_gcs_hosting ? google_storage_bucket.static_hosting[0].name : null
  description = "GCS bucket name for static hosting"
}

output "gcs_bucket_url" {
  value       = var.enable_gcs_hosting ? "https://storage.googleapis.com/${google_storage_bucket.static_hosting[0].name}/index.html" : null
  description = "Direct GCS website URL"
}

output "cdn_lb_ip" {
  value       = var.enable_cloud_cdn && var.enable_gcs_hosting ? google_compute_global_forwarding_rule.static_forwarding[0].ip_address : null
  description = "Cloud CDN load balancer IP address"
}
