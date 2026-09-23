const NICKNAME_KEY = "alphabet-quiz:nickname";

export function loadSavedNickname() {
  try {
    return localStorage.getItem(NICKNAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveNickname(name) {
  try {
    localStorage.setItem(NICKNAME_KEY, name);
  } catch {
    // localStorageが使えない環境では諦める(必須機能ではない)
  }
}

export async function submitScore({ name, score, questionCount }) {
  const res = await fetch("/api/leaderboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, score, questionCount }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "送信に失敗しました");
  }
  return data;
}

export async function fetchLeaderboard(limit = 20) {
  const res = await fetch(`/api/leaderboard?limit=${limit}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "ランキングの取得に失敗しました");
  }
  return data.entries ?? [];
}
