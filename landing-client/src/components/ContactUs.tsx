import { Mail, Phone, MessageCircle, MapPin } from 'lucide-react'
import './ContactUs.css'

const channels = [
  { icon: Mail, label: 'Email', value: 'hello@franchisecity.ph', href: 'mailto:hello@franchisecity.ph' },
  { icon: Phone, label: 'Phone', value: '+63 900 000 0000', href: 'tel:+639000000000' },
  { icon: MessageCircle, label: 'Messenger', value: 'm.me/franchisecityph', href: '#' },
  { icon: MapPin, label: 'Office', value: 'Metro Manila, Philippines', href: '#' },
]

export default function ContactUs({ onApply }: { onApply: () => void }) {
  return (
    <section className="contact fc-section" id="contact">
      <div className="fc-container">
        <span className="fc-eyebrow contact__eyebrow">Contact Us</span>
        <h2 className="fc-section-title">Let's Talk Franchising<span className="dot">.</span></h2>
        <p className="fc-section-sub">Have questions? Reach out — our team replies within 24–48 hours.</p>
        <div className="contact__grid">
          {channels.map(({ icon: Icon, label, value, href }) => (
            <a className="contact__card" key={label} href={href}>
              <div className="contact__icon"><Icon size={20} aria-hidden={true} /></div>
              <span className="contact__label">{label}</span>
              <span className="contact__value">{value}</span>
            </a>
          ))}
        </div>
        <div className="contact__cta">
          <button className="fc-btn fc-btn-primary" onClick={onApply}>Apply to Franchise</button>
        </div>
      </div>
    </section>
  )
}
