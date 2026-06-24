import './StatsBand.css'

const stats = [
  { value: '300+', label: 'Branches Nationwide' },
  { value: '4', label: 'Franchise Brands' },
  { value: '100%', label: 'Filipino-Owned' },
]

export default function StatsBand() {
  return (
    <section className="statsband">
      <div className="fc-container statsband__grid">
        {stats.map((s) => (
          <div className="statsband__item" key={s.label}>
            <div className="statsband__value">{s.value}</div>
            <div className="statsband__label">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
