import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Disc3, Martini, Moon, ChevronRight } from 'lucide-react'
import { useStore } from '../store'
import { today, fmtDate, who } from '../utils'
import LocalNote from '../components/LocalNote'

export default function Home() {
  const { data } = useStore()
  const [i, setI] = useState(() => Math.floor(Math.random() * 100))
  const next = data.nights.filter((n) => n.date >= today()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 3)
  const phrase = data.phrases.length ? data.phrases[i % data.phrases.length] : null
  const stat = data.stats.length ? data.stats[i % data.stats.length] : null

  return (
    <>
      <div>
        <Moon className="moon" size={32} />
        <h1 className="big" style={{ marginTop: 18 }}>the perfect<br />night<i>.</i></h1>
        <p className="lead">Solo para nosotros.</p>
        <div className="row" style={{ marginTop: 24 }}>
          <Link to="/noches/nueva" className="btn"><Plus size={16} /> Armar una noche</Link>
        </div>
      </div>

      <section className="sec">
        <div className="sec-h"><h2>Próximas salidas</h2><Link to="/noches" className="muted small">Ver todas</Link></div>
        {next.map((n) => (
          <Link to={`/noches/${n.id}`} className="li" key={n.id}>
            <div className="grow">
              <b>{n.title}</b>
              <div className="muted small">{fmtDate(n.date)} · {n.time} hs{n.zone ? ` · ${n.zone}` : ''}</div>
            </div>
            <span className="tag">{Object.values(n.rsvp).filter((r) => r === 'yes').length} van</span>
            <ChevronRight size={16} className="muted" />
          </Link>
        ))}
        {!next.length && <p className="muted li">No hay nada armado. Qué vida tan tranquila.</p>}
      </section>

      <div className="links">
        <Link to="/boliches"><Disc3 /> Nuestros boliches</Link>
        <Link to="/bebidas"><Martini /> Bebidas</Link>
      </div>

      {(phrase || stat) && (
        <section className="sec">
          <div className="sec-h"><h2>Del archivo del grupo</h2>
            <button className="btn ghost sm" onClick={() => setI(i + 1)}>Otra</button>
          </div>
          {phrase && <blockquote className="quote">{phrase.text}<small>— {who(data.members, phrase.by)}</small></blockquote>}
          {stat && (
            <div className="li" style={{ marginTop: 18 }}>
              <span className="stat">{stat.value}</span><span className="muted">{stat.label}</span>
            </div>
          )}
        </section>
      )}
      <div className="sec"><LocalNote /></div>
    </>
  )
}
