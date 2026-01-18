# Enable required APIs
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

# Cloud Run Service for Fullstack App
resource "google_cloud_run_v2_service" "default" {
  name     = var.service_name
  location = var.region
  ingress = "INGRESS_TRAFFIC_ALL" # Public access for UI

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
    "serviceAccount:${google_service_account.dispatch_sa.email}", # Self-invoke?
    "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com" # Default compute SA (often used by Eventarc)
  ]
}

# We need the Eventarc Identity to have permission to invoke Cloud Run
# 1. Get the project number
data "google_project" "project" {}

# 2. Grant the Pub/Sub publisher role to the Eventarc identity (managed by Google)
# Actually, for Pub/Sub triggers, Eventarc creates a subscription.
# The Eventarc service agent needs roles/run.invoker binding on the service (done above generally)
# and roles/eventarc.eventReceiver.

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

# Cloud Build Trigger for Fullstack Branch
resource "google_cloudbuild_trigger" "fullstack_trigger" {
  name        = "fullstack-deploy"
  description = "Deploy Fullstack App on push to fullstack branch"

  # Use GitHub connection (requires Cloud Build GitHub App installed on the repo)
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
