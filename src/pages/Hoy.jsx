import { useState } from 'react'
import { Trash2, MapPin, MessageCircle, RotateCcw } from 'lucide-react'
import { useStore } from '../store'
import Previa from '../components/Previa'
import ShareSheet from '../components/ShareSheet'
import LocalNote from '../components/LocalNote'
import { useConfirm } from '../components/Confirm'
import { uid, newGuest, mapLink, winners, hoyMessage } from '../utils'

// Logos de los boliches de siempre (public/boliches). Si el boliche tiene su propia foto, gana esa.
const LOGO = { b1: 'cruza-polo', b2: 'cruza-recoleta', b3: 'la-tincho-fierro', b4: 'tamarisco' }
const photo = (b) => b.photo || (LOGO[b.id] ? `${import.meta.env.BASE_URL}boliches/${LOGO[b.id]}.jpg` : '')

export default function Hoy() {
  const { data, update, me, setMe } = useStore()
  const ask = useConfirm()
  const [sharing, setSharing] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestErr, setGuestErr] = useState('')
  const [bName, setBName] = useState('')
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
  const addBoliche = (e) => {
    e.preventDefault()
    const name = bName.trim()
    if (!name) return
    update('boliches', (bs) => [...bs, { id: uid(), name, zone: '', address: '', mapUrl: '', photo: '', desc: '', comments: [] }])
    setBName('')
  }
  const removeBoliche = async (b) => {
    if (await ask(`¿Sacar ${b.name} de la lista?`, 'Sacar')) update('boliches', (bs) => bs.filter((x) => x.id !== b.id))
  }
  const reset = async () => {
    if (await ask('¿Arrancamos de cero? Se borran los votos; los lugares y boliches quedan.', 'Borrar votos'))
      patch((h) => ({ ...h, votes: {}, previas: h.previas.map((p) => ({ ...p, votes: [] })) }))
  }
  const sum = (a, f) => (a.length ? a.map(f).join(' o ') : '')
  const voters = new Set([...Object.entries(hoy.votes).filter(([, v]) => v).map(([k]) => k), ...hoy.previas.flatMap((p) => p.votes)]).size
  const fecha = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
  const prev = sum(topP, (p) => p.place), bol = sum(topB, (b) => b.name)

  return (
    <>
      <section className="ticket" aria-label="Lo que va ganando hoy">
        <div className="ticket-top"><b>Hoy</b><span>{fecha}</span></div>
        <div className="ticket-line"><small>Previa{topP.length > 1 ? ' (empate)' : ''}</small><strong className={prev ? '' : 'tbd'}>{prev || 'A definir'}</strong></div>
        <div className="ticket-line"><small>Boliche{topB.length > 1 ? ' (empate)' : ''}</small><strong className={bol ? '' : 'tbd'}>{bol || 'A definir'}</strong></div>
        <div className="ticket-stub">
          <span>{voters ? `${voters} ${voters === 1 ? 'votó' : 'votaron'}` : 'Nadie votó todavía'}</span>
          <span>Admite a todo el grupo</span>
        </div>
      </section>
      {!me && <p className="hint">Elegí quién sos arriba a la derecha y votá.</p>}

      <Previa night={hoy} patch={patch} title="¿Dónde es la previa?" />

      <section className="sec">
        <h2>¿A qué boliche?</h2>
        {data.boliches.map((b) => {
          const on = hoy.votes[me] === b.id
          return (
            <div className={`vote ${on ? 'on' : ''}`} key={b.id} style={{ '--p': max ? count(b) / max : 0 }}>
              <button className="vote-main" disabled={!me} aria-pressed={on}
                onClick={() => patch((h) => ({ ...h, votes: { ...h.votes, [me]: h.votes[me] === b.id ? null : b.id } }))}>
                {photo(b) ? <img src={photo(b)} alt="" width="52" height="52" /> : <span className="avatar" aria-hidden="true">{b.name[0]}</span>}
                <span className="grow"><b>{b.name}</b></span>
                <span className="vote-n" aria-label={`${count(b)} ${count(b) === 1 ? 'voto' : 'votos'}`}>{count(b)}</span>
              </button>
              <a className="ib" href={mapLink(b)} target="_blank" rel="noreferrer" aria-label={`Cómo llegar a ${b.name}`}><MapPin size={18} /></a>
              <button className="ib" aria-label={`Sacar ${b.name}`} onClick={() => removeBoliche(b)}><Trash2 size={16} /></button>
            </div>
          )
        })}
        <form className="add" onSubmit={addBoliche}>
          <input value={bName} onChange={(e) => setBName(e.target.value)} placeholder="¿Otro boliche? Escribí el nombre" aria-label="Nombre del boliche" />
          <button className="btn sm">Sumar</button>
        </form>
      </section>

      <section className="sec">
        <h2>¿Venís de afuera?</h2>
        <p className="muted small">Si no sos del grupo, entrá con tu nombre y votá igual.</p>
        {guests.map((g) => (
          <div className="li" key={g.id}>
            <span className="avatar" aria-hidden="true" style={{ '--av': 'var(--gold)' }}>{g.name[0]}</span>
            <span className="grow">{g.name} <span className="tag">invitado</span></span>
            <button className="ib" aria-label={`Quitar a ${g.name}`} onClick={() => removeGuest(g)}><Trash2 size={16} /></button>
          </div>
        ))}
        <form className="add" onSubmit={joinAsGuest}>
          <input value={guestName} onChange={(e) => { setGuestName(e.target.value); setGuestErr('') }} placeholder="Tu nombre" aria-label="Tu nombre" />
          <button className="btn sm">Entrar</button>
        </form>
        {guestErr && <p className="small err" role="alert" style={{ marginTop: 8 }}>{guestErr}</p>}
      </section>

      <div className="row" style={{ marginTop: 32 }}>
        <button className="btn" onClick={() => setSharing(true)}><MessageCircle size={18} /> Mandarlo al grupo</button>
        <button className="btn ghost" onClick={reset}><RotateCcw size={16} /> Votación nueva</button>
      </div>
      <div className="sec"><LocalNote /></div>
      {sharing && <ShareSheet initial={hoyMessage(hoy, data, location.origin + import.meta.env.BASE_URL)} onClose={() => setSharing(false)} />}
    </>
  )
}
