-- Transparent, explainable priority scoring for demand clusters.
-- Run via: node src/scoring/runScoring.js  (wraps this as a CREATE OR REPLACE TABLE statement)
--
-- Design: every component below is a plain arithmetic expression over data already
-- visible elsewhere in the app (submission counts, Gemini-extracted urgency/sentiment,
-- and the constituency_reference demographic/infra dataset). Nothing here is an LLM
-- call — the rationale sentence is built from these same numbers so a viewer can
-- trace exactly why one project outranks another.

CREATE OR REPLACE TABLE `${PROJECT}.${DATASET}.ranked_projects` AS

WITH joined AS (
  SELECT
    c.cluster_id,
    c.theme,
    c.location_text,
    c.submission_count,
    c.avg_urgency,
    c.avg_sentiment,
    c.most_recent_date,
    c.sample_quotes_json,
    c.avg_lat,
    c.avg_lng,
    r.village_name,
    r.population,
    r.school_enrollment_count,
    r.nearest_school_distance_km,
    r.nearest_hospital_distance_km,
    r.water_coverage_pct,
    r.road_type,
    r.electrification_pct,

    -- volume: raw citizen demand frequency
    CAST(c.submission_count AS FLOAT64) AS volume_raw,

    -- urgency: stated urgency amplified by negative sentiment intensity
    c.avg_urgency * (1 - c.avg_sentiment) AS urgency_raw,

    -- recency: exponential decay over days since the cluster's most recent submission
    EXP(-DATE_DIFF(CURRENT_DATE(), DATE(c.most_recent_date), DAY) / 30.0) AS recency_raw,

    -- gap: theme-specific lookup against real demographic/infrastructure data.
    -- Each branch encodes a different "requests vs. real need" comparison named in the brief.
    CASE c.theme
      WHEN 'school_education' THEN
        SAFE_DIVIDE(r.school_enrollment_count, NULLIF(r.nearest_school_distance_km, 0))
      WHEN 'health' THEN
        SAFE_DIVIDE(r.population, NULLIF(r.nearest_hospital_distance_km, 0))
      WHEN 'water_supply' THEN
        100 - COALESCE(r.water_coverage_pct, 50)
      WHEN 'sanitation' THEN
        100 - COALESCE(r.water_coverage_pct, 50)
      WHEN 'electricity' THEN
        100 - COALESCE(r.electrification_pct, 50)
      WHEN 'road_infra' THEN
        CASE WHEN r.road_type = 'unpaved' THEN 80.0 ELSE 20.0 END
      ELSE
        SAFE_DIVIDE(r.population, 1000)
    END AS gap_raw

  FROM `${PROJECT}.${DATASET}.demand_clusters` c
  LEFT JOIN `${PROJECT}.${DATASET}.constituency_reference` r
    ON LOWER(c.location_text) = LOWER(r.village_name)
),

normalized AS (
  SELECT
    *,
    SAFE_DIVIDE(volume_raw - MIN(volume_raw) OVER (), NULLIF(MAX(volume_raw) OVER () - MIN(volume_raw) OVER (), 0)) AS volume_score,
    SAFE_DIVIDE(urgency_raw - MIN(urgency_raw) OVER (), NULLIF(MAX(urgency_raw) OVER () - MIN(urgency_raw) OVER (), 0)) AS urgency_score,
    SAFE_DIVIDE(COALESCE(gap_raw, 0) - MIN(COALESCE(gap_raw, 0)) OVER (), NULLIF(MAX(COALESCE(gap_raw, 0)) OVER () - MIN(COALESCE(gap_raw, 0)) OVER (), 0)) AS gap_score,
    SAFE_DIVIDE(recency_raw - MIN(recency_raw) OVER (), NULLIF(MAX(recency_raw) OVER () - MIN(recency_raw) OVER (), 0)) AS recency_score
  FROM joined
)

SELECT
  cluster_id,
  theme,
  location_text,
  village_name,
  submission_count,
  ROUND(avg_urgency, 2) AS avg_urgency,
  ROUND(avg_sentiment, 2) AS avg_sentiment,
  most_recent_date,
  sample_quotes_json,
  avg_lat,
  avg_lng,
  ROUND(COALESCE(volume_score, 0), 3) AS volume_score,
  ROUND(COALESCE(urgency_score, 0), 3) AS urgency_score,
  ROUND(COALESCE(gap_score, 0), 3) AS gap_score,
  ROUND(COALESCE(recency_score, 0), 3) AS recency_score,
  ROUND(
    100 * (
      0.35 * COALESCE(volume_score, 0) +
      0.20 * COALESCE(urgency_score, 0) +
      0.30 * COALESCE(gap_score, 0) +
      0.15 * COALESCE(recency_score, 0)
    ), 1
  ) AS priority_score,
  CONCAT(
    'Upgrade ', theme, ' — ', location_text
  ) AS project_title,
  CONCAT(
    CAST(submission_count AS STRING), ' submissions from ', location_text, ' (', theme, '), ',
    'avg urgency ', CAST(ROUND(avg_urgency, 1) AS STRING), '/5, ',
    'most recent complaint on ', CAST(DATE(most_recent_date) AS STRING), '. ',
    CASE theme
      WHEN 'school_education' THEN CONCAT('Enrollment ', CAST(school_enrollment_count AS STRING), ' vs. nearest school ', CAST(nearest_school_distance_km AS STRING), 'km away.')
      WHEN 'health' THEN CONCAT('Population ', CAST(population AS STRING), ' vs. nearest hospital ', CAST(nearest_hospital_distance_km AS STRING), 'km away.')
      WHEN 'water_supply' THEN CONCAT('Water coverage only ', CAST(water_coverage_pct AS STRING), '% in this area.')
      WHEN 'sanitation' THEN CONCAT('Water/sanitation coverage only ', CAST(water_coverage_pct AS STRING), '% in this area.')
      WHEN 'electricity' THEN CONCAT('Electrification only ', CAST(electrification_pct AS STRING), '% in this area.')
      WHEN 'road_infra' THEN CONCAT('Road type recorded as ', COALESCE(road_type, 'unknown'), '.')
      ELSE ''
    END
  ) AS rationale
FROM normalized
ORDER BY priority_score DESC;
