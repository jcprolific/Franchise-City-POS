import { ArrowRight } from 'lucide-react'
import './Hero.css'

export default function Hero({ onApply }: { onApply: () => void }) {
  return (
    <section className="hero" id="top">
      <div className="hero__glow" aria-hidden />
      <div className="fc-container hero__inner">
        <span className="hero__badge">★ Start Your Business Journey</span>
        <h1 className="hero__title">
          Build Your Empire<span className="dot">.</span><br />
          <span className="hero__title-accent">Start With a Franchise<span className="dot">.</span></span>
        </h1>
        <p className="hero__sub">
          Franchise City gives aspiring entrepreneurs the tools, brands, and support to
          launch a successful business — anywhere in the Philippines.
        </p>
        <div className="hero__cta">
          <button className="fc-btn fc-btn-primary" onClick={onApply}>Franchise Now <ArrowRight size={16} aria-hidden={true} /></button>
          <a className="fc-btn fc-btn-ghost" href="#brands">Explore Brands</a>
        </div>
        <ul className="hero__stats">
          <li>● 300+ Branches</li>
          <li>● Proven Brands</li>
          <li>● End-to-End Support</li>
        </ul>
      </div>
    </section>
  )
}
