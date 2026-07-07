import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { config } from '../config.js';

const THEMES = [
  'road_infra',
  'water_supply',
  'school_education',
  'health',
  'electricity',
  'sanitation',
  'other',
];

const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    theme: { type: SchemaType.STRING, enum: THEMES },
    urgency: { type: SchemaType.NUMBER, description: '1-5, 5 is most urgent' },
    sentiment: { type: SchemaType.NUMBER, description: '-1 (very negative) to 1 (very positive)' },
    summary_en: { type: SchemaType.STRING, description: 'one-line English summary' },
    location_mentions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    is_infrastructure_damage: { type: SchemaType.BOOLEAN },
    damage_severity_from_photo: {
      type: SchemaType.NUMBER,
      description: '0 if no photo or no visible damage, else 1-5',
    },
    damage_description: { type: SchemaType.STRING },
  },
  required: ['theme', 'urgency', 'sentiment', 'summary_en', 'location_mentions'],
};

function mockExtraction(textEn, hasPhoto) {
  return {
    theme: 'road_infra',
    urgency: 4,
    sentiment: -0.6,
    summary_en: textEn?.slice(0, 140) || 'Citizen reported a broken road needing urgent repair.',
    location_mentions: ['Ramapuram'],
    is_infrastructure_damage: hasPhoto,
    damage_severity_from_photo: hasPhoto ? 4 : 0,
    damage_description: hasPhoto ? 'Photo shows a large water-filled pothole on a paved road.' : '',
    source: 'simulated',
  };
}

export async function extractSubmissionDetails({ textEn, photoBuffer, photoMimeType }) {
  if (config.mockGemini || !config.geminiApiKey) {
    return mockExtraction(textEn, !!photoBuffer);
  }

  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const model = genAI.getGenerativeModel({
    model: config.geminiModel,
    generationConfig: { responseMimeType: 'application/json', responseSchema },
  });

  const parts = [
    {
      text: `You are analyzing a citizen development request submitted to a Member of Parliament's office.
Classify it and extract structured fields. The English text (translated from the citizen's original language) is:
"""${textEn}"""
${photoBuffer ? 'A photo was attached - use it jointly with the text to assess infrastructure damage severity if relevant.' : 'No photo was attached.'}`,
    },
  ];

  if (photoBuffer) {
    parts.push({
      inlineData: {
        data: photoBuffer.toString('base64'),
        mimeType: photoMimeType || 'image/jpeg',
      },
    });
  }

  const result = await model.generateContent(parts);
  const json = JSON.parse(result.response.text());
  return { ...json, source: 'live' };
}
