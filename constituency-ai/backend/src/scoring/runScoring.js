import { readFileSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { bigquery } from '../db/bigquery.js';
import { config } from '../config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function runScoring() {
  const sqlTemplate = readFileSync(join(__dirname, 'rankClusters.sql'), 'utf-8');
  const sql = sqlTemplate
    .replaceAll('${PROJECT}', config.gcpProjectId)
    .replaceAll('${DATASET}', config.bigqueryDataset);

  await bigquery.query({ query: sql, location: 'asia-south1' });
  console.log('ranked_projects table refreshed.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runScoring()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
