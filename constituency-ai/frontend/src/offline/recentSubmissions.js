const KEY = 'constituency-ai-recent-submission-ids';

export function rememberSubmissionId(id) {
  const next = [id, ...getRecentSubmissionIds().filter((existing) => existing !== id)].slice(0, 20);
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function getRecentSubmissionIds() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}
