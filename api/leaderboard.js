import { Redis } from "@upstash/redis";
import {
  BASE_POINTS,
  MAX_SPEED_BONUS,
  MAX_COMBO_BONUS,
} from "../src/utils/scoreConstants.js";

const redis = Redis.fromEnv();

const LEADERBOARD_KEY = "leaderboard:v1";
const MAX_ENTRIES = 500;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const NAME_MAX_LENGTH = 20;
// eslint-disable-next-line no-control-regex -- 制御文字を除去するために意図的にマッチさせている
const CONTROL_CHARS_RE = new RegExp("[\\u0000-\\u001f\\u007f]", "g");
const MAX_SCORE_PER_QUESTION = BASE_POINTS + MAX_SPEED_BONUS + MAX_COMBO_BONUS;

function sanitizeName(raw) {
  // 制御文字を除去(表示崩れやログ汚染の防止)
  const stripped = String(raw ?? "").trim().replace(CONTROL_CHARS_RE, "");
  return stripped.slice(0, NAME_MAX_LENGTH);
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    return handleGet(req, res);
  }
  if (req.method === "POST") {
    return handlePost(req, res);
  }
  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method Not Allowed" });
}

async function handleGet(req, res) {
  const limitParam = Number(req.query?.limit);
  const limit = Math.min(
    Math.max(Number.isFinite(limitParam) && limitParam > 0 ? limitParam : DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );

  const raw = await redis.zrange(LEADERBOARD_KEY, 0, limit - 1, {
    rev: true,
    withScores: true,
  });

  // @upstash/redis は JSON として保存した member を読み出し時に自動でパースして返す。
  const entries = [];
  for (let i = 0; i < raw.length; i += 2) {
    const member = raw[i];
    const score = raw[i + 1];
    const parsed = typeof member === "string" ? safeJsonParse(member) : member;
    if (parsed && typeof parsed.name === "string") {
      entries.push({ name: parsed.name, score, date: parsed.date });
    }
  }

  return res.status(200).json({ entries });
}

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

async function handlePost(req, res) {
  const body = req.body ?? {};
  const name = sanitizeName(body.name);
  const score = Number(body.score);
  const questionCount = Number(body.questionCount);

  if (name === "") {
    return res.status(400).json({ error: "name is required" });
  }
  if (!Number.isInteger(score) || score < 0) {
    return res.status(400).json({ error: "score must be a non-negative integer" });
  }
  if (!Number.isInteger(questionCount) || questionCount <= 0 || questionCount > 50) {
    return res.status(400).json({ error: "questionCount is invalid" });
  }
  // クライアントが理論上出せる最大値を超えたスコアは弾く(改ざん・バグの検知)
  if (score > questionCount * MAX_SCORE_PER_QUESTION) {
    return res.status(400).json({ error: "score exceeds theoretical maximum" });
  }

  const entry = {
    id: crypto.randomUUID(),
    name,
    date: new Date().toISOString(),
  };

  // member はオブジェクトのまま渡す(SDKが内部でJSONシリアライズする)。
  await redis.zadd(LEADERBOARD_KEY, { score, member: entry });
  // 無制限に送信できる仕様なので、肥大化を防ぐために上位のみ残す
  await redis.zremrangebyrank(LEADERBOARD_KEY, 0, -(MAX_ENTRIES + 1));

  const rank = await redis.zrevrank(LEADERBOARD_KEY, entry);

  return res.status(201).json({ ok: true, rank: rank == null ? null : rank + 1 });
}
