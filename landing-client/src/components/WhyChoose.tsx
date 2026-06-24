import { BadgeCheck, LifeBuoy, MapPin } from 'lucide-react'
import './WhyChoose.css'

const items = [
  { icon: BadgeCheck, title: 'Proven Brands', text: 'Handpicked brands with loyal customer bases and track records.' },
  { icon: LifeBuoy, title: 'Full Support System', text: 'From onboarding to daily ops, we guide you every step.' },
  { icon: MapPin, title: 'Nationwide Reach', text: '300+ branches and growing across the Philippines.' },
]

export default function WhyChoose() {
  return (
    <section className="why fc-section" id="why">
      <div className="fc-container">
        <h2 className="fc-section-title">Why Choose Franchise City?</h2>
        <p className="fc-section-sub">Built for Filipino entrepreneurs who want to start strong and grow further.</p>
        <div className="why__grid">
          {items.map(({ icon: Icon, title, text }) => (
            <div className="why__card" key={title}>
              <div className="why__icon"><Icon size={20} /></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
