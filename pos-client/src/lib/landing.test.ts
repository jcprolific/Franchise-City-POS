import { describe, it, expect } from 'vitest'
import { resolveLandingUrl, landingPageUrl, FALLBACK_LANDING_URL } from './landing'

describe('resolveLandingUrl', () => {
  it('returns the given url without a trailing slash', () => {
    expect(resolveLandingUrl('https://franchisecity.ph')).toBe('https://franchisecity.ph')
  })

  it('strips a trailing slash', () => {
    expect(resolveLandingUrl('https://franchisecity.ph/')).toBe('https://franchisecity.ph')
  })

  it('falls back when the url is missing or blank', () => {
    expect(resolveLandingUrl(undefined)).toBe(FALLBACK_LANDING_URL)
    expect(resolveLandingUrl('   ')).toBe(FALLBACK_LANDING_URL)
  })
})

describe('landingPageUrl', () => {
  it('returns the resolved landing base url', () => {
    expect(landingPageUrl('https://franchisecity.ph')).toBe('https://franchisecity.ph')
  })

  it('normalizes a trailing slash on the base', () => {
    expect(landingPageUrl('http://localhost:4000/')).toBe('http://localhost:4000')
  })
})
