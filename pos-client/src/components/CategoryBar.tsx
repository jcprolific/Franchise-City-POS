import type { Category } from '../types';
import './CategoryBar.css';

interface CategoryBarProps {
  categories: Category[];
  activeCategoryId: string;
  onSelectCategory: (id: string) => void;
}

export default function CategoryBar({
  categories,
  activeCategoryId,
  onSelectCategory,
}: CategoryBarProps) {
  return (
    <div className="category-bar" id="category-bar" role="tablist">
      {categories.map((cat) => {
        const isActive = activeCategoryId === cat.id;
        return (
          <button
            key={cat.id}
            id={`category-${cat.id}`}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`category-pill ${isActive ? 'active' : ''}`}
            onClick={() => onSelectCategory(cat.id)}
          >
            <span className="category-pill-name">{cat.name}</span>
          </button>
        );
      })}
    </div>
  );
}
