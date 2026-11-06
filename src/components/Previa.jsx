import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useStore } from '../store'
import { uid } from '../utils'

const toggle = (arr, x) => (arr.includes(x) ? arr.filter((y) => y !== x) : [...arr, x])

// Votación de dónde es la previa. `patch(fn)` actualiza la noche.
export default function Previa({ night, patch, title = 'Previa: ¿dónde?' }) {
  const { me } = useStore()
  const [place, setPlace] = useState('')
  const max = Math.max(0, ...night.previas.map((p) => p.votes.length))
  return (
    <section className="sec">
      <h2>{title}</h2>
      {night.previas.map((p) => {
        const on = p.votes.includes(me)
        return (
          <div className={`vote ${on ? 'on' : ''}`} key={p.id} style={{ '--p': max ? p.votes.length / max : 0 }}>
            <button className="vote-main" disabled={!me} aria-pressed={on}
              onClick={() => patch((n) => ({ ...n, previas: n.previas.map((x) => (x.id === p.id ? { ...x, votes: toggle(x.votes, me) } : x)) }))}>
              <span className="grow"><b>{p.place}</b></span>
              <span className="vote-n" aria-label={`${p.votes.length} ${p.votes.length === 1 ? 'voto' : 'votos'}`}>{p.votes.length}</span>
            </button>
            <button className="ib" aria-label={`Quitar ${p.place}`} onClick={() => patch((n) => ({ ...n, previas: n.previas.filter((x) => x.id !== p.id) }))}><Trash2 size={16} /></button>
          </div>
        )
      })}
      {!night.previas.length && <p className="empty">Nadie ofreció casa todavía. ¿La tuya?</p>}
      <form className="add" onSubmit={(e) => {
        e.preventDefault()
        if (!place.trim()) return
        patch((n) => ({ ...n, previas: [...n.previas, { id: uid(), place: place.trim(), votes: [] }] })); setPlace('')
      }}>
        <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Lo de alguien, una plaza…" aria-label="Lugar para la previa" />
        <button className="btn sm"><Plus size={16} /> Sumar</button>
      </form>
    </section>
  )
}
