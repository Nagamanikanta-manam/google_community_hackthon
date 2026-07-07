const KEY = 'constituency-ai-admin';

export function getAdmin() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    return null;
  }
}

export function setAdmin({ username, token }) {
  localStorage.setItem(KEY, JSON.stringify({ username, token }));
}

export function clearAdmin() {
  localStorage.removeItem(KEY);
}
