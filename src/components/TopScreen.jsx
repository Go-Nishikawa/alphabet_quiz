import { useState } from "react";
import { CATEGORIES } from "../data/categories.js";
import CategoryCard from "./CategoryCard.jsx";

export default function TopScreen({ onStart }) {
  const [selectedCategories, setSelectedCategories] = useState(
    CATEGORIES.map((c) => c.id),
  );
  const [showHint, setShowHint] = useState(true);
  const [useTimeLimit, setUseTimeLimit] = useState(true);

  function toggleCategory(id) {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  const canStart = selectedCategories.length > 0;

  return (
    <div className="screen top-screen">
      <h1>略語クイズ</h1>
      <p className="lead">
        略語の各文字が何の略かを答えるクイズです。完答で100点、一部正解でも部分点。速く答えるとスピードボーナス、完答を続けるとコンボボーナスがつきます。
      </p>

      <section className="section">
        <h2>カテゴリを選ぶ</h2>
        <div className="category-grid">
          {CATEGORIES.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              selected={selectedCategories.includes(category.id)}
              onToggle={toggleCategory}
            />
          ))}
        </div>
      </section>

      <section className="section">
        <label className="checkbox-option">
          <input
            type="checkbox"
            checked={showHint}
            onChange={(e) => setShowHint(e.target.checked)}
          />
          ヒントを表示する
        </label>
        <label className="checkbox-option">
          <input
            type="checkbox"
            checked={useTimeLimit}
            onChange={(e) => setUseTimeLimit(e.target.checked)}
          />
          制限時間をつける(スピードボーナスあり)
        </label>
      </section>

      <button
        type="button"
        className="primary-button start-button"
        disabled={!canStart}
        onClick={() => onStart(selectedCategories, showHint, useTimeLimit)}
      >
        クイズを始める
      </button>
      {!canStart && <p className="hint">カテゴリを1つ以上選んでください</p>}
    </div>
  );
}
