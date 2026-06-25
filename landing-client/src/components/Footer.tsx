import { Globe, Camera, AtSign } from 'lucide-react'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="fc-container footer__inner">
        <div className="footer__brand">
          <a href="#top" className="footer__logo">
            <img src="/brands/franchise-city-light.png" alt="Franchise City" />
          </a>
          <p>A Filipino franchising platform helping entrepreneurs launch proven brands across the Philippines.</p>
        </div>
        <div className="footer__col">
          <h4>Navigate</h4>
          <a href="#top">Home</a>
          <a href="#brands">Brands</a>
          <a href="#franchising">Franchising</a>
          <a href="#locations">Store Locations</a>
          <a href="#about">About Us</a>
          <a href="#contact">Contact Us</a>
        </div>
        <div className="footer__col">
          <h4>Follow</h4>
          <div className="footer__social">
            <a href="#" aria-label="Facebook" onClick={(e) => e.preventDefault()}><Globe size={18} /></a>
            <a href="#" aria-label="Instagram" onClick={(e) => e.preventDefault()}><Camera size={18} /></a>
            <a href="#" aria-label="Twitter" onClick={(e) => e.preventDefault()}><AtSign size={18} /></a>
          </div>
        </div>
      </div>
      <div className="fc-container footer__copy">© 2026 Franchise City PH. All rights reserved.</div>
    </footer>
  )
}
