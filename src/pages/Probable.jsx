import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import './quien.css'
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
      <div className="qq">
        <div className="qq-top">
          <Link to="/minijuegos"><ArrowLeft size={14} /> Minijuegos</Link>
          {cur && <span className="small">{used.length} de {list.length}</span>}
        </div>
        <div className="qq-stage">
          <div className="qq-emoji">🍻</div>
          <h1 className="qq-title" style={{ fontSize: 'clamp(34px, 10vw, 64px)' }}>¿Quién es más probable que…?</h1>
          {cur ? (
            <div className="qq-card q qq-flipin" key={cur.id}>
              <div className="qq-sub">¿Quién es más probable que…</div>
              <div className="qq-name" style={{ fontSize: 'clamp(26px, 7vw, 40px)', color: '#fff' }}>{cur.text}?</div>
              <div className="qq-sub">A la cuenta de tres, todos señalan. El más señalado toma 🍻</div>
            </div>
          ) : <p className="qq-sub">Sale una al azar, todos señalan y el más probable toma. Podés sumar las tuyas abajo.</p>}
          <button className="qq-btn coral" disabled={!list.length} onClick={sacar}>{cur ? 'Otra' : 'Sacar una'}</button>
        </div>
      </div>
      <ListSection title="Las preguntas" addLabel="Sumar una" hint="Completá la frase: “¿Quién es más probable que…” + lo tuyo." items={list}
        onChange={(v) => update('probable', v)} fields={[{ name: 'text', label: 'Quién es más probable que…', required: true }]}
        render={(q) => q.text} />
    </>
  )
}
