export async function submitCitizenReport({ text, languageKey, audioBlob, photoFile, citizenName, citizenPhone, lat, lng }) {
  const form = new FormData();
  if (text) form.append('text', text);
  form.append('languageKey', languageKey);
  if (audioBlob) form.append('audio', audioBlob, 'recording.webm');
  if (photoFile) form.append('photo', photoFile);
  if (citizenName) form.append('citizenName', citizenName);
  if (citizenPhone) form.append('citizenPhone', citizenPhone);
  if (lat != null) form.append('lat', String(lat));
  if (lng != null) form.append('lng', String(lng));

  const res = await fetch('/api/submissions', { method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Submission failed');
  }
  return res.json();
}

export async function fetchSubmissionStatus(id) {
  const res = await fetch(`/api/submissions/${encodeURIComponent(id)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Report not found');
  }
  return res.json();
}

async function adminGet(path, token) {
  const res = await fetch(`/admin${path}${path.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`);
  if (res.status === 401) throw new Error('unauthorized');
  if (!res.ok) throw new Error(`Request failed: ${path}`);
  return res.json();
}

export const fetchRankings = (token) => adminGet('/rankings', token);
export const fetchMapPoints = (token) => adminGet('/map', token);
export const fetchStats = (token) => adminGet('/stats', token);
export const fetchSubmissions = (token, theme, location) => {
  const params = new URLSearchParams();
  if (theme) params.set('theme', theme);
  if (location) params.set('location', location);
  return adminGet(`/submissions?${params.toString()}`, token);
};
