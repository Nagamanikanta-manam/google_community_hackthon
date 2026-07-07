import { transcribeAudio } from './speechToText.js';
import { translateToEnglish } from './translate.js';
import { extractSubmissionDetails } from './geminiExtract.js';
import { geocodeLocation, isLiveGeoSource } from './geocode.js';
import { embedText } from './embed.js';
import { updateSubmission } from '../db/firestore.js';
import { insertSubmissionRow } from '../db/bigquery.js';
import { config } from '../config.js';

/**
 * Runs the full enrichment pipeline for one submission and persists the result
 * to Firestore (live doc) and BigQuery (flattened analytics row).
 */
export async function runPipeline({ id, textRaw, languageKey, audioBuffer, audioEncoding, photoBuffer, photoMimeType, gpsLatLng, createdAt }) {
  let transcriptOriginal = textRaw || '';
  let sttLanguageCode = null;
  let sttSource = 'skipped';

  if (audioBuffer) {
    const stt = await transcribeAudio(audioBuffer, languageKey, audioEncoding);
    transcriptOriginal = stt.transcript;
    sttLanguageCode = stt.languageCode;
    sttSource = stt.source;
  }

  const { translated: transcriptEn, detectedLanguage, source: translateSource } = await translateToEnglish(transcriptOriginal);

  const extracted = await extractSubmissionDetails({
    textEn: transcriptEn,
    photoBuffer,
    photoMimeType,
  });

  const locationText = extracted.location_mentions?.[0] || '';
  const geo = await geocodeLocation(locationText, gpsLatLng);

  const embedding = await embedText(extracted.summary_en || transcriptEn);

  const enriched = {
    status: 'done',
    transcriptOriginal,
    transcriptEn,
    detectedLanguage: sttLanguageCode ? sttLanguageCode.split('-')[0] : detectedLanguage,
    theme: extracted.theme,
    urgency: extracted.urgency,
    sentiment: extracted.sentiment,
    summaryEn: extracted.summary_en,
    locationText,
    locationTextLower: locationText.toLowerCase(),
    isInfrastructureDamage: !!extracted.is_infrastructure_damage,
    damageSeverity: extracted.damage_severity_from_photo || 0,
    damageDescription: extracted.damage_description || '',
    lat: geo.lat,
    lng: geo.lng,
    resolvedPlace: geo.resolved_place,
    geoSource: geo.source,
    embedding,
    processedAt: new Date().toISOString(),
    stageSources: {
      stt: sttSource,
      translate: translateSource,
      extraction: extracted.source,
      geocode: isLiveGeoSource(geo.source) ? 'live' : 'simulated',
      embedding: config.mockGemini || !config.geminiApiKey ? 'simulated' : 'live',
    },
  };

  await updateSubmission(id, enriched);

  await insertSubmissionRow({
    submission_id: id,
    created_at: createdAt,
    theme: enriched.theme,
    urgency: enriched.urgency,
    sentiment: enriched.sentiment,
    summary_en: enriched.summaryEn,
    location_text: enriched.locationText,
    resolved_place: enriched.resolvedPlace,
    lat: enriched.lat,
    lng: enriched.lng,
    is_infrastructure_damage: enriched.isInfrastructureDamage,
    damage_severity: enriched.damageSeverity,
    embedding_json: JSON.stringify(enriched.embedding),
  });

  return enriched;
}
