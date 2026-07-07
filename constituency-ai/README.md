# Constituency Priorities — AI for Constituency Development Planning

Citizens submit development needs by voice, text, or photo in their own language. The
system transcribes, translates, and extracts structured signals (theme, urgency,
location, photo damage) with Gemini, clusters near-duplicate reports by embedding
similarity, and scores each cluster against real demographic/infrastructure data to
produce a ranked, evidence-backed list of recommended works for an MP's office —
plus a hotspot map and drill-down into the underlying citizen reports.

## Architecture

```
Citizen Web App (React+Vite)
  -> Cloud Run API (Node/Express)
      -> Cloud Storage (raw audio/photo)
      -> Firestore (per-submission doc, live status)
      -> Pipeline: Speech-to-Text -> Translation API -> Gemini (multimodal) -> Geocoding -> Embeddings
      -> BigQuery (flattened row: submissions_enriched)
  -> BigQuery: cosine-similarity clustering -> demand_clusters
  -> BigQuery: scoring SQL joins demand_clusters x constituency_reference -> ranked_projects
  -> MP Dashboard (React): ranked list w/ rationale, heatmap, theme filter, drill-down
```

## Dataset

`data/constituency_reference.csv` is a hand-crafted 16-village dataset modeled on the
Census of India / data.gov.in "Village Amenities" schema (population, school
enrollment, distance to nearest school/hospital, water/electrification coverage, road
type) for villages in Anantapur district, Andhra Pradesh. This was deliberately used
instead of a live government-portal download to keep the 1-2 day build timeline safe —
swap in a real cleaned extract by keeping the same column names.

## Running locally

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

The backend listens on `http://localhost:8080`. It does **not** mock Firestore, BigQuery,
or Cloud Storage — those always hit your real GCP project (see
[`infra/gcp_setup.md`](infra/gcp_setup.md)), since a project with Firestore/BigQuery/a
bucket provisioned is required for any submission or dashboard call to succeed at all.

Each AI/ML stage has its own mock flag, defaulting to **live** wherever the underlying
API actually works today:

| Flag | Default | Stage |
|---|---|---|
| `MOCK_STT` | `false` (live) | Speech-to-Text |
| `MOCK_TRANSLATE` | `false` (live) | Translation |
| `MOCK_GEOCODE` | `false` (live) | Geocoding |
| `MOCK_GEMINI` | `true` (mocked) | Gemini extraction + embeddings — both share one API key/billing surface, currently blocked (see note below) |
| `USE_MOCKS` | `false` | Global override — set `true` to force **everything** to mock, e.g. as a demo-day safety net if connectivity drops |

Every citizen submission's result card shows a small **Live**/**Simulated** badge next
to each field (Transcript, Translation, Theme, Location), so it's always visible which
stages ran for real. As of this build, `GEMINI_API_KEY` is set but blocked by a billing
issue on the underlying Google AI Studio project (tested across both the AI Studio
prepay tier and Vertex AI — see git history/notes for the full troubleshooting trail);
`MOCK_GEMINI=true` is the honest default until that's resolved. `MAPS_API_KEY` is live
and working.

### 2. Load reference data + seed demo submissions

```bash
cd backend
npm run load-reference   # loads data/constituency_reference.csv into BigQuery
npm run seed             # seeds ~50 realistic multi-village submissions
npm run cluster          # groups submissions into demand_clusters by embedding similarity
npm run rank             # computes ranked_projects via the transparent scoring SQL
```

Re-run `npm run cluster && npm run rank` any time after new submissions come in
(including the ones you submit live through the citizen app) to refresh the dashboard.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # add VITE_MAPS_API_KEY to see the real heatmap (optional)
npm run dev
```

Open `http://localhost:5173` for the citizen submission form, and
`http://localhost:5173/mp-dashboard?token=demo` for the MP dashboard (`ADMIN_TOKEN` in
`backend/.env` must match the `token` query param).

### Offline submissions

If the citizen's device is offline (or a submission fails with a network-level error),
the report is saved locally (IndexedDB, including any photo/audio) instead of erroring
out, with a persistent "N reports saved on this device, waiting to send" banner. It
auto-sends the moment the browser comes back online — no separate action needed. Try it:
DevTools → Network → set to "Offline" → submit → go back to "Online" → watch it flush.

### WhatsApp intake (Twilio sandbox)

Citizens can also report via WhatsApp text, voice note, or photo — it reuses the exact
same AI pipeline as the web form (`backend/src/routes/whatsapp.js`).

1. Create a free account at [twilio.com/try-twilio](https://www.twilio.com/try-twilio),
   then Console → Messaging → Try it out → Send a WhatsApp message, to activate the
   sandbox. Note your **Account SID**, **Auth Token**, and the sandbox WhatsApp number.
2. From your own WhatsApp, send the sandbox's "join `<code>`" message once (one-time,
   per phone number).
3. In `backend/.env`, set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
   `TWILIO_WHATSAPP_FROM` (the sandbox number, e.g. `whatsapp:+14155238886`).
4. Twilio needs a **public HTTPS URL** to call — `localhost` isn't reachable. For local
   testing: `ngrok http 8080`, then set `PUBLIC_BASE_URL` in `backend/.env` to the
   printed `https://...ngrok-free.app` URL (no trailing slash). For the live demo,
   prefer deploying the backend to Cloud Run instead (`Dockerfile` already exists) —
   free-tier ngrok URLs change on every restart, which is too fragile for stage.
5. In the Twilio Console sandbox settings, set "When a message comes in" to
   `<PUBLIC_BASE_URL>/webhooks/whatsapp` (POST).
6. Text the sandbox number a complaint. You'll get a reply within a few seconds
   summarizing the extracted theme/urgency, and the submission appears on the MP
   dashboard exactly like a web submission.

`TWILIO_VALIDATE_SIGNATURE=true` (default) verifies every incoming webhook is genuinely
from Twilio — never set it to `false` outside of local wiring/debugging.

## 7-minute demo script

1. **Problem (30s)** — MPs get scattered complaints across languages/channels with no
   objective way to prioritize them against real need.
2. **Citizen side, live (60s)** — Open the web app, record a short voice complaint,
   attach a photo, submit. Any phone browser, no app install.
3. **Show the AI working (45s)** — The result card shows the transcript, English
   translation, extracted theme/urgency, and (if a photo was attached) the damage
   assessment, each tagged **Live** or **Simulated** — real transcription, translation,
   and geocoding today; Gemini extraction is honestly labeled simulated pending a
   billing fix, not hidden behind a blanket "it's all mocked" disclaimer.
4. **WhatsApp (45s)** — Send the same kind of complaint to the Twilio sandbox number
   from a phone; show the reply arriving with the extracted theme/urgency, and the
   submission landing on the MP dashboard identically to a web submission — same
   pipeline, no special-casing.
5. **Offline (30s)** — Toggle the browser to offline, submit, show the "saved on this
   device, waiting to send" banner, toggle back online, watch it auto-send.
6. **MP dashboard (60s)** — Point at the ranked list; read a rationale sentence aloud,
   highlighting the real demographic evidence behind the score (enrollment vs.
   distance, population vs. hospital distance, etc.).
7. **Map (45s)** — Show the hotspot heatmap, filter by theme, click a hotspot to drill
   into the raw submissions behind it.
8. **Close (30s)** — Same Firestore/BigQuery/Cloud Run pipeline scales to more
   constituencies via configuration, not a rewrite; WhatsApp today, IVR/SMS the same
   shape tomorrow.

## Known limitations (by design, for a limited build window)

- No authentication — the MP dashboard is gated only by a query-string token.
- Reference dataset is a small hand-crafted CSV, not a live government data feed.
- Submission processing is synchronous (the citizen UI waits on the full AI pipeline);
  fine for demo volume, would move to a queue (Cloud Tasks/Pub/Sub) at real scale.
- Audio/photo playback in the drill-down assumes the Cloud Storage bucket allows public
  read of uploaded objects; use signed URLs before handling real citizen data.
- The offline queue only survives a browser reload while the page shell itself is
  already cached — there's no service worker, so a hard reload with zero cache and zero
  network shows the browser's native offline page, not the app. A full offline-first
  PWA (service worker + cached app shell) would close this gap.
- The WhatsApp webhook only reads the first media attachment per message
  (`MediaUrl0`) — sufficient for the demo, not a general multi-attachment handler.
