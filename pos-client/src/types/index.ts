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
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  additional_price: number;
}

export interface Addon {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
}

export type SugarLevel = '0%' | '25%' | '50%' | '75%' | '100%';
export type IceLevel = 'NONE' | 'LESS' | 'NORMAL' | 'EXTRA';
export type DiscountType = 'NONE' | 'PWD' | 'SENIOR' | 'PROMO';
export type PaymentMethod = 'CASH' | 'GCASH' | 'CARD';

export interface CartItemAddon {
  addon: Addon;
  price: number;
}

export interface CartItem {
  id: string;
  product: Product;
  variant: ProductVariant | null;
  quantity: number;
  sugar_level: SugarLevel;
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
