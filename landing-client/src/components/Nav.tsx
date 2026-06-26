import './Nav.css'

export default function Nav() {
  return (
    <header className="nav">
      <div className="fc-container nav__inner">
        <a href="/" className="nav__logo">
          <img src="/brands/franchise-city-light.png" alt="Franchise City" />
        </a>
        <nav className="nav__links">
          <a href="/">Home</a>
          <a href="/#brands">Brands</a>
          <a href="/franchising">Franchising</a>
          <a href="/#locations">Store Locations</a>
          <a href="/#about">About Us</a>
          <a href="/#contact">Contact Us</a>
        </nav>
        <a className="fc-btn fc-btn-primary nav__cta" href="/#inquiry">Franchise Now</a>
      </div>
    </header>
  )
}
