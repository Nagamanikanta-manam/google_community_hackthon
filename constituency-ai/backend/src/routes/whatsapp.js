import { Router } from 'express';
import express from 'express';
import twilio from 'twilio';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import { createSubmission } from '../db/firestore.js';
import { uploadBuffer } from '../db/storage.js';
import { runPipeline } from '../pipeline/runPipeline.js';

const { MessagingResponse } = twilio.twiml;

export const whatsappRouter = Router();

// Twilio POSTs form-encoded, not JSON - scoped to this router only so it doesn't
// affect submissions.js's multipart handling or admin.js's JSON-free GETs.
whatsappRouter.use(express.urlencoded({ extended: false }));

function verifyTwilioSignature(req) {
  if (!config.twilioValidateSignature) {
    console.warn('WhatsApp webhook: signature validation disabled (dev-only escape hatch)');
    return true;
  }
  if (!config.publicBaseUrl) {
    console.error('WhatsApp webhook: PUBLIC_BASE_URL is not set, cannot validate the Twilio signature');
    return false;
  }
  // Any failure here (malformed URL, bad body, etc.) means "can't prove this request
  // is genuinely from Twilio" - treat it as a rejection, not fall through to the
  // route's generic error handler, which would otherwise mask a real 403 as a 200.
  try {
    const url = `${config.publicBaseUrl}${req.originalUrl}`;
    return twilio.validateRequest(config.twilioAuthToken, req.headers['x-twilio-signature'], url, req.body);
  } catch (err) {
    console.error('WhatsApp webhook: signature validation threw:', err.message);
    return false;
  }
}

async function downloadTwilioMedia(url) {
  const auth = Buffer.from(`${config.twilioAccountSid}:${config.twilioAuthToken}`).toString('base64');
  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, mimeType: res.headers.get('content-type') || 'application/octet-stream' };
}

function replyTwiml(res, message) {
  const twimlRes = new MessagingResponse();
  twimlRes.message(message);
  res.type('text/xml').send(twimlRes.toString());
}

whatsappRouter.post('/', async (req, res) => {
  // Twilio retries on any non-2xx/timeout response, which would otherwise create
  // duplicate submissions - always reply with valid TwiML, even on failure.
  try {
    if (!verifyTwilioSignature(req)) {
      return res.status(403).send('Forbidden');
    }

    const { From: from, Body: body, NumMedia: numMediaRaw, MediaUrl0: mediaUrl0, MediaContentType0: mediaContentType0 } =
      req.body;
    const numMedia = parseInt(numMediaRaw || '0', 10);

    const id = uuidv4();
    const createdAt = new Date().toISOString();
    // Firestore rejects `undefined` fields outright (unlike `null`) - initialize
    // explicitly so a text-only message doesn't crash the write.
    let audioBuffer, audioEncoding, photoBuffer, photoMimeType;
    let audioUri = null;
    let photoUri = null;

    if (numMedia > 0 && mediaUrl0) {
      const { buffer, mimeType } = await downloadTwilioMedia(mediaUrl0);
      if (mimeType.startsWith('audio/')) {
        audioBuffer = buffer;
        audioEncoding = { encoding: 'OGG_OPUS', sampleRateHertz: 16000 };
        audioUri = await uploadBuffer(buffer, `audio/${id}.ogg`, mimeType);
      } else if (mimeType.startsWith('image/')) {
        photoBuffer = buffer;
        photoMimeType = mimeType;
        photoUri = await uploadBuffer(buffer, `photos/${id}.jpg`, mimeType);
      } else {
        console.warn('WhatsApp webhook: unsupported media type, ignoring:', mimeType, mediaContentType0);
      }
    }

    await createSubmission(id, {
      status: 'processing',
      textRaw: body || null,
      languageKey: 'hi',
      audioUri,
      photoUri,
      gpsLatLng: null,
      createdAt,
      channel: 'whatsapp',
      waFrom: from,
    });

    const enriched = await runPipeline({
      id,
      textRaw: body,
      languageKey: 'hi',
      audioBuffer,
      audioEncoding,
      photoBuffer,
      photoMimeType,
      gpsLatLng: null,
      createdAt,
    });

    const themeLabel = (enriched.theme || 'other').replace(/_/g, ' ');
    let message = `Thank you. We've logged your report.\nTheme: ${themeLabel} | Urgency: ${enriched.urgency}/5\nSummary: ${enriched.summaryEn}\nYour MP's office will review it.`;
    if (config.mockGemini) {
      message += '\n(Note: AI analysis is simulated in this demo build.)';
    }
    replyTwiml(res, message);
  } catch (err) {
    console.error('WhatsApp webhook processing failed:', err);
    replyTwiml(res, "Thanks - we've received your message and are still processing it.");
  }
});
