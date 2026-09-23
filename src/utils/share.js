import site from "../../site.config.json";

export function buildShareParams({ score, rank, perfectCount, total }) {
  return {
    text: `略語クイズで${rank}ランク! ${score}点(完答${perfectCount}/${total}問) #略語クイズ`,
    url: site.siteUrl,
  };
}

export function buildIntentUrl({ text, url }) {
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}

// スマホは共有シートを開く(Xアプリを選べる)。通常リンクだとアプリではなくブラウザで開いてしまう。
function shouldUseNativeShare() {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    window.matchMedia("(pointer: coarse)").matches
  );
}

export function handleShareClick(event, params) {
  if (!shouldUseNativeShare()) return;
  event.preventDefault();
  navigator.share(params).catch((error) => {
    if (error?.name === "AbortError") return;
    window.open(buildIntentUrl(params), "_blank", "noopener");
  });
}
