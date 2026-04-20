import { useState, useMemo } from 'react';
import type { Product, ProductVariant, Addon, SugarLevel, IceLevel, CartItemAddon } from '../types';
import './CustomizationModal.css';

interface CustomizationModalProps {
  product: Product;
  variants: ProductVariant[];
  addons: Addon[];
  onAddToCart: (
    product: Product,
    variant: ProductVariant | null,
    sugar: SugarLevel,
    ice: IceLevel,
    addons: CartItemAddon[]
  ) => void;
  onClose: () => void;
}

const sugarLevels: SugarLevel[] = ['0%', '25%', '50%', '75%', '100%'];
const iceLevels: IceLevel[] = ['NONE', 'LESS', 'NORMAL', 'EXTRA'];

export default function CustomizationModal({
  product,
  variants,
  addons,
  onAddToCart,
  onClose,
}: CustomizationModalProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    variants.length > 0 ? variants[0] : null
  );
  const [sugarLevel, setSugarLevel] = useState<SugarLevel>('100%');
  const [iceLevel, setIceLevel] = useState<IceLevel>('NORMAL');
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());

  const toggleAddon = (addonId: string) => {
    setSelectedAddons((prev) => {
      const next = new Set(prev);
      if (next.has(addonId)) {
        next.delete(addonId);
      } else {
        next.add(addonId);
      }
      return next;
    });
  };

  const itemTotal = useMemo(() => {
    let total = product.base_price;
    if (selectedVariant) total += selectedVariant.additional_price;
    selectedAddons.forEach((id) => {
      const addon = addons.find((a) => a.id === id);
      if (addon) total += addon.price;
    });
    return total;
  }, [product, selectedVariant, selectedAddons, addons]);

  const handleAdd = () => {
    const cartAddons: CartItemAddon[] = Array.from(selectedAddons)
      .map((id) => {
        const addon = addons.find((a) => a.id === id);
        return addon ? { addon, price: addon.price } : null;
      })
      .filter(Boolean) as CartItemAddon[];

    onAddToCart(product, selectedVariant, sugarLevel, iceLevel, cartAddons);
  };

  return (
    <div className="modal-overlay" onClick={onClose} id="customization-modal">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-product-info">
            <span className="modal-product-icon">{product.icon}</span>
            <div>
              <div className="modal-product-name">{product.name}</div>
              <div className="modal-product-price">₱{product.base_price}</div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-body">
          {/* Size / Variant */}
          {variants.length > 0 && (
            <div className="option-group">
              <span className="option-group-label">Size</span>
              <div className="option-buttons">
                {variants.map((v) => (
                  <button
                    key={v.id}
                    className={`option-btn ${selectedVariant?.id === v.id ? 'selected' : ''}`}
                    onClick={() => setSelectedVariant(v)}
                  >
                    {v.name}
                    {v.additional_price > 0 && (
                      <span className="option-price">+₱{v.additional_price}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sugar Level */}
          <div className="option-group">
            <span className="option-group-label">Sugar Level</span>
            <div className="option-buttons">
              {sugarLevels.map((s) => (
                <button
                  key={s}
                  className={`option-btn ${sugarLevel === s ? 'selected' : ''}`}
                  onClick={() => setSugarLevel(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Ice Level */}
          <div className="option-group">
            <span className="option-group-label">Ice Level</span>
            <div className="option-buttons">
              {iceLevels.map((i) => (
                <button
                  key={i}
                  className={`option-btn ${iceLevel === i ? 'selected' : ''}`}
                  onClick={() => setIceLevel(i)}
                >
                  {i === 'NONE' ? 'No Ice' : i.charAt(0) + i.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Add-ons */}
          {addons.length > 0 && (
            <div className="option-group">
              <span className="option-group-label">Add-ons</span>
              <div className="addons-grid">
                {addons.map((addon) => (
                  <button
                    key={addon.id}
                    className={`addon-btn ${selectedAddons.has(addon.id) ? 'selected' : ''}`}
                    onClick={() => toggleAddon(addon.id)}
                  >
                    <span>{addon.name}</span>
                    <span className="addon-price">+₱{addon.price}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="modal-total-row">
            <span>Item Total</span>
            <span className="modal-total-price">₱{itemTotal.toFixed(2)}</span>
          </div>
          <button className="modal-add-btn" id="add-to-cart-btn" onClick={handleAdd}>
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
