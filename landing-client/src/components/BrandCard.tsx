import { ArrowRight } from 'lucide-react'
import type { Brand } from '../data/brands'

export default function BrandCard({ brand, onGetStarted }: { brand: Brand; onGetStarted: (slug: string) => void }) {
  return (
    <article className="brandcard">
      <div className="brandcard__swatch">
        <img src={brand.logo} alt={brand.name} />
      </div>
      <h3 className="brandcard__name">{brand.name}</h3>
      <p className="brandcard__tagline">{brand.tagline}</p>
      <button className="brandcard__cta" onClick={() => onGetStarted(brand.slug)}>
        Get Started <ArrowRight size={14} aria-hidden={true} />
      </button>
    </article>
  )
}
