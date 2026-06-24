import { describe, it, expect } from 'vitest'
import { validateInquiry } from './inquiry'
import { buildInquiryPayload } from './inquiry'

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

describe('buildInquiryPayload', () => {
  it('trims fields and maps to db column names', () => {
    const row = buildInquiryPayload({
      fullName: '  Juan  ', email: ' juan@example.com ', phone: ' 0917 123 4567 ', interestedBrand: 'cof-tea',
    })
    expect(row).toEqual({
      full_name: 'Juan',
      email: 'juan@example.com',
      phone: '0917 123 4567',
      interested_brand: 'cof-tea',
    })
  })

  it('keeps interested_brand null when none chosen', () => {
    const row = buildInquiryPayload({ fullName: 'A', email: 'a@b.co', phone: '0917123', interestedBrand: null })
    expect(row.interested_brand).toBeNull()
  })
})
