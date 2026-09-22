export default function CategoryCard({ category, selected, onToggle }) {
  return (
    <button
      type="button"
      className={`category-card${selected ? " category-card--selected" : ""}`}
      onClick={() => onToggle(category.id)}
      aria-pressed={selected}
    >
      <span className="category-card__name">{category.name}</span>
      <span className="category-card__examples">{category.examples}</span>
    </button>
  );
}
