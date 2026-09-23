import { QUESTIONS_BY_CATEGORY, ALL_QUESTIONS } from "../data/index.js";
import {
  BASE_POINTS,
  MAX_SPEED_BONUS,
  COMBO_BONUS_STEP,
  MAX_COMBO_BONUS,
} from "./scoreConstants.js";

export { BASE_POINTS, MAX_SPEED_BONUS, COMBO_BONUS_STEP, MAX_COMBO_BONUS };

export function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// アクセント記号(Européen)と記号(Don't / Medium-sized)は入力しづらいので無視して判定する。
// スペルそのものの揺れは許容しない。
export function normalizeAnswer(str) {
  return String(str ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

export function checkAnswer(userInput, correctAnswer) {
  return normalizeAnswer(userInput) === normalizeAnswer(correctAnswer);
}

export function buildQuizQuestions(categoryIds, count = 10) {
  const pool =
    categoryIds && categoryIds.length > 0
      ? categoryIds.flatMap((id) => QUESTIONS_BY_CATEGORY[id] ?? [])
      : ALL_QUESTIONS;

  return shuffle(pool).slice(0, Math.min(count, pool.length));
}

const TIME_LIMIT_BASE_MS = 8000;
const TIME_LIMIT_PER_BLANK_MS = 7000;

export function timeLimitFor(question) {
  return (
    TIME_LIMIT_BASE_MS + TIME_LIMIT_PER_BLANK_MS * question.letterHints.length
  );
}

// スピードボーナスに正解率を掛けているので、適当に即答しても点は伸びない。
export function scoreQuestion({ earned, max, perfect, timeRatio, comboCount }) {
  const ratio = max > 0 ? earned / max : 0;
  const base = Math.round(BASE_POINTS * ratio);
  const speed = Math.round(MAX_SPEED_BONUS * timeRatio * ratio);
  const combo = perfect
    ? Math.min(COMBO_BONUS_STEP * Math.max(comboCount - 1, 0), MAX_COMBO_BONUS)
    : 0;

  return { base, speed, combo, total: base + speed + combo };
}

// 「全問完答・ボーナスなし」(1問100点)を基準にした割合でランクを決める。
const RANK_RATIOS = [
  ["S", 1.3],
  ["A", 1.1],
  ["B", 0.9],
  ["C", 0.6],
];

export function rankThresholds(questionCount) {
  return RANK_RATIOS.map(([rank, ratio]) => ({
    rank,
    min: Math.round(BASE_POINTS * questionCount * ratio),
  }));
}

export function rankFor(score, questionCount) {
  const hit = rankThresholds(questionCount).find(({ min }) => score >= min);
  return hit ? hit.rank : "D";
}

export function gradeAnswer(question, inputs) {
  const blanks = question.letterHints.map((hint, i) => ({
    letter: hint.letter,
    correctWord: hint.word,
    userAnswer: (inputs[i] ?? "").trim(),
    correct: checkAnswer(inputs[i], hint.word),
  }));
  const earned = blanks.filter((b) => b.correct).length;

  return {
    blanks,
    earned,
    max: blanks.length,
    perfect: earned === blanks.length,
  };
}
