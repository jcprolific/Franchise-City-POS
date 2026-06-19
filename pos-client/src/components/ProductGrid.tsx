import type { Product, ProductVariant } from '../types';
import ProductCard from './ProductCard';
import './ProductGrid.css';

interface ProductGridProps {
  products: Product[];
  variants: ProductVariant[];
  categoryName: string;
  isSearching?: boolean;
  emptyIcon?: string;
  onAddProduct: (product: Product, variant: ProductVariant | null) => void;
}

export default function ProductGrid({
  products,
  variants,
  categoryName,
  isSearching = false,
  emptyIcon = '🍟',
  onAddProduct,
}: ProductGridProps) {
  return (
    <div className="product-grid-wrapper" id="product-grid-wrapper">
      <div className="product-grid" id="product-grid">
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            variants={variants.filter((v) => v.product_id === product.id)}
            index={index}
            onAdd={onAddProduct}
          />
        ))}
      </div>

      {products.length === 0 && (
        <div className="product-empty">
          <div className="product-empty-icon">{isSearching ? '🔎' : emptyIcon}</div>
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
