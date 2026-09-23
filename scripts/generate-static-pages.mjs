// vite build の後に実行し、dist/ に検索エンジン向けの静的HTMLを書き出す。
//   /abbr/<slug>  略語ごとの解説ページ
//   /abbr         略語の一覧
//   /privacy      プライバシーポリシー
//   /sitemap.xml, /robots.txt
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CATEGORIES } from "../src/data/categories.js";
import { abbreviationSlug } from "../src/utils/slug.js";
import { initOgRenderer, renderOgPng } from "./og-image.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const site = JSON.parse(readFileSync(join(ROOT, "site.config.json"), "utf8"));
const BUILD_DATE = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
const RELATED_COUNT = 6;

const esc = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function loadQuestions() {
  return CATEGORIES.flatMap(({ id }) =>
    JSON.parse(readFileSync(join(ROOT, "src/data/questions", `${id}.json`), "utf8")),
  );
}

function writePage(relativePath, html) {
  const path = join(DIST, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, html);
}

const STYLE = `
:root{--bg:#f7f7fb;--surface:#fff;--text:#1f2130;--muted:#6b6b7a;--border:#e2e2ea;--accent:#5b5bd6;--accent-contrast:#fff;color-scheme:light dark}
@media(prefers-color-scheme:dark){:root{--bg:#14141c;--surface:#1e1e29;--text:#eceef5;--muted:#a3a3b3;--border:#33333f;--accent:#8f8ff7;--accent-contrast:#14141c}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:16px/1.7 system-ui,"Hiragino Sans","Noto Sans JP",sans-serif}
a{color:var(--accent)}
.wrap{max-width:720px;margin:0 auto;padding:24px 16px 48px}
.site-header{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:24px}
.site-header a{font-weight:700;text-decoration:none}
nav.crumbs{font-size:.85rem;color:var(--muted);margin-bottom:16px}
h1{font-size:1.8rem;line-height:1.3;margin:0 0 12px}
h2{font-size:1.2rem;margin:32px 0 12px}
.full-form{font-size:1.3rem;font-weight:700;margin:0}
.meaning{color:var(--muted);margin:4px 0 0}
table{width:100%;border-collapse:collapse;background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden}
th,td{padding:10px 14px;text-align:left;border-bottom:1px solid var(--border)}
tr:last-child td{border-bottom:0}
th{width:5rem;font-size:1.3rem;color:var(--accent)}
.cta{display:inline-block;margin-top:8px;padding:14px 28px;border-radius:999px;background:var(--accent);color:var(--accent-contrast);font-weight:700;text-decoration:none}
.chips{display:flex;flex-wrap:wrap;gap:8px;list-style:none;margin:0;padding:0}
.chips a{display:inline-block;padding:6px 14px;border:1px solid var(--border);border-radius:999px;background:var(--surface);text-decoration:none}
.card{padding:16px;border:1px solid var(--border);border-radius:12px;background:var(--surface)}
.share{display:inline-block;padding:8px 18px;border:1px solid var(--border);border-radius:999px;background:var(--surface);text-decoration:none}
footer{margin-top:48px;padding-top:16px;border-top:1px solid var(--border);color:var(--muted);font-size:.85rem;display:flex;flex-wrap:wrap;gap:16px}
`;

function layout({ title, description, path, body, jsonLd, image = "/og/default.png" }) {
  const url = `${site.siteUrl}${path}`;
  const imageUrl = `${site.siteUrl}${image}`;
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${esc(site.siteName)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:locale" content="ja_JP">
<meta property="og:image" content="${esc(imageUrl)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${esc(imageUrl)}">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replaceAll("<", "\\u003c")}</script>` : ""}
<script async src="https://www.googletagmanager.com/gtag/js?id=${site.gaMeasurementId}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config","${site.gaMeasurementId}");</script>
<style>${STYLE}</style>
</head>
<body>
<div class="wrap">
<header class="site-header"><a href="/">${esc(site.siteName)}</a><a href="/abbr">略語一覧</a></header>
${body}
<footer><a href="/">クイズで遊ぶ</a><a href="/abbr">略語一覧</a><a href="/privacy">プライバシーポリシー</a></footer>
</div>
</body>
</html>
`;
}

function abbreviationPage(question, sameCategory, categoryName, questionTotal) {
  const { abbreviation, fullForm, meaningJa, letterHints } = question;
  const slug = abbreviationSlug(abbreviation);
  const index = sameCategory.findIndex((q) => q.id === question.id);
  const related = Array.from({ length: Math.min(RELATED_COUNT, sameCategory.length - 1) }, (_, i) => {
    return sameCategory[(index + 1 + i) % sameCategory.length];
  });

  const rows = letterHints
    .map((hint) => `<tr><th>${esc(hint.letter)}</th><td>${esc(hint.word)}</td></tr>`)
    .join("");
  const relatedLinks = related
    .map((q) => `<li><a href="/abbr/${abbreviationSlug(q.abbreviation)}">${esc(q.abbreviation)}</a></li>`)
    .join("");

  const title = `${abbreviation}とは?正式名称・意味・各文字の由来 | ${site.siteName}`;
  const shareUrl = `https://x.com/intent/post?text=${encodeURIComponent(`${abbreviation}とは?${fullForm}(${meaningJa}) #略語クイズ`)}&url=${encodeURIComponent(`${site.siteUrl}/abbr/${slug}`)}`;
  const description = `${abbreviation}は「${fullForm}」の略で、${meaningJa}を意味します。各文字が何の略かを一覧で解説し、クイズで確認できます。`;

  const body = `<nav class="crumbs"><a href="/">ホーム</a> &gt; <a href="/abbr">略語一覧</a> &gt; ${esc(abbreviation)}</nav>
<article>
<h1>${esc(abbreviation)}とは?</h1>
<p class="full-form">${esc(fullForm)}</p>
<p class="meaning">${esc(meaningJa)}(${esc(categoryName)})</p>
<h2>${esc(abbreviation)}の各文字の意味</h2>
<table><tbody>${rows}</tbody></table>
<h2>クイズで覚える</h2>
<div class="card"><p>${esc(categoryName)}の略語${sameCategory.length}個を含む全${questionTotal}個の略語を、各文字が何の略か答える形式で練習できます。</p><a class="cta" href="/">クイズに挑戦する</a></div>
<h2>${esc(categoryName)}の関連する略語</h2>
<ul class="chips">${relatedLinks}</ul>
<p><a class="share" href="${esc(shareUrl)}" target="_blank" rel="noopener">Xで共有する</a></p>
</article>`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: abbreviation,
    alternateName: fullForm,
    description: meaningJa,
    inDefinedTermSet: `${site.siteUrl}/abbr`,
    url: `${site.siteUrl}/abbr/${slug}`,
  };

  return { path: `/abbr/${slug}`, html: layout({ title, description, path: `/abbr/${slug}`, body, jsonLd, image: `/og/${slug}.png` }) };
}

function indexPage(questions) {
  const sections = CATEGORIES.map((category) => {
    const items = questions
      .filter((q) => q.category === category.id)
      .map(
        (q) =>
          `<li><a href="/abbr/${abbreviationSlug(q.abbreviation)}">${esc(q.abbreviation)}</a></li>`,
      )
      .join("");
    return `<h2>${esc(category.name)}</h2><ul class="chips">${items}</ul>`;
  }).join("");

  const body = `<h1>略語一覧</h1>
<p class="meaning">ビジネス・IT・国際機関・ネットスラングの略語${questions.length}個の正式名称と意味をまとめています。</p>
${sections}
<h2>クイズで覚える</h2>
<a class="cta" href="/">クイズに挑戦する</a>`;

  return layout({
    title: `略語一覧(${questions.length}個)正式名称と意味 | ${site.siteName}`,
    description: `GDP・KPI・CPU・WHOなど、ビジネス・IT・国際機関・ネットスラングの略語${questions.length}個の正式名称と意味の一覧です。`,
    path: "/abbr",
    body,
  });
}

function privacyPage() {
  const body = `<h1>プライバシーポリシー</h1>
<p class="meaning">制定日: 2026年9月24日</p>

<h2>1. 運営者・お問い合わせ</h2>
<p>「${esc(site.siteName)}」(以下「当サイト」)の運営者への連絡は、<a href="${esc(site.contactUrl)}" rel="noopener">こちらのページ</a>からお願いします。</p>

<h2>2. アクセス解析ツールについて</h2>
<p>当サイトでは、利用状況の把握とサービス改善のためにGoogle LLCの提供する「Googleアナリティクス」を利用しています。Googleアナリティクスは、Cookie等を用いてトラフィックデータを収集します。このデータは匿名で収集されており、個人を特定するものではありません。</p>
<p>収集を望まない場合は、ブラウザのCookieを無効にするか、<a href="https://tools.google.com/dlpage/gaoptout" rel="noopener">Googleアナリティクス オプトアウト アドオン</a>をご利用ください。詳細は<a href="https://policies.google.com/technologies/partner-sites" rel="noopener">Googleのポリシーと規約</a>をご確認ください。</p>
<p>当サイトでは、クイズの開始・回答・完了などの操作を、サービス改善を目的とした統計データとして同様に収集しています。</p>

<h2>3. 広告について</h2>
<p>当サイトでは今後、Google AdSense等の第三者配信の広告サービスを利用する場合があります。広告配信事業者は、ユーザーの興味に応じた広告を表示するためにCookieを使用することがあります。Cookieを無効にする設定や、Google広告のパーソナライズを無効にする方法は、<a href="https://adssettings.google.com/" rel="noopener">広告設定</a>をご確認ください。</p>

<h2>4. ランキング機能で取得する情報</h2>
<p>ランキングに登録する際に入力されたニックネーム、スコア、登録日時を保存し、ランキング画面に公開表示します。<strong>ニックネームには本名や連絡先などの個人情報を入力しないでください。</strong>登録した内容の削除を希望される場合は、上記のお問い合わせ先までご連絡ください。</p>

<h2>5. ブラウザへの保存について</h2>
<p>当サイトは、成績履歴と前回入力したニックネームをお使いのブラウザのローカルストレージに保存します。これらの情報は端末内にのみ保存され、当サイトのサーバーへ送信されることはありません(ランキング登録時に入力したニックネームとスコアを除く)。</p>

<h2>6. 免責事項</h2>
<p>当サイトの掲載内容の正確性には配慮していますが、その内容を保証するものではありません。当サイトの利用により生じた損害について、運営者は責任を負いかねます。</p>

<h2>7. プライバシーポリシーの変更</h2>
<p>本ポリシーの内容は、法令の変更やサービス内容の変更に応じて、予告なく改定することがあります。改定後の内容は本ページに掲載した時点で効力を生じます。</p>`;

  return layout({
    title: `プライバシーポリシー | ${site.siteName}`,
    description: `${site.siteName}のプライバシーポリシー。アクセス解析・広告・ランキング機能で取得する情報の取り扱いについて。`,
    path: "/privacy",
    body,
  });
}

function sitemapXml(paths) {
  const urls = paths
    .map((path) => `<url><loc>${esc(site.siteUrl + path)}</loc><lastmod>${BUILD_DATE}</lastmod></url>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>\n`;
}

const questions = loadQuestions();
const slugs = new Map();
for (const q of questions) {
  const slug = abbreviationSlug(q.abbreviation);
  if (slugs.has(slug)) {
    throw new Error(`スラッグが重複しています: ${q.abbreviation} と ${slugs.get(slug)} (${slug})`);
  }
  slugs.set(slug, q.abbreviation);
}

await initOgRenderer();
const host = new URL(site.siteUrl).host;
const ogCommon = { siteName: site.siteName, host, footer: "各文字が何の略か答えよう" };
writePage(
  "og/default.png",
  renderOgPng({ ...ogCommon, headline: "GDP KPI CPU", subtitle: "何の略か、文字ごとに答えよう", detail: `ビジネス・IT・国際機関・ネットスラング ${questions.length}個` }),
);

const paths = ["/", "/abbr", "/privacy"];
for (const category of CATEGORIES) {
  const sameCategory = questions.filter((q) => q.category === category.id);
  for (const question of sameCategory) {
    const page = abbreviationPage(question, sameCategory, category.name, questions.length);
    writePage(`${page.path}.html`, page.html);
    writePage(
      `og/${abbreviationSlug(question.abbreviation)}.png`,
      renderOgPng({ ...ogCommon, headline: question.abbreviation, subtitle: question.fullForm, detail: question.meaningJa }),
    );
    paths.push(page.path);
  }
}
writePage("abbr.html", indexPage(questions));
writePage("privacy.html", privacyPage());
writePage("sitemap.xml", sitemapXml(paths));
writePage("robots.txt", `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${site.siteUrl}/sitemap.xml\n`);

console.log(`静的ページとOGP画像を生成しました: 略語${questions.length}ページ + 一覧 + プライバシー + sitemap.xml(${paths.length}URL) + robots.txt`);
