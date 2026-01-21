terraform {
  required_version = ">= 1.5.0"

  backend "gcs" {
    bucket = "fiduciary-terraform-state"
    prefix = "terraform/state/prod"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}
