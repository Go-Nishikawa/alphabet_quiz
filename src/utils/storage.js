const HISTORY_KEY = "alphabet-quiz:history";
const MAX_HISTORY = 20;

export function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendHistory(entry) {
  try {
    const history = loadHistory();
    const next = [entry, ...history].slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    return next;
  } catch {
    return loadHistory();
  }
}
