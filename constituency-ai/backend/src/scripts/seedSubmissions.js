import { v4 as uuidv4 } from 'uuid';
import { pathToFileURL } from 'url';
import { createSubmission, updateSubmission } from '../db/firestore.js';
import { insertSubmissionRow } from '../db/bigquery.js';
import { embedText } from '../pipeline/embed.js';
import { geocodeLocation } from '../pipeline/geocode.js';

// Seed data simulates ~50 already-processed citizen submissions across languages/themes/villages,
// so the dashboard has enough volume to show meaningful clusters and rankings without needing
// to manually submit dozens of real voice/photo reports first. Each scenario becomes one
// demand cluster once backend/src/clustering/clusterSubmissions.js groups by theme+location.
const SCENARIOS = [
  {
    theme: 'road_infra',
    location: 'Ramapuram',
    count: 8,
    urgency: [4, 5],
    sentiment: [-0.8, -0.5],
    daysAgo: [0, 10],
    templates: [
      'The main road in Ramapuram has a large pothole that fills with water and is dangerous for two-wheelers.',
      'Road in Ramapuram village is badly damaged near the bus stop, vehicles are struggling to pass.',
      'Broken road in Ramapuram has caused two accidents this month, urgent repair needed.',
      'The approach road to Ramapuram is full of potholes and unsafe after rains.',
    ],
  },
  {
    theme: 'road_infra',
    location: 'Bukkarayasamudram',
    count: 5,
    urgency: [3, 4],
    sentiment: [-0.6, -0.3],
    daysAgo: [15, 30],
    templates: [
      'The unpaved road in Bukkarayasamudram gets washed out every monsoon and is impassable.',
      'Bukkarayasamudram village road has never been paved, tractors get stuck in mud.',
    ],
  },
  {
    theme: 'water_supply',
    location: 'Kothapalli',
    count: 4,
    urgency: [2, 3],
    sentiment: [-0.4, -0.1],
    daysAgo: [5, 20],
    templates: [
      'Water pressure in Kothapalli is very low in the mornings, taps run dry by 8am.',
      'Kothapalli residents are asking for an additional water tank due to low pressure.',
    ],
  },
  {
    theme: 'water_supply',
    location: 'Amadagur',
    count: 6,
    urgency: [4, 4],
    sentiment: [-0.8, -0.6],
    daysAgo: [0, 15],
    templates: [
      'Amadagur village has no piped water supply, women walk 2km daily to fetch water.',
      'No functioning water connection in Amadagur, families depend on an unreliable tanker.',
      'Amadagur needs a borewell urgently, the existing one has run dry this summer.',
    ],
  },
  {
    theme: 'school_education',
    location: 'Singanamala',
    count: 7,
    urgency: [3, 4],
    sentiment: [-0.5, -0.2],
    daysAgo: [10, 40],
    templates: [
      'The government school in Singanamala is overcrowded, classrooms have more than 60 students each.',
      'Singanamala school building needs additional classrooms, enrollment has grown but infrastructure has not.',
      'Parents in Singanamala are requesting an upgrade to the middle school with more teachers and rooms.',
    ],
  },
  {
    theme: 'school_education',
    location: 'Peddavadugur',
    count: 4,
    urgency: [3, 3],
    sentiment: [-0.3, -0.1],
    daysAgo: [5, 25],
    templates: [
      'Youth in Peddavadugur are requesting a vocational training centre since many students drop out after school.',
      'Local leaders in Peddavadugur propose a skill development / vocational centre for unemployed youth.',
    ],
  },
  {
    theme: 'health',
    location: 'Guntakal',
    count: 5,
    urgency: [4, 5],
    sentiment: [-0.7, -0.5],
    daysAgo: [0, 20],
    templates: [
      'Guntakal has no primary health centre nearby, patients travel over 20km for basic treatment.',
      'A pregnant woman in Guntakal had to be taken 22km for emergency care due to no local PHC.',
      'Residents of Guntakal are demanding a PHC be set up given the growing population.',
    ],
  },
  {
    theme: 'electricity',
    location: 'Kadiri',
    count: 4,
    urgency: [3, 3],
    sentiment: [-0.4, -0.2],
    daysAgo: [20, 50],
    templates: [
      'Kadiri experiences daily power cuts of 4-6 hours, affecting irrigation pumps.',
      'Frequent electricity outages in Kadiri are damaging home appliances and disrupting small businesses.',
    ],
  },
  {
    theme: 'sanitation',
    location: 'Atmakur',
    count: 3,
    urgency: [3, 3],
    sentiment: [-0.4, -0.2],
    daysAgo: [30, 45],
    templates: [
      'Atmakur village lacks proper drainage, sewage overflows onto the main street during rains.',
      'No public toilets in Atmakur market area, causing hygiene issues.',
    ],
  },
  {
    theme: 'road_infra',
    location: 'Bommanahal',
    count: 3,
    urgency: [3, 3],
    sentiment: [-0.3, -0.2],
    daysAgo: [40, 55],
    templates: [
      'The road connecting Bommanahal to the highway remains unpaved despite past promises.',
    ],
  },
];

function randomBetween([min, max]) {
  return min + Math.random() * (max - min);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seedScenario(scenario) {
  const geo = await geocodeLocation(scenario.location);

  for (let i = 0; i < scenario.count; i++) {
    const id = uuidv4();
    const summary = pick(scenario.templates);
    const urgency = Math.round(randomBetween(scenario.urgency));
    const sentiment = Number(randomBetween(scenario.sentiment).toFixed(2));
    const daysAgo = Math.round(randomBetween(scenario.daysAgo));
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

    const embedding = await embedText(summary);

    await createSubmission(id, {
      status: 'done',
      textRaw: summary,
      languageKey: 'en',
      createdAt,
      seeded: true,
    });

    await updateSubmission(id, {
      transcriptOriginal: summary,
      transcriptEn: summary,
      detectedLanguage: 'en',
      theme: scenario.theme,
      urgency,
      sentiment,
      summaryEn: summary,
      locationText: scenario.location,
      locationTextLower: scenario.location.toLowerCase(),
      isInfrastructureDamage: scenario.theme === 'road_infra',
      damageSeverity: scenario.theme === 'road_infra' ? urgency : 0,
      lat: geo.lat,
      lng: geo.lng,
      resolvedPlace: geo.resolved_place,
      geoSource: geo.source,
      embedding,
      processedAt: new Date().toISOString(),
    });

    await insertSubmissionRow({
      submission_id: id,
      created_at: createdAt,
      theme: scenario.theme,
      urgency,
      sentiment,
      summary_en: summary,
      location_text: scenario.location,
      resolved_place: geo.resolved_place,
      lat: geo.lat,
      lng: geo.lng,
      is_infrastructure_damage: scenario.theme === 'road_infra',
      damage_severity: scenario.theme === 'road_infra' ? urgency : 0,
      embedding_json: JSON.stringify(embedding),
    });
  }

  console.log(`Seeded ${scenario.count} submissions for ${scenario.theme} @ ${scenario.location}`);
}

export async function seedAll() {
  for (const scenario of SCENARIOS) {
    await seedScenario(scenario);
  }
  const total = SCENARIOS.reduce((s, sc) => s + sc.count, 0);
  console.log(`Done. Seeded ${total} submissions across ${SCENARIOS.length} scenarios.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedAll()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
