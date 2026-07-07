import { Router } from 'express';
import { config } from '../config.js';
import { query } from '../db/bigquery.js';
import { listRecentSubmissions, listSubmissionsByClusterKey } from '../db/firestore.js';
import { publicUrlFor } from '../db/storage.js';

export const adminRouter = Router();

adminRouter.use((req, res, next) => {
  if (req.query.token !== config.adminToken) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
});

adminRouter.get('/rankings', async (_req, res) => {
  try {
    const rows = await query(`
      SELECT * FROM \`${config.gcpProjectId}.${config.bigqueryDataset}.ranked_projects\`
      ORDER BY priority_score DESC
      LIMIT 50
    `);
    res.json(rows);
  } catch (err) {
    console.error('rankings query failed', err.message);
    res.status(500).json({ error: 'rankings_unavailable', message: err.message });
  }
});

adminRouter.get('/map', async (_req, res) => {
  try {
    const rows = await query(`
      SELECT submission_id, theme, urgency, lat, lng, location_text, resolved_place, created_at
      FROM \`${config.gcpProjectId}.${config.bigqueryDataset}.submissions_enriched\`
      WHERE lat IS NOT NULL AND lng IS NOT NULL
    `);
    res.json(rows);
  } catch (err) {
    console.error('map query failed', err.message);
    res.status(500).json({ error: 'map_unavailable', message: err.message });
  }
});

adminRouter.get('/stats', async (_req, res) => {
  try {
    const rows = await query(`
      SELECT
        COUNT(*) AS total_submissions,
        COUNT(DISTINCT theme) AS theme_count,
        COUNT(DISTINCT location_text) AS ward_count
      FROM \`${config.gcpProjectId}.${config.bigqueryDataset}.submissions_enriched\`
    `);
    res.json(rows[0] || { total_submissions: 0, theme_count: 0, ward_count: 0 });
  } catch (err) {
    console.error('stats query failed', err.message);
    res.status(500).json({ error: 'stats_unavailable', message: err.message });
  }
});

adminRouter.get('/submissions', async (req, res) => {
  try {
    const { theme, location } = req.query;
    const rows = await listSubmissionsByClusterKey(theme, location, 100);
    const withMedia = rows.map((r) => ({
      ...r,
      audioUrl: publicUrlFor(r.audioUri),
      photoUrl: publicUrlFor(r.photoUri),
    }));
    res.json(withMedia);
  } catch (err) {
    console.error('submissions query failed', err.message);
    res.status(500).json({ error: 'submissions_unavailable', message: err.message });
  }
});

adminRouter.get('/submissions/live', async (_req, res) => {
  const rows = await listRecentSubmissions(50);
  res.json(rows);
});
