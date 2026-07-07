-- Run once after `bq mk --dataset <project>:constituency`
-- Usage: bq query --use_legacy_sql=false < infra/bigquery_schema.sql
-- (replace ${PROJECT}.${DATASET} with your actual project.dataset, or use bq's --parameter substitution)

CREATE TABLE IF NOT EXISTS `constituency.submissions_enriched` (
  submission_id STRING NOT NULL,
  created_at TIMESTAMP,
  theme STRING,
  urgency FLOAT64,
  sentiment FLOAT64,
  summary_en STRING,
  location_text STRING,
  resolved_place STRING,
  lat FLOAT64,
  lng FLOAT64,
  is_infrastructure_damage BOOL,
  damage_severity FLOAT64,
  embedding_json STRING
);

CREATE TABLE IF NOT EXISTS `constituency.constituency_reference` (
  village_name STRING NOT NULL,
  ward_id STRING,
  population INT64,
  school_enrollment_count INT64,
  nearest_school_distance_km FLOAT64,
  has_phc BOOL,
  nearest_hospital_distance_km FLOAT64,
  water_coverage_pct FLOAT64,
  road_type STRING,
  electrification_pct FLOAT64,
  lat FLOAT64,
  lng FLOAT64
);

CREATE TABLE IF NOT EXISTS `constituency.demand_clusters` (
  cluster_id STRING NOT NULL,
  theme STRING,
  location_text STRING,
  submission_count INT64,
  avg_urgency FLOAT64,
  avg_sentiment FLOAT64,
  most_recent_date TIMESTAMP,
  sample_quotes_json STRING,
  avg_lat FLOAT64,
  avg_lng FLOAT64
);
