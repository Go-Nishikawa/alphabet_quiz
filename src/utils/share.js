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
  // Xアプリは text と url を別々に渡すと url しか採用しないことがあるため、本文にURLを含めて1本で渡す。
  navigator.share({ text: `${params.text}\n${params.url}` }).catch((error) => {
    if (error?.name === "AbortError") return;
    window.open(buildIntentUrl(params), "_blank", "noopener");
  });
}
