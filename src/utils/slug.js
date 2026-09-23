// 略語 → URL用スラッグ(例: "M&A" → "ma")。静的ページ生成とアプリ内リンクで共有する。
export function abbreviationSlug(abbreviation) {
  return abbreviation.toLowerCase().replace(/[^a-z0-9]/g, "");
}
