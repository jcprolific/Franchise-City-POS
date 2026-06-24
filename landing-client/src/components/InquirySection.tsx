import { useState } from 'react'
import { brands } from '../data/brands'
import { validateInquiry, submitInquiry, type ValidationErrors } from '../lib/inquiry'
import { isSupabaseConfigured } from '../lib/supabase'
import './InquirySection.css'

export default function InquirySection({ selectedBrand }: { selectedBrand: string | null }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [serverError, setServerError] = useState('')

  const brandName = brands.find((b) => b.slug === selectedBrand)?.name ?? null
  const configured = isSupabaseConfigured()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const input = { fullName, email, phone, interestedBrand: selectedBrand }
    const found = validateInquiry(input)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    setStatus('sending')
    setServerError('')
    const result = await submitInquiry(input)
    if (result.ok) {
      setStatus('done')
      setFullName(''); setEmail(''); setPhone('')
    } else {
      setStatus('error')
      setServerError(result.error ?? 'May naganap na error. Pakisubukan muli.')
    }
  }

  return (
    <section className="inquiry fc-section" id="inquiry">
      <div className="fc-container inquiry__inner">
        <div className="inquiry__intro">
          <span className="fc-eyebrow">Apply Now</span>
          <h2 className="inquiry__title">Start Your Franchise Journey<span className="dot">.</span></h2>
          <p>Fill out the form and our team will reach out within 24–48 hours.
            {brandName && <> You're inquiring about <strong>{brandName}</strong>.</>}
          </p>
        </div>

        {status === 'done' ? (
          <div className="inquiry__success" role="status">
            <h3>Salamat! 🎉</h3>
            <p>Na-receive namin ang iyong inquiry. Aabutin ka ng team namin within 24–48 hours.</p>
          </div>
        ) : (
          <form className="inquiry__form" onSubmit={handleSubmit} noValidate>
            <label>
              Full name
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Juan Dela Cruz" />
              {errors.fullName && <span className="inquiry__err">{errors.fullName}</span>}
            </label>
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="juan@email.com" />
              {errors.email && <span className="inquiry__err">{errors.email}</span>}
            </label>
            <label>
              Phone
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0917 123 4567" />
              {errors.phone && <span className="inquiry__err">{errors.phone}</span>}
            </label>
            {!configured && <p className="inquiry__err">Form temporarily unavailable (missing configuration).</p>}
            {status === 'error' && <p className="inquiry__err">{serverError}</p>}
            <button className="fc-btn fc-btn-primary inquiry__submit" disabled={!configured || status === 'sending'}>
              {status === 'sending' ? 'Sending…' : 'Submit Inquiry'}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
