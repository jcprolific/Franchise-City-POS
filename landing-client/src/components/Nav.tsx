import { Flame } from 'lucide-react'
import './Nav.css'

export default function Nav({ onApply }: { onApply: () => void }) {
  return (
    <header className="nav">
      <div className="fc-container nav__inner">
        <a href="#top" className="nav__logo"><Flame size={20} /> FRANCHISE<span>CITY</span></a>
        <nav className="nav__links">
          <a href="#brands">Brands</a>
          <a href="#why">Why Us</a>
          <a href="#how">How It Works</a>
        </nav>
        <button className="fc-btn fc-btn-primary nav__cta" onClick={onApply}>Franchise Now</button>
      </div>
    </header>
  )
}
