# GCP Setup

Target project: **`constituency-ai-2026`** (created fresh; the original `gdgdemo-2026`
project was found deleted/in its recovery window and was not reused). The code defaults
to this project ID via `GCP_PROJECT_ID` in `backend/.env` — change it if you use a
different project.

```bash
# 1. Set the active project (skip if already set)
gcloud config set project constituency-ai-2026

# 2. Confirm billing is linked (required for Speech-to-Text, Translation, BigQuery, Maps)
gcloud billing projects describe constituency-ai-2026

# 3. Enable required APIs
gcloud services enable \
  run.googleapis.com \
  speech.googleapis.com \
  translate.googleapis.com \
  firestore.googleapis.com \
  datastore.googleapis.com \
  bigquery.googleapis.com \
  storage.googleapis.com \
  geocoding-backend.googleapis.com \
  maps-backend.googleapis.com \
  aiplatform.googleapis.com

# 4. Local dev auth (Application Default Credentials) — sufficient for local dev,
#    since your own gcloud user is Owner on the project. No service account needed
#    until you deploy to Cloud Run (see below).
gcloud auth application-default login
gcloud auth application-default set-quota-project constituency-ai-2026

# 5. Firestore — create a Native-mode database (one-time, per project)
gcloud firestore databases create --location=asia-south1 --type=firestore-native
# NOTE: right after project creation this can transiently fail with
# "Projects instance [X] not found: Permission denied" for a minute or two while the
# project propagates through Firestore's control plane. Wait ~30-60s and retry.

# 6. BigQuery dataset + tables
bq mk --dataset --location=asia-south1 constituency-ai-2026:constituency
bq query --use_legacy_sql=false --project_id=constituency-ai-2026 < infra/bigquery_schema.sql

# 7. Cloud Storage bucket for raw audio/photo uploads
gsutil mb -l asia-south1 -p constituency-ai-2026 gs://constituency-ai-2026-uploads

# 8. Gemini API key — NOT part of gcloud IAM. Get one from https://aistudio.google.com/apikey
#    and put it in backend/.env as GEMINI_API_KEY.

# 9. Maps Platform key (console.cloud.google.com > APIs & Services > Credentials)
#    restrict it to Maps JavaScript API + Geocoding API, and to your dev/demo origin.
#    Put it in frontend/.env as VITE_MAPS_API_KEY and backend/.env as MAPS_API_KEY.
```

**Windows note:** if `bq`/`gsutil` fail with `python3.14: command not found` (a recent
Python install can confuse the bundled Cloud SDK's interpreter detection), set
`CLOUDSDK_PYTHON` to a real `python.exe` path before running them, e.g.:
```bash
export CLOUDSDK_PYTHON="/c/Python314/python"
```

## Service account (only needed for Cloud Run deploy, not local dev)

Local dev uses your own `gcloud auth application-default login` credentials, which
already have full access since you own the project. Only create a dedicated service
account when you actually deploy — and scope its roles deliberately rather than
grabbing `roles/editor`:

```bash
gcloud iam service-accounts create constituency-ai-sa \
  --display-name="Constituency AI backend"

# Grant only what the backend actually touches, not project-wide editor:
for role in roles/datastore.user roles/bigquery.dataEditor roles/bigquery.jobUser \
            roles/storage.objectAdmin; do
  gcloud projects add-iam-policy-binding constituency-ai-2026 \
    --member="serviceAccount:constituency-ai-sa@constituency-ai-2026.iam.gserviceaccount.com" \
    --role="$role"
done
```

## Deploying the backend to Cloud Run

```bash
cd backend
gcloud run deploy constituency-ai-backend \
  --source . \
  --region=asia-south1 \
  --allow-unauthenticated \
  --service-account=constituency-ai-sa@constituency-ai-2026.iam.gserviceaccount.com \
  --set-env-vars=GCP_PROJECT_ID=constituency-ai-2026,BQ_DATASET=constituency,GCS_BUCKET=constituency-ai-2026-uploads,USE_MOCKS=false \
  --set-secrets=GEMINI_API_KEY=gemini-api-key:latest,MAPS_API_KEY=maps-api-key:latest
```

(Store `GEMINI_API_KEY`/`MAPS_API_KEY` in Secret Manager first, or pass them as plain
`--set-env-vars` for a quick hackathon deploy — Secret Manager is the safer option if you
have a minute to spare.)

## Running without a Gemini/Maps key yet

Set `USE_MOCKS=true` in `backend/.env` (the default) to replace only the AI/ML calls
(Speech-to-Text, Translation, Gemini extraction, Geocoding, embeddings) with
deterministic mock responses — useful for frontend/UI work before those keys are ready,
or as a safety net if connectivity drops during a live demo. Firestore, BigQuery, and
Cloud Storage are never mocked; steps 5-7 above are required regardless of this flag.
