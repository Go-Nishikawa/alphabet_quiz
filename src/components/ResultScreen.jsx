import { useState } from "react";
import { rankFor, rankThresholds } from "../utils/quiz.js";
import {
  loadSavedNickname,
  saveNickname,
  submitScore,
} from "../utils/leaderboardApi.js";
import { trackEvent } from "../utils/analytics.js";
import { abbreviationSlug } from "../utils/slug.js";
import { buildIntentUrl, buildShareParams, handleShareClick } from "../utils/share.js";

export default function ResultScreen({
  records,
  score,
  onRestart,
  onGoTop,
  onShowLeaderboard,
}) {
  const [name, setName] = useState(loadSavedNickname);
  const [status, setStatus] = useState("idle"); // idle | submitting | submitted | error
  const [leaderboardRank, setLeaderboardRank] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const totalEarned = records.reduce((sum, r) => sum + r.earned, 0);
  const totalMax = records.reduce((sum, r) => sum + r.max, 0);
  const accuracy = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;
  const perfectCount = records.filter((r) => r.perfect).length;
  const missed = records.filter((r) => !r.perfect);
  const rank = rankFor(score, records.length);
  const thresholds = rankThresholds(records.length);
  const shareParams = buildShareParams({ score, rank, perfectCount, total: records.length });
  const nextRank = [...thresholds].reverse().find(({ min }) => score < min);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed === "" || status === "submitting") return;

    setStatus("submitting");
    setErrorMessage("");
    try {
      const result = await submitScore({
        name: trimmed,
        score,
        questionCount: records.length,
      });
      saveNickname(trimmed);
      setLeaderboardRank(result.rank);
      setStatus("submitted");
      trackEvent("leaderboard_submit", { score, rank: result.rank });
    } catch (err) {
      setErrorMessage(err.message);
      setStatus("error");
    }
  }

  return (
    <div className="screen result-screen">
      <h1>結果</h1>
      <div className="result-summary">
        <div className={`result-rank result-rank--${rank.toLowerCase()}`}>
          {rank}
        </div>
        <p className="result-score">{score} 点</p>
        <p className="result-accuracy">
          {totalEarned} / {totalMax} 文字正解(正答率 {accuracy}%)
        </p>
        <p className="result-accuracy">
          完答 {perfectCount} / {records.length} 問
        </p>
        {nextRank && (
          <p className="result-next">
            {nextRank.rank}ランクまであと {nextRank.min - score} 点
          </p>
        )}
        <ul className="rank-legend">
          {thresholds.map(({ rank: r, min }) => (
            <li
              key={r}
              className={`rank-legend__item${r === rank ? " rank-legend__item--current" : ""}`}
            >
              <span className="rank-legend__rank">{r}</span>
              {min}点〜
            </li>
          ))}
          <li
            className={`rank-legend__item${rank === "D" ? " rank-legend__item--current" : ""}`}
          >
            <span className="rank-legend__rank">D</span>
            それ未満
          </li>
        </ul>
      </div>

      <a
        className="primary-button share-button"
        href={buildIntentUrl(shareParams)}
        target="_blank"
        rel="noopener"
        onClick={(event) => {
          trackEvent("share_click", { score, rank, place: "result" });
          handleShareClick(event, shareParams);
        }}
      >
        Xで結果をシェア
      </a>

      <section className="section leaderboard-submit">
        {status === "submitted" ? (
          <p className="leaderboard-submit__done">
            {leaderboardRank
              ? `ランキング ${leaderboardRank} 位に登録しました!`
              : "ランキングに登録しました!"}
          </p>
        ) : (
          <form className="leaderboard-submit__form" onSubmit={handleSubmit}>
            <label className="leaderboard-submit__label" htmlFor="nickname">
              ニックネームでランキングに登録
            </label>
            <div className="leaderboard-submit__row">
              <input
                id="nickname"
                type="text"
                className="leaderboard-submit__input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                placeholder="ニックネーム"
                disabled={status === "submitting"}
              />
              <button
                type="submit"
                className="primary-button"
                disabled={status === "submitting" || name.trim() === ""}
              >
                {status === "submitting" ? "送信中…" : "登録する"}
              </button>
            </div>
            {status === "error" && (
              <p className="leaderboard-submit__error">{errorMessage}</p>
            )}
          </form>
        )}
        <button
          type="button"
          className="secondary-button leaderboard-submit__view"
          onClick={onShowLeaderboard}
        >
          ランキングを見る
        </button>
      </section>

      {missed.length > 0 && (
        <section className="section">
          <h2>完答できなかった問題</h2>
          <ul className="wrong-list">
            {missed.map((record, i) => (
              <li key={i} className="wrong-item">
                <div className="wrong-item__head">
                  <span className="wrong-item__abbr">{record.abbreviation}</span>
                  <span className="wrong-item__score">
                    {record.earned} / {record.max} 文字・{record.score} 点
                  </span>
                </div>
                <ul className="wrong-item__blanks">
                  {record.blanks.map((blank, j) => (
                    <li
                      key={j}
                      className={
                        blank.correct
                          ? "blank-review blank-review--correct"
                          : "blank-review blank-review--wrong"
                      }
                    >
                      <span className="blank-review__letter">
                        {blank.letter}
                      </span>
                      <span className="blank-review__correct">
                        {blank.correctWord}
                      </span>
                      {!blank.correct && (
                        <span className="blank-review__user">
                          あなたの回答: {blank.userAnswer || "(未回答)"}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="wrong-item__meaning">{record.meaningJa}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="section">
        <h2>今回の略語の解説ページ</h2>
        <ul className="explain-links">
          {records.map((record) => (
            <li key={record.abbreviation}>
              <a
                href={`/abbr/${abbreviationSlug(record.abbreviation)}`}
                target="_blank"
                rel="noopener"
              >
                {record.abbreviation}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <div className="result-actions">
        <button type="button" className="primary-button" onClick={onRestart}>
          もう一度
        </button>
        <button type="button" className="secondary-button" onClick={onGoTop}>
          トップに戻る
        </button>
      </div>
    </div>
  );
}
