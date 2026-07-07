import 'dotenv/config';

// USE_MOCKS is a global override that always wins (the demo-day safety net if
// connectivity drops). Below that, each AI/ML stage has its own flag so stages
// that work today (STT/Translate/Geocode) can run live independently of Gemini
// extraction/embeddings, which share a single blocked billing surface and stay
// mocked by default until that's resolved.
const globalMock = process.env.USE_MOCKS === 'true';

function mockFlag(envVar, defaultValue) {
  if (globalMock) return true;
  const raw = process.env[envVar];
  return raw === undefined || raw === '' ? defaultValue : raw === 'true';
}

export const config = {
  gcpProjectId: process.env.GCP_PROJECT_ID || 'constituency-ai-2026',
  gcpLocation: process.env.GCP_LOCATION || 'asia-south1',
  bucketName: process.env.GCS_BUCKET || `${process.env.GCP_PROJECT_ID || 'constituency-ai-2026'}-uploads`,
  bigqueryDataset: process.env.BQ_DATASET || 'constituency',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  mapsApiKey: process.env.MAPS_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-004',
  districtName: process.env.DISTRICT_NAME || 'Anantapur, Andhra Pradesh, India',
  adminToken: process.env.ADMIN_TOKEN || 'demo',
  port: process.env.PORT || 8080,
  useMocks: globalMock,
  mockStt: mockFlag('MOCK_STT', false),
  mockTranslate: mockFlag('MOCK_TRANSLATE', false),
  mockGeocode: mockFlag('MOCK_GEOCODE', false),
  mockGemini: mockFlag('MOCK_GEMINI', true),
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
  twilioWhatsappFrom: process.env.TWILIO_WHATSAPP_FROM || '',
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, ''),
  // Dev-only escape hatch so the webhook can be exercised without a real Twilio
  // signature while wiring things up locally. Never false for the live demo.
  twilioValidateSignature: process.env.TWILIO_VALIDATE_SIGNATURE !== 'false',
};
