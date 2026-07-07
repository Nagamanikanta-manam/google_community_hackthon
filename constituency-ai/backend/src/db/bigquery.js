import { BigQuery } from '@google-cloud/bigquery';
import { config } from '../config.js';

export const bigquery = new BigQuery({ projectId: config.gcpProjectId });

export const dataset = () => bigquery.dataset(config.bigqueryDataset);

export async function insertSubmissionRow(row) {
  await dataset().table('submissions_enriched').insert([row]);
}

export async function query(sql, params = {}) {
  const [rows] = await bigquery.query({ query: sql, params, location: 'asia-south1' });
  return rows;
}
