import type { BrandTheme } from './types';

const THEME_VAR_MAP: Record<keyof BrandTheme, string[]> = {
  primary: ['--pc-green', '--pos-accent', '--accent', '--text-price'],
  primaryDeep: ['--pc-green-deep', '--pos-accent-strong', '--accent-dark'],
  primarySoft: ['--pc-green-soft', '--pos-accent-soft'],
  primarySoftBorder: ['--pc-green-soft-border'],
  accent: ['--pc-orange', '--pos-accent'],
  accentSoft: ['--pc-orange-soft'],
  sidebar: ['--pc-sidebar'],
  sidebarHover: ['--pc-sidebar-hover'],
  highlight: ['--pc-yellow'],
  highlightSoft: ['--pc-yellow-soft'],
  loginGradient: [],
};

export function applyBrandTheme(theme: BrandTheme, root: HTMLElement = document.documentElement) {
  (Object.entries(THEME_VAR_MAP) as [keyof BrandTheme, string[]][]).forEach(([key, cssVars]) => {
    cssVars.forEach((cssVar) => {
      root.style.setProperty(cssVar, theme[key]);
    });
  });

  root.style.setProperty('--brand-login-gradient', theme.loginGradient);
}

export function clearBrandTheme(root: HTMLElement = document.documentElement) {
  const allVars = new Set(Object.values(THEME_VAR_MAP).flat());
  allVars.forEach((cssVar) => root.style.removeProperty(cssVar));
  root.style.removeProperty('--brand-login-gradient');
}
