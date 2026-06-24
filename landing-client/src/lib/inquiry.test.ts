import { describe, it, expect } from 'vitest'
import { validateInquiry } from './inquiry'

describe('validateInquiry', () => {
  const valid = { fullName: 'Juan Dela Cruz', email: 'juan@example.com', phone: '09171234567', interestedBrand: null }

  it('returns no errors for valid input', () => {
    expect(validateInquiry(valid)).toEqual({})
  })

  it('flags a blank name', () => {
    expect(validateInquiry({ ...valid, fullName: '  ' }).fullName).toBeDefined()
  })

  it('flags an invalid email', () => {
    expect(validateInquiry({ ...valid, email: 'not-an-email' }).email).toBeDefined()
  })

  it('flags a blank email', () => {
    expect(validateInquiry({ ...valid, email: '' }).email).toBeDefined()
  })

  it('flags a too-short phone', () => {
    expect(validateInquiry({ ...valid, phone: '123' }).phone).toBeDefined()
  })
})
