import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CATEGORIES = ["business", "tech", "international", "slang"];
const DIFFICULTIES = ["easy", "medium", "hard"];

const errors = [];
const warnings = [];

const letters = (str) => [...str].filter((c) => /\p{L}/u.test(c));
const strip = (str) => str.replace(/[^\p{L}]/gu, "").toLowerCase();

// 「Non-Governmental / Governmental」のような重複を検出する。
// ヒントの連結は、正式名称から of / and などを飛ばした部分列になるはず。
function isSubsequence(needle, haystack) {
  let i = 0;
  for (const char of haystack) {
    if (i < needle.length && needle[i] === char) i++;
  }
  return i === needle.length;
}

const all = [];
for (const category of CATEGORIES) {
  const path = join(ROOT, "src/data/questions", `${category}.json`);
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    errors.push(`${category}.json: JSONとして読めません (${e.message})`);
    continue;
  }
  if (!Array.isArray(parsed)) {
    errors.push(`${category}.json: 配列ではありません`);
    continue;
  }
  parsed.forEach((q, i) => all.push({ q, where: `${category}.json[${i}]`, category }));
}

for (const { q, where, category } of all) {
  const name = q.abbreviation ?? where;
  const fail = (msg) => errors.push(`${name} (${where}): ${msg}`);

  for (const field of ["id", "category", "abbreviation", "fullForm", "meaningJa"]) {
    if (typeof q[field] !== "string" || q[field].trim() === "") {
      fail(`${field} が空、または文字列ではありません`);
    }
  }
  if (q.category !== category) fail(`category が "${q.category}" ですが ${category}.json にあります`);
  if (!DIFFICULTIES.includes(q.difficulty)) fail(`difficulty が不正です: ${q.difficulty}`);

  if (!Array.isArray(q.letterHints) || q.letterHints.length === 0) {
    fail("letterHints が空です(解答枠が作れません)");
    continue;
  }

  const abbrLetters = letters(q.abbreviation ?? "");
  const hintLetters = q.letterHints.map((h) => h.letter);
  if (abbrLetters.join("") !== hintLetters.join("")) {
    fail(
      `略語の文字と letterHints が一致しません: ${abbrLetters.join("")} vs ${hintLetters.join("")}`,
    );
  }

  for (const hint of q.letterHints) {
    if (typeof hint.word !== "string" || hint.word.trim() === "") {
      fail(`${hint.letter} の word が空です`);
      continue;
    }
    if (hint.letter.toLowerCase() !== strip(hint.word)[0]) {
      fail(`${hint.letter} の単語が "${hint.word}" で頭文字が一致しません`);
    }
  }

  const joined = strip(q.letterHints.map((h) => h.word).join(""));
  if (!isSubsequence(joined, strip(q.fullForm ?? ""))) {
    fail(
      `ヒントを連結しても正式名称になりません: "${q.letterHints.map((h) => h.word).join(" ")}" ≠ "${q.fullForm}"`,
    );
  }

  // 日本語訳がカタカナだけだと答えをそのまま書いているのと同じになる
  if (/^[ァ-ヶー・\s]+$/u.test(q.meaningJa ?? "")) {
    warnings.push(`${name}: 日本語訳がカタカナのみです ("${q.meaningJa}")`);
  }
}

const byId = new Map();
const byAbbr = new Map();
const byHints = new Map();
for (const { q, where } of all) {
  const hintKey = q.letterHints?.map((h) => `${h.letter}:${strip(h.word)}`).join("|");
  const label = `${q.abbreviation} (${where})`;
  for (const [map, key, what] of [
    [byId, q.id, "id"],
    [byAbbr, q.abbreviation, "略語"],
    [byHints, hintKey, "解答内容"],
  ]) {
    if (key == null) continue;
    if (map.has(key)) {
      errors.push(`${what}が重複しています: ${map.get(key)} と ${label}`);
    } else {
      map.set(key, label);
    }
  }
}

// 解答枠が1つしか違わない前方一致だけを警告する(UN ⊂ UNESCO のように
// 大きく枠数が違うものは別問題として成立しているため)。
const hintKeys = [...byHints.keys()];
for (const a of hintKeys) {
  for (const b of hintKeys) {
    const diff = a.split("|").length - b.split("|").length;
    if (a !== b && diff === 1 && a.startsWith(`${b}|`)) {
      warnings.push(`解答がほぼ同じです: ${byHints.get(b)} ⊂ ${byHints.get(a)}`);
    }
  }
}

for (const w of warnings) console.log(`警告: ${w}`);
for (const e of errors) console.error(`エラー: ${e}`);

const counts = CATEGORIES.map(
  (c) => `${c}=${all.filter((x) => x.category === c).length}`,
).join(" ");
console.log(`\n${all.length}問を検証しました (${counts})`);

if (errors.length > 0) {
  console.error(`\n${errors.length}件のエラーがあります`);
  process.exit(1);
}
console.log(`エラーなし${warnings.length > 0 ? ` (警告${warnings.length}件)` : ""}`);
