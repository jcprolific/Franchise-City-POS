import { steps } from '../data/steps'
import './HowToStart.css'

export default function HowToStart() {
  return (
    <section className="how fc-section" id="how">
      <div className="fc-container">
        <h2 className="fc-section-title">How to Get Started</h2>
        <p className="fc-section-sub">Three simple steps from inquiry to opening day.</p>
        <div className="how__grid">
          {steps.map((s) => (
            <div className="how__step" key={s.number}>
              <div className="how__num">{s.number}</div>
              <h3>{s.title}</h3>
              <p>{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
