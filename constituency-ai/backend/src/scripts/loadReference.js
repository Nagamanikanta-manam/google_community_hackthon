import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { dataset, bigquery } from '../db/bigquery.js';
import { config } from '../config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const csvPath = join(__dirname, '..', '..', '..', 'data', 'constituency_reference.csv');

function toRow(record) {
  return {
    village_name: record.village_name,
    ward_id: record.ward_id,
    population: parseInt(record.population, 10),
    school_enrollment_count: parseInt(record.school_enrollment_count, 10),
    nearest_school_distance_km: parseFloat(record.nearest_school_distance_km),
    has_phc: record.has_phc === 'true',
    nearest_hospital_distance_km: parseFloat(record.nearest_hospital_distance_km),
    water_coverage_pct: parseFloat(record.water_coverage_pct),
    road_type: record.road_type,
    electrification_pct: parseFloat(record.electrification_pct),
    lat: parseFloat(record.lat),
    lng: parseFloat(record.lng),
  };
}

export async function loadReference() {
  const csv = readFileSync(csvPath, 'utf-8');
  const records = parse(csv, { columns: true, skip_empty_lines: true });
  const rows = records.map(toRow);

  await bigquery.query({
    query: `DELETE FROM \`${config.gcpProjectId}.${config.bigqueryDataset}.constituency_reference\` WHERE TRUE`,
  });
  await dataset().table('constituency_reference').insert(rows);

  console.log(`Loaded ${rows.length} villages into constituency_reference.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  loadReference()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
