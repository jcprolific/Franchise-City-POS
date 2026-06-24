import { Star } from 'lucide-react'
import { testimonials } from '../data/testimonials'
import './Testimonials.css'

export default function Testimonials() {
  return (
    <section className="tm fc-section">
      <div className="fc-container">
        <h2 className="fc-section-title">What Our Franchisees Say</h2>
        <p className="fc-section-sub">Real stories from owners building their empire with us.</p>
        <div className="tm__grid">
          {testimonials.map((t) => (
            <figure className="tm__card" key={t.name}>
              <div className="tm__stars" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={15} fill="currentColor" aria-hidden={true} />)}
              </div>
              <blockquote>"{t.quote}"</blockquote>
              <figcaption className="tm__person">
                <span className="tm__avatar">{t.initials}</span>
                <span><strong>{t.name}</strong><small>{t.location}</small></span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
