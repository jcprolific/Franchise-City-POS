import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import {
  BRAND_STORAGE_KEY,
  DEFAULT_BRAND_SLUG,
  LOGIN_BRAND_LIST,
  getBrandBySlug,
  isBrandSlug,
  type BrandConfig,
  type BrandSlug,
} from '../brands';
import { applyBrandTheme } from '../brands/applyBrandTheme';

interface BrandContextValue {
  brand: BrandConfig;
  brandSlug: BrandSlug;
  setBrandSlug: (slug: BrandSlug) => void;
  isLoading: boolean;
  resolveBrandFromProfile: (userId: string) => Promise<BrandSlug | null>;
}

const BrandContext = createContext<BrandContextValue | null>(null);

function readStoredBrand(): BrandSlug {
  const stored = localStorage.getItem(BRAND_STORAGE_KEY);
  // Only honor a stored brand if it's still selectable on the login screen, so a
  // previously-chosen hidden brand (e.g. Potato Corner) can't resurface there.
  if (stored && isBrandSlug(stored) && LOGIN_BRAND_LIST.some((b) => b.slug === stored)) {
    return stored;
  }
  return DEFAULT_BRAND_SLUG;
}

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brandSlug, setBrandSlugState] = useState<BrandSlug>(() => readStoredBrand());
  const [isLoading, setIsLoading] = useState(false);

  const brand = useMemo(() => getBrandBySlug(brandSlug), [brandSlug]);

  const setBrandSlug = useCallback((slug: BrandSlug) => {
    setBrandSlugState(slug);
    localStorage.setItem(BRAND_STORAGE_KEY, slug);
  }, []);

  const resolveBrandFromProfile = useCallback(async (userId: string): Promise<BrandSlug | null> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('brand_id, brands(slug)')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      const brandRelation = data.brands as { slug?: string } | { slug?: string }[] | null;
      const slug = Array.isArray(brandRelation) ? brandRelation[0]?.slug : brandRelation?.slug;

      if (slug && isBrandSlug(slug)) {
        setBrandSlug(slug);
        return slug;
      }

      return null;
    } catch {
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [setBrandSlug]);

  useEffect(() => {
    applyBrandTheme(brand.theme);
    const appRoot = document.getElementById('app-root');
    if (appRoot) {
      applyBrandTheme(brand.theme, appRoot);
    }
    document.title = brand.appTitle;
  }, [brand]);

  const value = useMemo(
    () => ({ brand, brandSlug, setBrandSlug, isLoading, resolveBrandFromProfile }),
    [brand, brandSlug, setBrandSlug, isLoading, resolveBrandFromProfile]
  );

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error('useBrand must be used within BrandProvider');
  }
  return context;
}
