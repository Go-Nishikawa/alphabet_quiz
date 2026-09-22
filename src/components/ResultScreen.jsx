import { rankFor, rankThresholds } from "../utils/quiz.js";

export default function ResultScreen({ records, score, onRestart, onGoTop }) {
  const totalEarned = records.reduce((sum, r) => sum + r.earned, 0);
  const totalMax = records.reduce((sum, r) => sum + r.max, 0);
  const accuracy = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;
  const perfectCount = records.filter((r) => r.perfect).length;
  const missed = records.filter((r) => !r.perfect);
  const rank = rankFor(score, records.length);
  const thresholds = rankThresholds(records.length);
  const nextRank = [...thresholds].reverse().find(({ min }) => score < min);

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
