import type { Category } from '../types';
import './CategoryBar.css';

interface CategoryBarProps {
  categories: Category[];
  activeCategoryId: string;
  onSelectCategory: (id: string) => void;
}

export default function CategoryBar({ categories, activeCategoryId, onSelectCategory }: CategoryBarProps) {
  return (
    <div className="category-bar" id="category-bar">
      {categories.map((cat) => (
        <button
          key={cat.id}
          id={`category-${cat.id}`}
          className={`category-btn ${activeCategoryId === cat.id ? 'active' : ''}`}
          onClick={() => onSelectCategory(cat.id)}
        >
          <span className="category-icon">{cat.icon}</span>
          <span className="category-name">{cat.name}</span>
        </button>
      ))}
    </div>
  );
}
