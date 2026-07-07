import { Translate } from '@google-cloud/translate/build/src/v2/index.js';
import { config } from '../config.js';

const translate = new Translate({ projectId: config.gcpProjectId });

export async function translateToEnglish(text) {
  if (!text) return { translated: '', detectedLanguage: 'en', source: 'skipped' };

  if (config.mockTranslate) {
    return { translated: `[mock translation of] ${text}`, detectedLanguage: 'hi', source: 'simulated' };
  }

  const [translated, metadata] = await translate.translate(text, 'en');
  return {
    translated,
    detectedLanguage: metadata?.data?.translations?.[0]?.detectedSourceLanguage || 'unknown',
    source: 'live',
  };
}
