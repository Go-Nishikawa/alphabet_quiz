import { useCallback, useEffect, useRef, useState } from "react";
import { gradeAnswer, scoreQuestion, timeLimitFor } from "../utils/quiz.js";

const TICK_MS = 100;

export default function QuizScreen({
  questions,
  showHint,
  useTimeLimit,
  onFinish,
}) {
  const [index, setIndex] = useState(0);
  const [inputs, setInputs] = useState(() =>
    questions[0].letterHints.map(() => ""),
  );
  const [graded, setGraded] = useState(null);
  const [combo, setCombo] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [records, setRecords] = useState([]);
  const inputRefs = useRef([]);
  // タイマー経由の採点は再レンダリングを挟まないので、最新の入力を ref で参照する。
  const inputsRef = useRef(inputs);
  const deadlineRef = useRef(0);

  const total = questions.length;
  const current = questions[index];
  const isLast = index === total - 1;
  const timeLimit = timeLimitFor(current);
  const [remainingMs, setRemainingMs] = useState(timeLimit);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, [index]);

  const finishQuestion = useCallback(
    (timeRatio) => {
      const result = gradeAnswer(current, inputsRef.current);
      const nextCombo = result.perfect ? combo + 1 : 0;
      const score = scoreQuestion({
        earned: result.earned,
        max: result.max,
        perfect: result.perfect,
        timeRatio,
        comboCount: nextCombo,
      });

      setCombo(nextCombo);
      setTotalScore((prev) => prev + score.total);
      setGraded({ ...result, score, timedOut: timeRatio === 0 && useTimeLimit });
    },
    [current, combo, useTimeLimit],
  );

  useEffect(() => {
    if (!useTimeLimit || graded) return undefined;
    deadlineRef.current = Date.now() + timeLimit;
    const id = setInterval(() => {
      const left = Math.max(deadlineRef.current - Date.now(), 0);
      setRemainingMs(left);
      if (left === 0) {
        clearInterval(id);
        finishQuestion(0);
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [useTimeLimit, graded, timeLimit, finishQuestion]);

  function updateInput(i, value) {
    const next = inputs.map((v, j) => (j === i ? value : v));
    inputsRef.current = next;
    setInputs(next);
  }

  function handleKeyDown(e, i) {
    if (e.key === "Enter" && i < inputs.length - 1) {
      e.preventDefault();
      inputRefs.current[i + 1]?.focus();
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (graded) return;
    finishQuestion(useTimeLimit ? remainingMs / timeLimit : 0);
  }

  function handleNext() {
    const nextRecords = [
      ...records,
      {
        abbreviation: current.abbreviation,
        fullForm: current.fullForm,
        meaningJa: current.meaningJa,
        blanks: graded.blanks,
        earned: graded.earned,
        max: graded.max,
        perfect: graded.perfect,
        score: graded.score.total,
      },
    ];

    if (isLast) {
      onFinish(nextRecords, totalScore);
      return;
    }

    const nextIndex = index + 1;
    const nextInputs = questions[nextIndex].letterHints.map(() => "");
    inputsRef.current = nextInputs;
    setRecords(nextRecords);
    setIndex(nextIndex);
    setInputs(nextInputs);
    setGraded(null);
    setRemainingMs(timeLimitFor(questions[nextIndex]));
    inputRefs.current = [];
  }

  const timeRatio = remainingMs / timeLimit;

  return (
    <div className="screen quiz-screen">
      <div className="quiz-header">
        <span className="quiz-progress">
          問題 {index + 1} / {total}
        </span>
        <span className="quiz-score">{totalScore} 点</span>
        <span className="quiz-combo">コンボ {combo}</span>
      </div>

      {useTimeLimit && (
        <div className="timer">
          <div className="timer__track">
            <div
              className={`timer__bar${timeRatio <= 0.3 ? " timer__bar--warning" : ""}`}
              style={{ width: `${timeRatio * 100}%` }}
            />
          </div>
          <span className="timer__label">
            残り {Math.ceil(remainingMs / 1000)} 秒
          </span>
        </div>
      )}

      <div className="quiz-abbreviation">{current.abbreviation}</div>
      <p className="quiz-prompt">それぞれの文字は何の略?</p>
      {showHint && <p className="quiz-hint">{current.meaningJa}</p>}

      <form className="blank-form" onSubmit={handleSubmit}>
        <div className="blank-list">
          {current.letterHints.map((hint, i) => {
            const result = graded?.blanks[i];
            let className = "blank";
            if (result) {
              className += result.correct ? " blank--correct" : " blank--wrong";
            }
            return (
              <div key={i} className={className}>
                <span className="blank__letter">{hint.letter}</span>
                <input
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  type="text"
                  className="blank__input"
                  value={inputs[i]}
                  onChange={(e) => updateInput(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, i)}
                  disabled={graded !== null}
                  placeholder="?"
                />
                {result && !result.correct && (
                  <span className="blank__correct">{result.correctWord}</span>
                )}
              </div>
            );
          })}
        </div>

        {!graded && (
          <button type="submit" className="primary-button answer-button">
            回答する
          </button>
        )}
      </form>

      {graded && (
        <div
          className={`feedback${graded.perfect ? " feedback--correct" : " feedback--wrong"}`}
        >
          <p className="feedback__result">
            {graded.timedOut
              ? "時間切れ"
              : graded.perfect
                ? "完答!"
                : `${graded.earned} / ${graded.max} 文字正解`}
          </p>
          <p className="feedback__score">+{graded.score.total} 点</p>
          <p className="feedback__breakdown">
            基礎 {graded.score.base}
            {graded.score.speed > 0 && ` / スピード +${graded.score.speed}`}
            {graded.score.combo > 0 && ` / コンボ +${graded.score.combo}`}
          </p>
          <p className="feedback__explanation">
            {current.abbreviation} = {current.fullForm}
            (「{current.meaningJa}」)
          </p>
          <button type="button" className="primary-button" onClick={handleNext}>
            {isLast ? "結果を見る" : "次の問題へ"}
          </button>
        </div>
      )}
    </div>
  );
}
