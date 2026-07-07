import { Storage } from '@google-cloud/storage';
import { config } from '../config.js';

const storage = new Storage({ projectId: config.gcpProjectId });

export async function uploadBuffer(buffer, destPath, contentType) {
  const bucket = storage.bucket(config.bucketName);
  const file = bucket.file(destPath);
  await file.save(buffer, { contentType, resumable: false });
  return `gs://${config.bucketName}/${destPath}`;
}

export function publicUrlFor(gcsUri) {
  if (!gcsUri) return null;
  const [, , bucket, ...rest] = gcsUri.split('/');
  return `https://storage.googleapis.com/${bucket}/${rest.join('/')}`;
}
