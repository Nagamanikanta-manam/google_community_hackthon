import { openDB } from 'idb';

const DB_NAME = 'constituency-ai-offline';
const STORE = 'pendingSubmissions';

function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE, { keyPath: 'id' });
    },
  });
}

export async function queueSubmission(entry) {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.add(STORE, {
    id,
    createdAt: new Date().toISOString(),
    status: 'pending',
    attempts: 0,
    lastError: null,
    ...entry,
  });
  return id;
}

export async function getQueuedSubmissions() {
  const db = await getDb();
  return db.getAll(STORE);
}

export function getPendingCount() {
  return getQueuedSubmissions().then((items) => items.length);
}

// A bare fetch() throws a TypeError when the network layer itself fails (offline,
// DNS failure, connection refused) - as opposed to an HTTP error response, which
// submitCitizenReport turns into a different Error carrying a server message. Only
// the former should be queued for retry; the latter is a real processing failure.
export function isNetworkError(err) {
  return err instanceof TypeError;
}

let flushing = false;

export async function flushQueue(submitFn) {
  if (flushing) return;
  flushing = true;
  try {
    const db = await getDb();
    const items = (await db.getAll(STORE)).filter((i) => i.status !== 'sending');
    for (const item of items) {
      await db.put(STORE, { ...item, status: 'sending' });
      try {
        await submitFn({
          text: item.text,
          languageKey: item.languageKey,
          audioBlob: item.audioBlob,
          photoFile: item.photoBlob,
          citizenName: item.citizenName,
          citizenPhone: item.citizenPhone,
          lat: item.lat,
          lng: item.lng,
        });
        await db.delete(STORE, item.id);
      } catch (err) {
        await db.put(STORE, { ...item, status: 'failed', attempts: item.attempts + 1, lastError: err.message });
      }
    }
  } finally {
    flushing = false;
  }
}
