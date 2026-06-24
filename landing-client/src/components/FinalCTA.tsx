import { ArrowRight } from 'lucide-react'
import './FinalCTA.css'

export default function FinalCTA({ onApply }: { onApply: () => void }) {
  return (
    <section className="finalcta">
      <div className="fc-container finalcta__inner">
        <h2>Ready to Be Your Own Boss?</h2>
        <p>Join hundreds of successful franchisees across the Philippines.</p>
        <button className="fc-btn fc-btn-light" onClick={onApply}>Start Your Franchise Journey <ArrowRight size={16} aria-hidden={true} /></button>
      </div>
    </section>
  )
}
