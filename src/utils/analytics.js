// GA4が読み込まれていない環境(開発時・広告ブロッカー等)でも落ちないようにガードする。
export function trackEvent(name, params = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
}
