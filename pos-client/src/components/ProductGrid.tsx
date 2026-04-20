import type { Product } from '../types';
import './ProductGrid.css';

interface ProductGridProps {
  products: Product[];
  categoryName: string;
  onSelectProduct: (product: Product) => void;
}

export default function ProductGrid({ products, categoryName, onSelectProduct }: ProductGridProps) {
  return (
    <div className="product-grid-wrapper" id="product-grid-wrapper">
      <div className="product-grid-header">
        <div className="product-grid-header-icon">📋</div>
      </div>
      <div className="product-grid" id="product-grid">
        {products.map((product, index) => (
          <button
            key={product.id}
            id={`product-${product.id}`}
            className="product-card"
            onClick={() => onSelectProduct(product)}
            style={{ animationDelay: `${index * 30}ms` }}
            aria-label={`Add ${product.name} to cart, price ${product.base_price} pesos`}
          >
            <span className="product-card-icon">{product.icon}</span>
            <span className="product-card-name">{product.name}</span>
            <span className="product-card-price">₱{product.base_price}</span>
          </button>
        ))}
      </div>
      {products.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
          <div>No products in {categoryName}</div>
        </div>
      )}
    </div>
  );
}
