// Back link from the POS login screen to the Franchise City landing site.
// Set VITE_LANDING_URL in .env.local / Vercel env for production.
export const FALLBACK_LANDING_URL = 'http://localhost:4000'

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
