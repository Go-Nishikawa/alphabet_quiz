import { useState } from "react";
import TopScreen from "./components/TopScreen.jsx";
import QuizScreen from "./components/QuizScreen.jsx";
import ResultScreen from "./components/ResultScreen.jsx";
import { buildQuizQuestions } from "./utils/quiz.js";
import { appendHistory } from "./utils/storage.js";
import "./App.css";

const QUESTIONS_PER_ROUND = 10;

export default function App() {
  const [screen, setScreen] = useState("top");
  const [settings, setSettings] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [records, setRecords] = useState([]);
  const [score, setScore] = useState(0);

  function startQuiz(categories, showHint, useTimeLimit) {
    setSettings({ categories, showHint, useTimeLimit });
    setQuestions(buildQuizQuestions(categories, QUESTIONS_PER_ROUND));
    setScreen("quiz");
  }

  function finishQuiz(finishedRecords, score) {
    setRecords(finishedRecords);
    setScore(score);
    appendHistory({
      date: new Date().toISOString(),
      categories: settings.categories,
      score,
      earned: finishedRecords.reduce((sum, r) => sum + r.earned, 0),
      max: finishedRecords.reduce((sum, r) => sum + r.max, 0),
      perfectCount: finishedRecords.filter((r) => r.perfect).length,
      total: finishedRecords.length,
    });
    setScreen("result");
  }

  function restartQuiz() {
    if (!settings) {
      setScreen("top");
      return;
    }
    startQuiz(settings.categories, settings.showHint, settings.useTimeLimit);
  }

  function goToTop() {
    setScreen("top");
  }

  return (
    <div className="app">
      {screen === "top" && <TopScreen onStart={startQuiz} />}
      {screen === "quiz" && (
        <QuizScreen
          key={questions.map((q) => q.id).join(",")}
          questions={questions}
          showHint={settings.showHint}
          useTimeLimit={settings.useTimeLimit}
          onFinish={finishQuiz}
        />
      )}
      {screen === "result" && (
        <ResultScreen
          records={records}
          score={score}
          onRestart={restartQuiz}
          onGoTop={goToTop}
        />
      )}
    </div>
  );
}
