import type { Addon, Category, Product, ProductVariant } from '../types';

export type BrandSlug = 'potato-corner' | 'coftea';

export interface BrandTheme {
  primary: string;
  primaryDeep: string;
  primarySoft: string;
  primarySoftBorder: string;
  accent: string;
  accentSoft: string;
  sidebar: string;
  sidebarHover: string;
  highlight: string;
  highlightSoft: string;
  loginGradient: string;
}

export interface BrandMenu {
  categories: Category[];
  products: Product[];
  variants: ProductVariant[];
  addons: Addon[];
  searchPlaceholder: string;
  emptyIcon: string;
  loadingEmoji: string;
}

/** Supabase `brands.id` UUID used for `brand_id` columns in orders/branches. */
export interface BrandConfig {
  id: string;
  dbBrandId: string;
  slug: BrandSlug;
  name: string;
  shortName: string;
  logoUrl: string;
  franchiseName: string;
  branchLabel: string;
  terminalLabel: string;
  appTitle: string;
  footerText: string;
  theme: BrandTheme;
  menu: BrandMenu;
}
