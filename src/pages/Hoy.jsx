import { useState } from 'react'
import { Trash2, MapPin, MessageCircle, RotateCcw } from 'lucide-react'
import { useStore } from '../store'
import Previa from '../components/Previa'
import ShareSheet from '../components/ShareSheet'
import LocalNote from '../components/LocalNote'
import { useConfirm } from '../components/Confirm'
import { newGuest, mapLink, winners, hoyMessage } from '../utils'

// Logos de los boliches de siempre (public/boliches). Si el boliche tiene su propia foto, gana esa.
const LOGO = { b1: 'cruza-polo', b2: 'cruza-recoleta', b3: 'la-tincho-fierro', b4: 'tamarisco' }
const photo = (b) => b.photo || (LOGO[b.id] ? `${import.meta.env.BASE_URL}boliches/${LOGO[b.id]}.jpg` : '')

export default function Hoy() {
  const { data, update, me, setMe } = useStore()
  const ask = useConfirm()
  const [sharing, setSharing] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestErr, setGuestErr] = useState('')
  const hoy = data.hoy
  const patch = (fn) => update('hoy', fn)
  const count = (b) => Object.values(hoy.votes).filter((v) => v === b.id).length
  const topP = winners(hoy.previas, (p) => p.votes.length)
  const topB = winners(data.boliches, count)
  const max = Math.max(0, ...data.boliches.map(count))
  const guests = data.members.filter((m) => m.guest)

  const joinAsGuest = (e) => {
    e.preventDefault()
    const name = guestName.trim()
    if (!name) return
    const same = (m) => m.name.toLowerCase() === name.toLowerCase()
    if (data.members.some((m) => !m.guest && same(m))) return setGuestErr('Ese nombre es de alguien del grupo: elegite arriba.')
    const g = guests.find(same) || newGuest(name)
    if (!data.members.includes(g)) update('members', (ms) => [...ms, g])
    setMe(g.id); setGuestName(''); setGuestErr('')
  }
  const removeGuest = async (g) => {
    if (!(await ask(`¿Quitar a ${g.name}? Se borran también sus votos.`, 'Quitar'))) return
    if (me === g.id) setMe(null)
    update('members', (ms) => ms.filter((m) => m.id !== g.id))
    patch((h) => ({ ...h, votes: Object.fromEntries(Object.entries(h.votes).filter(([k]) => k !== g.id)), previas: h.previas.map((p) => ({ ...p, votes: p.votes.filter((v) => v !== g.id) })) }))
  }
  const reset = async () => {
    if (await ask('¿Empezar una votación nueva? Se borran los votos (quedan los lugares y boliches).', 'Empezar de cero'))
      patch((h) => ({ ...h, votes: {}, previas: h.previas.map((p) => ({ ...p, votes: [] })) }))
  }
  const sum = (a, f) => (a.length ? a.map(f).join(' / ') + (a.length > 1 ? ' (empate)' : '') : 'A votar')

  return (
    <>
      <h1>Hoy</h1>
      <p className="lead">Lo que tenemos decidido, en vivo.</p>
      <div className="result" style={{ display: 'block' }}>
        <div className="muted small">Previa</div>
        <b style={{ fontSize: 22 }}>{sum(topP, (p) => p.place)}</b>
        <div className="muted small" style={{ marginTop: 10 }}>Boliche</div>
        <b style={{ fontSize: 22 }}>{sum(topB, (b) => b.name)}</b>
      </div>

      <Previa night={hoy} patch={patch} title="Votá la previa" />

      <section className="sec">
        <h2>Votá el boliche</h2>
        {data.boliches.map((b) => (
          <div className="li" key={b.id} style={{ display: 'block' }}>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              {photo(b) && <img src={photo(b)} alt="" width="44" height="44" style={{ borderRadius: 10, objectFit: 'cover' }} />}
              <span className="grow"><b>{b.name}</b>
                <a className="muted small row" style={{ gap: 4 }} href={mapLink(b)} target="_blank" rel="noreferrer"><MapPin size={12} /> {b.zone || 'Mapa'}</a>
              </span>
              <button disabled={!me} className={`pill ${hoy.votes[me] === b.id ? 'on' : ''}`}
                onClick={() => patch((h) => ({ ...h, votes: { ...h.votes, [me]: h.votes[me] === b.id ? null : b.id } }))}>
                {count(b)} {count(b) === 1 ? 'voto' : 'votos'}
              </button>
            </div>
            <div className="bar"><i style={{ width: max ? `${(count(b) / max) * 100}%` : 0 }} /></div>
          </div>
        ))}
        {!me && <p className="muted small" style={{ marginTop: 10 }}>Elegí quién sos arriba para votar.</p>}
      </section>

      <section className="sec">
        <h2>¿Venís de afuera?</h2>
        {guests.map((g) => (
          <div className="li" key={g.id}>
            <span className="grow">{g.name} <span className="tag">invitado</span></span>
            <button className="ib" aria-label="Quitar invitado" onClick={() => removeGuest(g)}><Trash2 size={15} /></button>
          </div>
        ))}
        <form className="add" onSubmit={joinAsGuest}>
          <input value={guestName} onChange={(e) => { setGuestName(e.target.value); setGuestErr('') }} placeholder="Poné tu nombre para votar" />
          <button className="btn sm">Entrar</button>
        </form>
        {guestErr && <p className="small err" role="alert" style={{ marginTop: 8 }}>{guestErr}</p>}
      </section>

      <div className="row" style={{ marginTop: 28 }}>
        <button className="btn" onClick={() => setSharing(true)}><MessageCircle size={16} /> Compartir por WhatsApp</button>
        <button className="btn ghost" onClick={reset}><RotateCcw size={16} /> Votación nueva</button>
      </div>
      <div className="sec"><LocalNote /></div>
      {sharing && <ShareSheet initial={hoyMessage(hoy, data, location.origin + import.meta.env.BASE_URL)} onClose={() => setSharing(false)} />}
    </>
  )
}
