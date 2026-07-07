import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';

function mockEmbedding(text) {
  // Deterministic pseudo-embedding derived from character codes, so identical/similar
  // text produces similar (but not identical) vectors for demo clustering purposes.
  const dims = 32;
  const vec = new Array(dims).fill(0);
  for (let i = 0; i < text.length; i++) {
    vec[i % dims] += text.charCodeAt(i);
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export async function embedText(text) {
  if (config.mockGemini || !config.geminiApiKey) {
    return mockEmbedding(text);
  }

  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const model = genAI.getGenerativeModel({ model: config.embeddingModel });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

export function cosineSimilarity(a, b) {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
