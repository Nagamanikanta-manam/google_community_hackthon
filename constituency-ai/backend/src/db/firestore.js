import { Firestore } from '@google-cloud/firestore';
import { config } from '../config.js';

export const firestore = new Firestore({ projectId: config.gcpProjectId });

export const submissionsCollection = () => firestore.collection('submissions');

export async function createSubmission(id, data) {
  await submissionsCollection().doc(id).set(data);
}

export async function updateSubmission(id, patch) {
  await submissionsCollection().doc(id).set(patch, { merge: true });
}

export async function getSubmission(id) {
  const doc = await submissionsCollection().doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

export async function listSubmissionsByIds(ids) {
  if (!ids.length) return [];
  const docs = await firestore.getAll(...ids.map((id) => submissionsCollection().doc(id)));
  return docs.filter((d) => d.exists).map((d) => ({ id: d.id, ...d.data() }));
}

export async function listRecentSubmissions(limit = 50) {
  const snap = await submissionsCollection().orderBy('createdAt', 'desc').limit(limit).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listSubmissionsByClusterKey(theme, locationText, limit = 50) {
  let ref = submissionsCollection().where('status', '==', 'done');
  if (theme) ref = ref.where('theme', '==', theme);
  // Cluster keys (from BigQuery) are lowercased for grouping; match against the same
  // normalized field rather than the original-cased locationText.
  if (locationText) ref = ref.where('locationTextLower', '==', locationText.toLowerCase());
  const snap = await ref.limit(limit).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
