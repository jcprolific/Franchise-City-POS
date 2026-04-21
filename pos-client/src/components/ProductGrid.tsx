import type { Product } from '../types';
import './ProductGrid.css';

interface ProductGridProps {
  products: Product[];
  categoryName: string;
  isSearching?: boolean;
  onSelectProduct: (product: Product) => void;
}

function formatPrice(value: number) {
  return `₱${value.toFixed(2)}`;
}

export default function ProductGrid({
  products,
  categoryName,
  isSearching = false,
  onSelectProduct,
}: ProductGridProps) {
  return (
    <div className="product-grid-wrapper" id="product-grid-wrapper">
      <div className="product-grid" id="product-grid">
        {products.map((product, index) => (
          <button
            key={product.id}
            id={`product-${product.id}`}
            type="button"
            className="product-card"
            onClick={() => onSelectProduct(product)}
            style={{ animationDelay: `${index * 25}ms` }}
            aria-label={`Add ${product.name} to cart, price ${product.base_price} pesos`}
          >
            <div className="product-card-icon" aria-hidden="true">
              <span>{product.icon}</span>
            </div>
            <div className="product-card-name">{product.name}</div>
            {product.description && (
              <div className="product-card-description">{product.description}</div>
            )}
            <div className="product-card-price">{formatPrice(product.base_price)}</div>
          </button>
        ))}
      </div>

      {products.length === 0 && (
        <div className="product-empty">
          <div className="product-empty-icon">{isSearching ? '🔎' : '📭'}</div>
          <div className="product-empty-title">
            {isSearching ? 'No matches found' : `No items in ${categoryName}`}
          </div>
          <div className="product-empty-subtitle">
            {isSearching
              ? `Try a different keyword for ${categoryName}`
              : 'Check another category or add items in the catalog.'}
          </div>
        </div>
      )}
    </div>
  );
}
