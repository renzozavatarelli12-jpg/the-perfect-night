import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { MessageCircle, Trash2, Plus, Trophy, MapPin, Clock, Lock, Unlock } from 'lucide-react'
import { useStore } from '../store'
import { fmtDate, uid, who, nightMessage } from '../utils'
import ShareSheet from '../components/ShareSheet'

const RSVP = [['yes', 'Voy'], ['maybe', 'Capaz'], ['no', 'No voy']]

export default function NightDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data, update, me, setMe } = useStore()
  const [sharing, setSharing] = useState(false)
  const [previa, setPrevia] = useState('')
  const night = data.nights.find((n) => n.id === id)

  if (!night) return <p>Esa noche no existe (o la borraron). <Link to="/noches" className="tag">Volver</Link></p>

  const patch = (fn) => update('nights', (ns) => ns.map((n) => (n.id === id ? fn(n) : n)))
  const toggle = (arr, x) => (arr.includes(x) ? arr.filter((y) => y !== x) : [...arr, x])
  const tally = data.boliches.map((b) => ({ b, n: Object.values(night.votes).filter((v) => v === b.id).length }))
  const max = Math.max(0, ...tally.map((t) => t.n))
  const leaders = max ? tally.filter((t) => t.n === max) : []
  const going = Object.values(night.rsvp).filter((r) => r === 'yes').length

  return (
    <>
      <div>
        <h1>{night.title}</h1>
        <div className="row muted" style={{ marginTop: 10 }}>
          <span className="row" style={{ gap: 6 }}><Clock size={15} /> {fmtDate(night.date)} · {night.time} hs</span>
          {night.zone && <span className="row" style={{ gap: 6 }}><MapPin size={15} /> {night.zone}</span>}
        </div>
        {night.notes && <p className="lead" style={{ marginTop: 10 }}>{night.notes}</p>}
        <div className="row" style={{ marginTop: 18 }}>
          <button className="btn ghost sm" onClick={() => setSharing(true)}><MessageCircle size={14} /> Compartir por WhatsApp</button>
        </div>
      </div>

      {!me && (
        <section className="sec">
          <h2>¿Quién sos?</h2>
          <div className="row" style={{ marginTop: 10 }}>
            {data.members.map((m) => <button key={m.id} className="pill" onClick={() => setMe(m.id)}>{m.name}</button>)}
          </div>
        </section>
      )}

      <section className="sec">
        <div className="sec-h"><h2>Asistencia</h2><span className="tag">{going} confirmados</span></div>
        {data.members.map((m) => (
          <div className="li" key={m.id}>
            <span className="grow">{m.name}{m.id === me && <span className="muted"> (vos)</span>}</span>
            <div className="row" style={{ gap: 6 }}>
              {RSVP.map(([val, label]) => (
                <button key={val} disabled={m.id !== me} className={`pill ${night.rsvp[m.id] === val ? 'on' : ''}`}
                  onClick={() => patch((n) => ({ ...n, rsvp: { ...n.rsvp, [me]: n.rsvp[me] === val ? null : val } }))}>{label}</button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="sec">
        <h2>Previa: ¿dónde?</h2>
        {night.previas.map((p) => (
          <div className="li" key={p.id}>
            <span className="grow">{p.place}</span>
            <button disabled={!me} className={`pill ${p.votes.includes(me) ? 'on' : ''}`}
              onClick={() => patch((n) => ({ ...n, previas: n.previas.map((x) => (x.id === p.id ? { ...x, votes: toggle(x.votes, me) } : x)) }))}>
              {p.votes.length} {p.votes.length === 1 ? 'voto' : 'votos'}
            </button>
            <button className="ib" aria-label="Quitar" onClick={() => patch((n) => ({ ...n, previas: n.previas.filter((x) => x.id !== p.id) }))}><Trash2 size={15} /></button>
          </div>
        ))}
        <form className="add" onSubmit={(e) => {
          e.preventDefault()
          if (!previa.trim()) return
          patch((n) => ({ ...n, previas: [...n.previas, { id: uid(), place: previa.trim(), votes: [] }] })); setPrevia('')
        }}>
          <input value={previa} onChange={(e) => setPrevia(e.target.value)} placeholder="Proponé un lugar (casa de…, plaza…)" />
          <button className="btn sm"><Plus size={14} /> Sumar</button>
        </form>
      </section>

      <section className="sec">
        <div className="sec-h"><h2>Dónde terminamos</h2>
          <button className="btn ghost sm" onClick={() => patch((n) => ({ ...n, closed: !n.closed }))}>
            {night.closed ? <><Unlock size={13} /> Reabrir</> : <><Lock size={13} /> Cerrar votación</>}
          </button>
        </div>
        {tally.map(({ b, n }) => (
          <div className="li" key={b.id} style={{ display: 'block' }}>
            <div className="row">
              <span className="grow">{b.name} <span className="muted small">· {b.zone}</span></span>
              <button disabled={!me || night.closed} className={`pill ${night.votes[me] === b.id ? 'on' : ''}`}
                onClick={() => patch((x) => ({ ...x, votes: { ...x.votes, [me]: x.votes[me] === b.id ? null : b.id } }))}>
                {n} {n === 1 ? 'voto' : 'votos'}
              </button>
            </div>
            <div className="bar"><i style={{ width: max ? `${(n / max) * 100}%` : 0 }} /></div>
          </div>
        ))}
        {!data.boliches.length && <p className="muted li">Cargá boliches en <Link to="/boliches" className="tag">Nuestros boliches</Link>.</p>}
        {leaders.length > 0 && (
          <div className="result">
            <Trophy />
            <div>
              <div className="muted small">{night.closed ? 'Destino final' : leaders.length > 1 ? 'Empate, por ahora' : 'Va ganando'}</div>
              <b style={{ fontSize: 20 }}>{leaders.map((t) => t.b.name).join(' / ')}</b>
              {leaders.length === 1 && Object.entries(night.votes).filter(([, v]) => v === leaders[0].b.id).length > 0 && (
                <div className="muted small">Votaron: {Object.entries(night.votes).filter(([, v]) => v === leaders[0].b.id).map(([m]) => who(data.members, m)).join(', ')}</div>
              )}
            </div>
          </div>
        )}
      </section>

      <div className="sec">
        <button className="btn ghost sm" onClick={() => { if (window.confirm('¿Borrar esta noche?')) { update('nights', (ns) => ns.filter((n) => n.id !== id)); nav('/noches') } }}>
          <Trash2 size={14} /> Borrar noche
        </button>
      </div>
      {sharing && <ShareSheet initial={nightMessage(night, data, location.origin + import.meta.env.BASE_URL)} onClose={() => setSharing(false)} />}
    </>
  )
}
