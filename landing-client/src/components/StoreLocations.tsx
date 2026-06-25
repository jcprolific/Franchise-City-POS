import { MapPin } from 'lucide-react'
import './StoreLocations.css'

const regions = [
  { name: 'Metro Manila', count: '120+ branches' },
  { name: 'Luzon', count: '90+ branches' },
  { name: 'Visayas', count: '55+ branches' },
  { name: 'Mindanao', count: '40+ branches' },
]

export default function StoreLocations({ onApply }: { onApply: () => void }) {
  return (
    <section className="locations fc-section" id="locations">
      <div className="fc-container">
        <span className="fc-eyebrow locations__eyebrow">Store Locations</span>
        <h2 className="fc-section-title locations__title">300+ Branches Nationwide<span className="dot">.</span></h2>
        <p className="fc-section-sub locations__sub">From Luzon to Mindanao, our brands are growing in communities across the Philippines.</p>
        <div className="locations__grid">
          {regions.map((r) => (
            <div className="locations__card" key={r.name}>
              <MapPin size={20} aria-hidden={true} />
              <h3>{r.name}</h3>
              <span>{r.count}</span>
            </div>
          ))}
        </div>
        <div className="locations__cta">
          <p>Want a branch in your area?</p>
          <button className="fc-btn fc-btn-primary" onClick={onApply}>Start Your Franchise</button>
        </div>
      </div>
    </section>
  )
}
