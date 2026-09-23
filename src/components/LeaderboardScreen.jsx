import { useEffect, useState } from "react";
import { fetchLeaderboard } from "../utils/leaderboardApi.js";

export default function LeaderboardScreen({ onGoTop }) {
  const [status, setStatus] = useState("loading"); // loading | loaded | error
  const [entries, setEntries] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchLeaderboard(20)
      .then((data) => {
        if (cancelled) return;
        setEntries(data);
        setStatus("loaded");
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMessage(err.message);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="screen leaderboard-screen">
      <h1>ランキング</h1>

      {status === "loading" && <p className="hint">読み込み中…</p>}
      {status === "error" && <p className="leaderboard-submit__error">{errorMessage}</p>}
      {status === "loaded" && entries.length === 0 && (
        <p className="hint">まだ誰も登録していません。最初の1人になりましょう!</p>
      )}
      {status === "loaded" && entries.length > 0 && (
        <ol className="leaderboard-list">
          {entries.map((entry, i) => (
            <li key={i} className="leaderboard-list__item">
              <span className="leaderboard-list__rank">{i + 1}</span>
              <span className="leaderboard-list__name">{entry.name}</span>
              <span className="leaderboard-list__score">{entry.score} 点</span>
            </li>
          ))}
        </ol>
      )}

      <div className="result-actions">
        <button type="button" className="secondary-button" onClick={onGoTop}>
          トップに戻る
        </button>
      </div>
    </div>
  );
}
