// OGP画像(1200x630 PNG)を SVG から生成する。ネイティブ依存を避けるため resvg の WASM 版を使う。
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg, initWasm } from "@resvg/resvg-wasm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WIDTH = 1200;
const HEIGHT = 630;
const PADDING = 72;
const CONTENT_WIDTH = WIDTH - PADDING * 2;

let fontBuffer;

export async function initOgRenderer() {
  await initWasm(readFileSync(join(ROOT, "node_modules/@resvg/resvg-wasm/index_bg.wasm")));
  fontBuffer = new Uint8Array(
    readFileSync(
      join(ROOT, "node_modules/@expo-google-fonts/noto-sans-jp/700Bold/NotoSansJP_700Bold.ttf"),
    ),
  );
}

const escapeXml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

// SVGには自動改行がないので、文字幅を概算して折り返す(全角=1em、半角=0.62em)。
const charWidth = (ch) => (ch.charCodeAt(0) >= 0x2e80 ? 1 : 0.62);
const textWidth = (text, fontSize) =>
  [...text].reduce((sum, ch) => sum + charWidth(ch), 0) * fontSize;

function wrapText(text, fontSize, maxWidth, maxLines) {
  const tokens = text
    .split(/(\s+)/)
    .flatMap((token) => (/[^ -~]/.test(token) ? [...token] : [token]));

  const lines = [];
  let line = "";
  for (const token of tokens) {
    if (line !== "" && textWidth(line + token, fontSize) > maxWidth) {
      lines.push(line.trim());
      line = token.trim() === "" ? "" : token;
    } else {
      line += token;
    }
  }
  if (line.trim() !== "") lines.push(line.trim());

  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = `${kept[maxLines - 1].replace(/[\s、,.]+$/, "")}…`;
  return kept;
}

function textLines(lines, { x, y, fontSize, lineHeight, fill }) {
  return lines
    .map(
      (line, i) =>
        `<text x="${x}" y="${y + i * lineHeight}" font-size="${fontSize}" fill="${fill}">${escapeXml(line)}</text>`,
    )
    .join("");
}

function buildSvg({ headline, subtitle, detail, footer, siteName, host }) {
  // 見出しは太字の大文字が多いので半角も広めに見積もる(全角=1em、半角=0.72em)。
  const headlineUnits = [...headline].reduce((sum, ch) => sum + (ch.charCodeAt(0) >= 0x2e80 ? 1 : 0.72), 0);
  const headlineSize = Math.min(230, Math.floor(CONTENT_WIDTH / Math.max(headlineUnits, 1)));
  const subtitleLines = wrapText(subtitle, 46, CONTENT_WIDTH, 2);
  const detailLines = detail
    ? wrapText(detail, 34, CONTENT_WIDTH, subtitleLines.length >= 2 ? 1 : 2)
    : [];

  const headlineBaseline = 235 + Math.round(headlineSize * 0.3);
  const subtitleTop = headlineBaseline + 78;
  const detailTop = subtitleTop + subtitleLines.length * 58 + 14;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="Noto Sans JP" font-weight="700">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1d1d2e"/><stop offset="1" stop-color="#14141c"/></linearGradient></defs>
<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
<rect width="${WIDTH}" height="12" fill="#8f8ff7"/>
<text x="${PADDING}" y="98" font-size="36" fill="#8f8ff7">${escapeXml(siteName)}</text>
<text x="${PADDING}" y="${headlineBaseline}" font-size="${headlineSize}" fill="#ffffff" letter-spacing="4">${escapeXml(headline)}</text>
${textLines(subtitleLines, { x: PADDING, y: subtitleTop, fontSize: 46, lineHeight: 58, fill: "#eceef5" })}
${textLines(detailLines, { x: PADDING, y: detailTop, fontSize: 34, lineHeight: 44, fill: "#a3a3b3" })}
<line x1="${PADDING}" y1="${HEIGHT - 92}" x2="${WIDTH - PADDING}" y2="${HEIGHT - 92}" stroke="#33333f" stroke-width="2"/>
<text x="${PADDING}" y="${HEIGHT - 42}" font-size="30" fill="#a3a3b3">${escapeXml(footer)}</text>
<text x="${WIDTH - PADDING}" y="${HEIGHT - 42}" font-size="28" fill="#8f8ff7" text-anchor="end">${escapeXml(host)}</text>
</svg>`;
}

export function renderOgPng(options) {
  const resvg = new Resvg(buildSvg(options), {
    fitTo: { mode: "width", value: WIDTH },
    font: { fontBuffers: [fontBuffer], defaultFontFamily: "Noto Sans JP", loadSystemFonts: false },
  });
  return resvg.render().asPng();
}
