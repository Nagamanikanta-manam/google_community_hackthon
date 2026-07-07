// Fixed categorical order — assigned once, never re-cycled by filters or sort order.
export const THEMES = [
  'road_infra',
  'water_supply',
  'school_education',
  'health',
  'electricity',
  'sanitation',
  'other',
];

export function themeClass(theme) {
  return THEMES.includes(theme) ? `theme-${theme}` : 'theme-other';
}

// Literal hex twins of the --cat-N custom properties, for contexts (Google Maps
// canvas overlays) that can't read CSS variables. Kept to the light-mode steps -
// the base map tile is always light regardless of page theme.
const THEME_HEX = {
  road_infra: '#2a78d6',
  water_supply: '#1baf7a',
  school_education: '#eda100',
  health: '#008300',
  electricity: '#4a3aa7',
  sanitation: '#e34948',
  other: '#e87ba4',
};

export function themeHex(theme) {
  return THEME_HEX[theme] || THEME_HEX.other;
}

// Sequential blue ramp (light -> dark) encoding score magnitude, 0-100. The paired
// -text variable is defined per color-scheme in index.css, since the ramp's anchors
// flip in dark mode (low magnitude -> dark step, high magnitude -> light step) and the
// ink has to flip with it to stay readable against whichever hex actually renders.
const SCORE_STEPS = [
  { max: 20, step: 200 },
  { max: 40, step: 350 },
  { max: 60, step: 450 },
  { max: 80, step: 550 },
  { max: Infinity, step: 650 },
];

export function scoreStyle(score) {
  const step = SCORE_STEPS.find((s) => score <= s.max) || SCORE_STEPS[SCORE_STEPS.length - 1];
  return { background: `var(--seq-${step.step})`, color: `var(--seq-${step.step}-text)` };
}
