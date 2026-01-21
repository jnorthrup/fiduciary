# GCP Dispatch Service Architecture

This directory contains the Terraform configuration to deploy the Dispatch Service on Google Cloud Platform using Cloud Run and Eventarc.

## Architecture

- **Cloud Run**: Hosts the `dispatch-service` container (Serverless "Lambda").
- **Pub/Sub**: Topic `payment-order-dispatch` receives events.
- **Eventarc**: Listens to the Pub/Sub topic and triggers the Cloud Run service via HTTP POST.

## Prerequisites

1.  Google Cloud SDK (`gcloud`) installed.
2.  Terraform installed.
3.  A GCP Project.

## Deployment Steps

1.  **Build and Push Container Image**:
    Navigate to `../../services/dispatch-service` and build the image.
    ```bash
    export PROJECT_ID="your-project-id"
    gcloud builds submit --tag gcr.io/$PROJECT_ID/dispatch-service:latest .
    ```

2.  **Initialize Terraform**:
    ```bash
    cd infra/gcp
    terraform init
    ```

3.  **Apply Configuration**:
    Update the `image_url` variable or pass it via command line.
    ```bash
    terraform apply \
      -var="project_id=$PROJECT_ID" \
      -var="image_url=gcr.io/$PROJECT_ID/dispatch-service:latest"
    ```

4.  **Test**:
    Publish a message to the Pub/Sub topic.
    ```bash
    gcloud pubsub topics publish payment-order-dispatch --message='{"paymentId": "123"}'
    ```
    Check the Cloud Run logs to see the dispatch event processed.
