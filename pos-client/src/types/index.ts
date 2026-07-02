export interface Category {
  id: string;
  name: string;
  sort_order: number;
  icon: string;
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  base_price: number;
  is_active: boolean;
  image_url: string | null;
  icon: string;
  description?: string;
  badge?: string;
  customizable?: boolean;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  abbr: string;
  additional_price: number;
}

export interface Addon {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
}

export interface RawMaterial {
  id: string;
  brand_id: string;
  name: string;
  unit: string;
  on_hand_qty: number;
  low_stock_qty: number;
  icon?: string | null;
}

export interface RecipeLine {
  id: string;
  product_id: string;
  variant_id: string | null;
  raw_material_id: string;
  quantity_per_cup: number;
  unit: string;
  yield_notes?: string | null;
}

export type IceLevel = 'NONE' | 'LESS' | 'NORMAL' | 'EXTRA';
export type DiscountType = 'NONE' | 'PWD' | 'SENIOR' | 'PROMO';
export type PaymentMethod = 'CASH' | 'GCASH' | 'CARD';
export type OrderType = 'DINE_IN' | 'TAKE_OUT';

export interface CartItemAddon {
  addon: Addon;
  price: number;
}

export interface CartItem {
  id: string;
  product: Product;
  variant: ProductVariant | null;
  quantity: number;
  ice_level: IceLevel;
  addons: CartItemAddon[];
  line_total: number;
}

export interface CartState {
  items: CartItem[];
  discount_type: DiscountType;
  discount_amount: number;
  payment_method: PaymentMethod;
  subtotal: number;
  total: number;
}

export type NavPage = 'pos' | 'inventory' | 'dashboard';
