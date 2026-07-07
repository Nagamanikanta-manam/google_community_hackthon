const KEY = 'constituency-ai-citizen';

export function getCitizen() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    return null;
  }
}

export function setCitizen({ name, phone }) {
  localStorage.setItem(KEY, JSON.stringify({ name, phone }));
}

export function clearCitizen() {
  localStorage.removeItem(KEY);
}
