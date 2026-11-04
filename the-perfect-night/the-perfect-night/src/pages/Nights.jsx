import { Link } from 'react-router-dom'
import { Plus, ChevronRight } from 'lucide-react'
import { useStore } from '../store'
import { today, fmtDate } from '../utils'

function Row({ n }) {
  return (
    <Link to={`/noches/${n.id}`} className="li">
      <div className="grow">
        <b>{n.title}</b>
        <div className="muted small">{fmtDate(n.date)} · {n.time} hs{n.zone ? ` · ${n.zone}` : ''}</div>
      </div>
      <span className="tag">{Object.values(n.rsvp).filter((r) => r === 'yes').length} van</span>
      <ChevronRight size={16} className="muted" />
    </Link>
  )
}

export default function Nights() {
  const { data } = useStore()
  const sorted = [...data.nights].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  const next = sorted.filter((n) => n.date >= today())
  const past = sorted.filter((n) => n.date < today()).reverse()
  return (
    <>
      <div className="sec-h"><h1>Noches</h1><Link to="/noches/nueva" className="btn sm"><Plus size={14} /> Nueva</Link></div>
      <section className="sec">
        <h2>Próximas</h2>
        {next.map((n) => <Row key={n.id} n={n} />)}
        {!next.length && <p className="muted li">Nada a la vista.</p>}
      </section>
      {past.length > 0 && (
        <section className="sec"><h2>Ya fueron</h2>{past.map((n) => <Row key={n.id} n={n} />)}</section>
      )}
    </>
  )
}
