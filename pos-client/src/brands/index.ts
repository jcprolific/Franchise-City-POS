import type { BrandConfig, BrandSlug } from './types';
import { cofteaBrand } from './coftea';
import { potatoCornerBrand } from './potatoCorner';

export const BRANDS: Record<BrandSlug, BrandConfig> = {
  'potato-corner': potatoCornerBrand,
  coftea: cofteaBrand,
};

export const BRAND_LIST: BrandConfig[] = [potatoCornerBrand, cofteaBrand];

export function getBrandBySlug(slug: BrandSlug): BrandConfig {
  return BRANDS[slug];
}

export function isBrandSlug(value: string): value is BrandSlug {
  return value === 'potato-corner' || value === 'coftea';
}

export const DEFAULT_BRAND_SLUG: BrandSlug = 'potato-corner';
export const BRAND_STORAGE_KEY = 'coftea.pos.selectedBrand';

export * from './types';
export { potatoCornerBrand, cofteaBrand };
