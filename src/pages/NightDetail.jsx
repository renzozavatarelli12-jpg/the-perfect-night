import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { MessageCircle, Trash2, Plus, Trophy, MapPin, Clock, Lock, Unlock } from 'lucide-react'
import { useStore } from '../store'
import { fmtDate, uid, who, nightMessage, newGuest } from '../utils'
import ShareSheet from '../components/ShareSheet'

const RSVP = [['yes', 'Voy'], ['maybe', 'Capaz'], ['no', 'No voy']]

export default function NightDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data, update, me, setMe } = useStore()
  const [sharing, setSharing] = useState(false)
  const [previa, setPrevia] = useState('')
  const [guestName, setGuestName] = useState('')
  const [guestErr, setGuestErr] = useState('')
  const night = data.nights.find((n) => n.id === id)

  if (!night) return <p>Esa noche no existe (o la borraron). <Link to="/noches" className="tag">Volver</Link></p>

  const here = data.members.filter((m) => !m.guest || m.nightId === id)
  const joinAsGuest = (e) => {
    e.preventDefault()
    const name = guestName.trim()
    if (!name) return
    const same = (m) => m.name.toLowerCase() === name.toLowerCase()
    if (data.members.some((m) => !m.guest && same(m))) return setGuestErr('Ese nombre es de alguien del grupo: elegite arriba.')
    const g = here.find((m) => m.guest && same(m)) || newGuest(name, id)
    if (!data.members.includes(g)) update('members', (ms) => [...ms, g])
    setMe(g.id); setGuestName(''); setGuestErr('')
  }
  const removeGuest = (g) => {
    if (!window.confirm(`¿Quitar a ${g.name}? Sus votos y confirmación de esta noche se mantienen.`)) return
    if (me === g.id) setMe(null)
    update('members', (ms) => ms.filter((m) => m.id !== g.id))
    update('drinkVotes', (v) => Object.fromEntries(Object.entries(v).filter(([k]) => k !== g.id)))
  }
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
            {here.map((m) => <button key={m.id} className="pill" onClick={() => setMe(m.id)}>{m.name}{m.guest ? ' (invitado)' : ''}</button>)}
          </div>
        </section>
      )}

      <section className="sec">
        <div className="sec-h"><h2>Asistencia</h2><span className="tag">{going} confirmados</span></div>
        {here.map((m) => (
          <div className="li" key={m.id}>
            <span className="grow">{m.name}{m.guest && <span className="tag" style={{ marginLeft: 8 }}>invitado</span>}{m.id === me && <span className="muted"> (vos)</span>}</span>
            <div className="row" style={{ gap: 6 }}>
              {RSVP.map(([val, label]) => (
                <button key={val} disabled={m.id !== me} className={`pill ${night.rsvp[m.id] === val ? 'on' : ''}`}
                  onClick={() => patch((n) => ({ ...n, rsvp: { ...n.rsvp, [me]: n.rsvp[me] === val ? null : val } }))}>{label}</button>
              ))}
            </div>
            {m.guest && <button className="ib" aria-label="Quitar invitado" onClick={() => removeGuest(m)}><Trash2 size={15} /></button>}
          </div>
        ))}
        <form className="add" onSubmit={joinAsGuest}>
          <input value={guestName} onChange={(e) => { setGuestName(e.target.value); setGuestErr('') }} placeholder="¿Sos invitado? Poné tu nombre" />
          <button className="btn sm">Entrar como invitado</button>
        </form>
        {guestErr && <p className="small err" role="alert" style={{ marginTop: 8 }}>{guestErr}</p>}
        <p className="muted small" style={{ marginTop: 8 }}>Los invitados votan solo en esta noche y se quitan después con el tacho.</p>
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
