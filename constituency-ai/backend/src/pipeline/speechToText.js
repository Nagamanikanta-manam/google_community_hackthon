import { SpeechClient } from '@google-cloud/speech';
import { config } from '../config.js';

const client = new SpeechClient({ projectId: config.gcpProjectId });

const LANGUAGE_CODES = {
  hi: 'hi-IN',
  te: 'te-IN',
  en: 'en-IN',
};

export async function transcribeAudio(buffer, languageKey = 'hi', encodingOverride = null) {
  if (config.mockStt) {
    return {
      transcript: '[mock transcript] rasta bahut kharab hai, gaadi chalana mushkil hai',
      languageCode: LANGUAGE_CODES[languageKey] || 'hi-IN',
      source: 'simulated',
    };
  }

  const languageCode = LANGUAGE_CODES[languageKey] || 'hi-IN';
  const encodingConfig = encodingOverride || { encoding: 'WEBM_OPUS', sampleRateHertz: 48000 };
  const [response] = await client.recognize({
    audio: { content: buffer.toString('base64') },
    config: {
      ...encodingConfig,
      languageCode,
      alternativeLanguageCodes: Object.values(LANGUAGE_CODES).filter((c) => c !== languageCode),
      enableAutomaticPunctuation: true,
    },
  });

  const transcript = (response.results || [])
    .map((r) => r.alternatives?.[0]?.transcript || '')
    .join(' ')
    .trim();

  return { transcript, languageCode, source: 'live' };
}
