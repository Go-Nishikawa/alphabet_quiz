import site from "../../site.config.json";

export function buildShareUrl({ score, rank, perfectCount, total }) {
  const text = `略語クイズで${rank}ランク! ${score}点(完答${perfectCount}/${total}問) #略語クイズ`;
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(site.siteUrl)}`;
}
