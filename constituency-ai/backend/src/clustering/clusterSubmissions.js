import { v4 as uuidv4 } from 'uuid';
import { pathToFileURL } from 'url';
import { bigquery, dataset, query } from '../db/bigquery.js';
import { cosineSimilarity } from '../pipeline/embed.js';
import { config } from '../config.js';

const SIMILARITY_THRESHOLD = 0.8;

/**
 * Groups submissions within the same theme+location by embedding similarity into
 * demand_clusters. This is deliberately not an LLM call: it's a deterministic,
 * inspectable clustering step over the embeddings produced during ingestion.
 */
export async function clusterSubmissions() {
  const rows = await query(`
    SELECT submission_id, created_at, theme, urgency, sentiment, summary_en,
           location_text, lat, lng, embedding_json
    FROM \`${config.gcpProjectId}.${config.bigqueryDataset}.submissions_enriched\`
    WHERE theme IS NOT NULL
  `);

  const groups = new Map();
  for (const row of rows) {
    const key = `${row.theme}::${(row.location_text || 'unknown').toLowerCase()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ ...row, embedding: JSON.parse(row.embedding_json || '[]') });
  }

  const clusters = [];
  for (const [key, submissions] of groups.entries()) {
    const [theme, locationText] = key.split('::');
    const localClusters = [];

    for (const sub of submissions) {
      let matched = null;
      for (const cluster of localClusters) {
        const sim = cosineSimilarity(cluster.centroid, sub.embedding);
        if (sim >= SIMILARITY_THRESHOLD) {
          matched = cluster;
          break;
        }
      }
      if (matched) {
        matched.members.push(sub);
      } else {
        localClusters.push({ centroid: sub.embedding, members: [sub] });
      }
    }

    for (const cluster of localClusters) {
      const members = cluster.members;
      const avgUrgency = members.reduce((s, m) => s + (m.urgency || 0), 0) / members.length;
      const avgSentiment = members.reduce((s, m) => s + (m.sentiment || 0), 0) / members.length;
      const mostRecent = members.reduce(
        (max, m) => (new Date(m.created_at) > new Date(max) ? m.created_at : max),
        members[0].created_at
      );
      const avgLat = members.reduce((s, m) => s + (m.lat || 0), 0) / members.length;
      const avgLng = members.reduce((s, m) => s + (m.lng || 0), 0) / members.length;

      clusters.push({
        cluster_id: uuidv4(),
        theme,
        location_text: locationText,
        submission_count: members.length,
        avg_urgency: avgUrgency,
        avg_sentiment: avgSentiment,
        most_recent_date: mostRecent,
        sample_quotes_json: JSON.stringify(members.slice(0, 3).map((m) => m.summary_en)),
        avg_lat: avgLat,
        avg_lng: avgLng,
      });
    }
  }

  const table = dataset().table('demand_clusters');
  await bigquery.query({
    query: `DELETE FROM \`${config.gcpProjectId}.${config.bigqueryDataset}.demand_clusters\` WHERE TRUE`,
  });
  if (clusters.length) {
    await table.insert(clusters);
  }

  console.log(`Clustered ${rows.length} submissions into ${clusters.length} demand clusters.`);
  return clusters;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  clusterSubmissions()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
