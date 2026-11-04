import { Link } from 'react-router-dom'
import { Plus, ChevronRight } from 'lucide-react'
import { useStore } from '../store'
import Previa from '../components/Previa'
import { tonight, fmtDate } from '../utils'

export default function Hoy() {
  const { data, update } = useStore()
  const t = tonight()
  const night = data.nights.find((n) => n.date === t) ||
    data.nights.filter((n) => n.date > t).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0]

  if (!night) return (
    <>
      <h1>Hoy</h1>
      <p className="lead">No hay ninguna noche armada. Qué vida tan tranquila.</p>
      <div className="row" style={{ marginTop: 24 }}><Link to="/noches/nueva" className="btn"><Plus size={16} /> Armar una noche</Link></div>
    </>
  )

  const patch = (fn) => update('nights', (ns) => ns.map((n) => (n.id === night.id ? fn(n) : n)))
  const max = Math.max(0, ...night.previas.map((p) => p.votes.length))
  const leaders = max ? night.previas.filter((p) => p.votes.length === max).map((p) => p.place) : []
  const going = data.members.filter((m) => night.rsvp[m.id] === 'yes').map((m) => m.name)

  return (
    <>
      <p className="muted small">{night.date === t ? 'Hoy' : 'Próxima salida'} · {fmtDate(night.date)} · {night.time} hs{night.zone ? ` · ${night.zone}` : ''}</p>
      <h1 style={{ marginTop: 6 }}>{night.date === t ? 'La previa de hoy' : 'La próxima previa'}</h1>
      <div className="result">
        <div>
          <div className="muted small">{!leaders.length ? 'Todavía sin definir' : leaders.length > 1 ? 'Empate, por ahora' : 'Es en'}</div>
          <b style={{ fontSize: 26, letterSpacing: '-.02em' }}>{leaders.length ? leaders.join(' / ') : 'A votar dónde'}</b>
        </div>
      </div>
      <p className="muted small" style={{ marginTop: 12 }}>{going.length ? `Van (${going.length}): ${going.join(', ')}` : 'Todavía nadie confirmó.'}</p>

      <Previa night={night} patch={patch} title="Votá la previa" />

      <Link to={`/noches/${night.id}`} className="li">
        <div className="grow"><b>{night.title}</b><div className="muted small">Asistencia, boliche, invitados y compartir</div></div>
        <ChevronRight size={16} className="muted" />
      </Link>
    </>
  )
}
