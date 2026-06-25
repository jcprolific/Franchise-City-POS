import { Sparkles, HeartHandshake, TrendingUp } from 'lucide-react'
import './AboutUs.css'

const points = [
  { icon: Sparkles, title: 'Proven Concepts', text: 'Every brand in our portfolio is market-tested and loved by Filipino customers.' },
  { icon: HeartHandshake, title: 'Real Partnership', text: 'We grow when you grow — from site selection to your grand opening and beyond.' },
  { icon: TrendingUp, title: 'Built to Scale', text: 'Systems, supply chain, and training designed to help you open store after store.' },
]

export default function AboutUs() {
  return (
    <section className="about fc-section" id="about">
      <div className="fc-container about__inner">
        <div className="about__intro">
          <span className="fc-eyebrow">About Us</span>
          <h2 className="about__title">Building Filipino Entrepreneurs<span className="dot">.</span></h2>
          <p>
            Franchise City is a Filipino franchising platform that helps aspiring entrepreneurs
            launch and grow proven food &amp; beverage brands across the country. We bring together
            handpicked concepts, end-to-end support, and a nationwide network — so you can start
            strong and build something that lasts.
          </p>
          <p>
            Whether it's your first business or your next branch, our team guides you every step
            of the way — from choosing the right brand to opening day and daily operations.
          </p>
        </div>
        <div className="about__points">
          {points.map(({ icon: Icon, title, text }) => (
            <div className="about__point" key={title}>
              <div className="about__icon"><Icon size={20} aria-hidden={true} /></div>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
