// Back link from the POS login screen to the Franchise City landing site.
// Override with VITE_LANDING_URL in .env.local / Vercel when using a custom domain.
export const FALLBACK_LANDING_URL = 'https://www.franchisecity.ph'

/** Resolve the landing base URL, applying the fallback and trimming trailing slashes. */
export function resolveLandingUrl(raw?: string): string {
  const url = raw?.trim() ? raw.trim() : FALLBACK_LANDING_URL
  return url.replace(/\/+$/, '')
}

/** Franchise City landing page — used by the login back arrow. */
export function landingPageUrl(base?: string): string {
  const resolved = base ?? (import.meta.env.VITE_LANDING_URL as string | undefined)
  return resolveLandingUrl(resolved)
}
