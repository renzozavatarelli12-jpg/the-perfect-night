import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Dices, ArrowLeft } from 'lucide-react'
import { useStore } from '../store'
import ListSection from '../components/ListSection'

export default function Probable() {
  const { data, update } = useStore()
  const list = data.probable
  const [cur, setCur] = useState(null)
  const [used, setUsed] = useState([]) // no se repite hasta agotar todas
  const sacar = () => {
    const fresh = list.filter((q) => !used.includes(q.id))
    const pool = fresh.length ? fresh : list
    const q = pool[Math.floor(Math.random() * pool.length)]
    setCur(q); setUsed(fresh.length ? [...used, q.id] : [q.id])
  }
  return (
    <>
      <Link to="/minijuegos" className="muted small row" style={{ gap: 6 }}><ArrowLeft size={14} /> Minijuegos</Link>
      <h1 style={{ marginTop: 10 }}>¿Quién es más probable que…?</h1>
      <section className="sec" style={{ marginTop: 20 }}>
        <p className="muted small">Sale una al azar. El que sea más probable, toma. Antes de jugar, sumá las tuyas abajo.</p>
        <div className="result" style={{ display: 'block', marginTop: 14 }}>
          <div className="muted small">¿Quién es más probable que…</div>
          <b style={{ fontSize: 22 }}>{cur ? `${cur.text}?` : 'Tocá “Sacar una” para empezar'}</b>
        </div>
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn" disabled={!list.length} onClick={sacar}><Dices size={16} /> Sacar una</button>
          {cur && <span className="muted small">{used.length}/{list.length}</span>}
        </div>
      </section>
      <ListSection title="Las preguntas" addLabel="Sumar una" hint="Completá la frase: “¿Quién es más probable que…” + lo tuyo." items={list}
        onChange={(v) => update('probable', v)} fields={[{ name: 'text', label: 'Quién es más probable que…', required: true }]}
        render={(q) => q.text} />
    </>
  )
}
