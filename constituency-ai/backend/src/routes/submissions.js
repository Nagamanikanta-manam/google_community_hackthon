import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { createSubmission, getSubmission } from '../db/firestore.js';
import { uploadBuffer } from '../db/storage.js';
import { runPipeline } from '../pipeline/runPipeline.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

export const submissionsRouter = Router();

submissionsRouter.post(
  '/',
  upload.fields([{ name: 'audio', maxCount: 1 }, { name: 'photo', maxCount: 1 }]),
  async (req, res) => {
    try {
      const id = uuidv4();
      const createdAt = new Date().toISOString();
      const { text, languageKey, citizenName, citizenPhone, lat, lng } = req.body;

      const audioFile = req.files?.audio?.[0];
      const photoFile = req.files?.photo?.[0];

      let audioUri = null;
      let photoUri = null;

      if (audioFile) {
        audioUri = await uploadBuffer(audioFile.buffer, `audio/${id}.webm`, audioFile.mimetype);
      }
      if (photoFile) {
        photoUri = await uploadBuffer(photoFile.buffer, `photos/${id}.jpg`, photoFile.mimetype);
      }

      const gpsLatLng = lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null;

      await createSubmission(id, {
        status: 'processing',
        textRaw: text || null,
        languageKey: languageKey || 'hi',
        citizenName: citizenName || null,
        citizenPhone: citizenPhone || null,
        audioUri,
        photoUri,
        gpsLatLng,
        createdAt,
      });

      // Respond immediately so the citizen UI isn't blocked on the full pipeline,
      // but for a hackathon demo we await it here so the UI can show a simple spinner
      // and then the enriched result in one round trip.
      const enriched = await runPipeline({
        id,
        textRaw: text,
        languageKey: languageKey || 'hi',
        audioBuffer: audioFile?.buffer,
        photoBuffer: photoFile?.buffer,
        photoMimeType: photoFile?.mimetype,
        gpsLatLng,
        createdAt,
      });

      res.json({ id, ...enriched });
    } catch (err) {
      console.error('Submission processing failed:', err);
      res.status(500).json({ error: 'submission_failed', message: err.message });
    }
  }
);

submissionsRouter.get('/:id', async (req, res) => {
  try {
    const submission = await getSubmission(req.params.id);
    if (!submission) {
      return res.status(404).json({ error: 'not_found', message: 'No report found with that ID.' });
    }
    // Drop the embedding vector - it's large and only meaningful to the clustering pipeline.
    const { embedding, ...publicFields } = submission;
    res.json(publicFields);
  } catch (err) {
    console.error('Submission lookup failed:', err);
    res.status(500).json({ error: 'lookup_failed', message: err.message });
  }
});
