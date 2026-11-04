import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useStore } from '../store'
import { uid } from '../utils'

const toggle = (arr, x) => (arr.includes(x) ? arr.filter((y) => y !== x) : [...arr, x])

// Votación de dónde es la previa. `patch(fn)` actualiza la noche.
export default function Previa({ night, patch, title = 'Previa: ¿dónde?' }) {
  const { me } = useStore()
  const [place, setPlace] = useState('')
  return (
    <section className="sec">
      <h2>{title}</h2>
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
      {!me && <p className="muted small" style={{ marginTop: 10 }}>Elegí quién sos arriba para votar.</p>}
      <form className="add" onSubmit={(e) => {
        e.preventDefault()
        if (!place.trim()) return
        patch((n) => ({ ...n, previas: [...n.previas, { id: uid(), place: place.trim(), votes: [] }] })); setPlace('')
      }}>
        <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Proponé un lugar (casa de…, plaza…)" />
        <button className="btn sm"><Plus size={14} /> Sumar</button>
      </form>
    </section>
  )
}
