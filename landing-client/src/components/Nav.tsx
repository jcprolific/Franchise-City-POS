import './Nav.css'

export default function Nav({ onApply }: { onApply: () => void }) {
  return (
    <header className="nav">
      <div className="fc-container nav__inner">
        <a href="#top" className="nav__logo">
          <img src="/brands/franchise-city-light.png" alt="Franchise City" />
        </a>
        <nav className="nav__links">
          <a href="#top">Home</a>
          <a href="#brands">Brands</a>
          <a href="#franchising">Franchising</a>
          <a href="#locations">Store Locations</a>
          <a href="#about">About Us</a>
          <a href="#contact">Contact Us</a>
        </nav>
        <button className="fc-btn fc-btn-primary nav__cta" onClick={onApply}>Franchise Now</button>
      </div>
    </header>
  )
}
