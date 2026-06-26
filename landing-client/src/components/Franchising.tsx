import { ArrowRight } from 'lucide-react'
import './Franchising.css'

const steps = [
  'Fill out our Franchise Inquiry Form and submit your initial requirements.',
  'Attend our Franchise Orientation and Business Briefing.',
  'Choose your brand and proposed location for evaluation.',
  'Sign the Franchise Agreement and complete your Franchisee Onboarding.',
]

export default function Franchising() {
  return (
    <section className="franchising fc-section" id="franchising">
      <div className="fc-container franchising__inner">
        <div className="franchising__content">
          <span className="fc-eyebrow">Franchising</span>
          <h2 className="franchising__title">
            We Don't Just Build Franchises.<br />
            <span className="franchising__title-accent">We Build Each Other<span className="dot">.</span></span>
          </h2>

          <div className="franchising__body">
            <p>
              Franchise City connects aspiring entrepreneurs with proven brands ready to scale.
              With our extensive network of <strong>300+ branches across the Philippines</strong>,
              we've built a system that works — and we want you to be part of it.
            </p>
            <p>
              We don't just hand you a brand. We give you the complete blueprint — from store
              setup and training to ongoing operational support — so you can focus on running
              your business with confidence.
            </p>
            <p>
              Since our founding, Franchise City has helped hundreds of franchisees turn their
              investment into a thriving, sustainable business. Today, we continue to grow — and
              we're looking for driven individuals who are ready to build their empire.
            </p>
            <p>
              Our franchisees are the backbone of our success. When you choose Franchise City,
              you're not just buying a franchise — you're joining a <strong>community of winners</strong>.
            </p>
          </div>

          <h3 className="franchising__steps-title">How to Get Started:</h3>
          <ol className="franchising__steps">
            {steps.map((s, i) => (
              <li key={i}><span className="franchising__num">{i + 1}</span>{s}</li>
            ))}
          </ol>

          <a className="fc-btn fc-btn-primary franchising__cta" href="/#inquiry">
            Franchise Now <ArrowRight size={16} aria-hidden={true} />
          </a>
        </div>

        <div className="franchising__media">
          <img src="/images/franchising-model.png" alt="Franchise City franchisee" />
        </div>
      </div>
    </section>
  )
}
