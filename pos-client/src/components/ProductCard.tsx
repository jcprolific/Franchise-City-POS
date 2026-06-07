import { useState, useMemo } from 'react';
import type { Product, ProductVariant } from '../types';

interface ProductCardProps {
  product: Product;
  variants: ProductVariant[];
  index?: number;
  onAdd: (product: Product, variant: ProductVariant | null) => void;
}

function formatPrice(value: number) {
  return `₱${value.toFixed(2)}`;
}

export default function ProductCard({ product, variants, index = 0, onAdd }: ProductCardProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    variants.length > 0 ? variants[0].id : null
  );

  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === selectedId) ?? null,
    [variants, selectedId]
  );

  const price = product.base_price + (selectedVariant?.additional_price ?? 0);

  return (
    <div
      className="product-card"
      id={`product-${product.id}`}
      style={{ animationDelay: `${index * 25}ms` }}
    >
      {product.badge && <span className="product-card-badge">{product.badge}</span>}

      <div
        className={`product-card-media ${product.image_url ? 'has-image' : ''}`}
        aria-hidden="true"
      >
        {product.image_url ? (
          <img
            src={product.image_url}
            alt=""
            className="product-card-image"
            loading="lazy"
            draggable={false}
          />
        ) : (
          <span>{product.icon}</span>
        )}
      </div>

      <div className="product-card-body">
        <div className="product-card-name">{product.name}</div>
        {product.description && (
          <div className="product-card-description">{product.description}</div>
        )}

        {variants.length > 0 && (
          <div className="product-card-sizes" role="radiogroup" aria-label={`${product.name} sizes`}>
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={selectedId === v.id}
                className={`product-size-pill ${selectedId === v.id ? 'active' : ''}`}
                onClick={() => setSelectedId(v.id)}
                title={`${v.name}${v.additional_price ? ` (+${formatPrice(v.additional_price)})` : ''}`}
              >
                {v.abbr}
              </button>
            ))}
          </div>
        )}

        <div className="product-card-footer">
          <span className="product-card-price">{formatPrice(price)}</span>
          <button
            type="button"
            className="product-card-add"
            onClick={() => onAdd(product, selectedVariant)}
            aria-label={`Add ${product.name} to order`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
