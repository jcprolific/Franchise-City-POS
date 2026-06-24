import { brands } from '../data/brands'
import BrandCard from './BrandCard'
import './BrandsSection.css'

export default function BrandsSection({ onGetStarted }: { onGetStarted: (slug: string) => void }) {
  return (
    <section className="brands fc-section" id="brands">
      <div className="fc-container">
        <h2 className="fc-section-title">Our Brands</h2>
        <p className="fc-section-sub">Choose the brand that fits you.</p>
        <div className="brands__grid">
          {brands.map((b) => <BrandCard key={b.slug} brand={b} onGetStarted={onGetStarted} />)}
        </div>
      </div>
    </section>
  )
}
