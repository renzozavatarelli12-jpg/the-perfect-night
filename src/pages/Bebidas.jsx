import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useStore } from '../store'
import ListSection from '../components/ListSection'
import LocalNote from '../components/LocalNote'
import { uid } from '../utils'

const MAX = 3

export default function Bebidas() {
  const { data, update, me } = useStore()
  const [nuevo, setNuevo] = useState('')
  const ids = new Set(data.favDrinks.map((d) => d.id))
  const valid = (list = []) => list.filter((id) => ids.has(id))
  const mine = valid(data.drinkVotes[me])

  const toggle = (id) => update('drinkVotes', (v) => {
    const cur = valid(v[me])
    return { ...v, [me]: cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < MAX ? [...cur, id] : cur }
  })
  const add = (e) => {
    e.preventDefault()
    const name = nuevo.trim()
    if (name && !data.favDrinks.some((d) => d.name.toLowerCase() === name.toLowerCase()))
      update('favDrinks', (l) => [...l, { id: uid(), name, note: '' }])
    setNuevo('')
  }
  // al borrar un trago también se limpian sus votos
  const setDrinks = (list) => {
    update('favDrinks', list)
    update('drinkVotes', (v) => Object.fromEntries(Object.entries(v).map(([k, a]) => [k, a.filter((id) => list.some((d) => d.id === id))])))
  }

  const rank = data.favDrinks
    .map((d) => ({ d, by: data.members.filter((m) => (data.drinkVotes[m.id] || []).includes(d.id)) }))
    .filter((r) => r.by.length)
    .sort((a, b) => b.by.length - a.by.length || a.d.name.localeCompare(b.d.name))
  const top = rank[0]?.by.length || 0

  return (
    <>
      <h1>Bebidas</h1>
      <p className="lead">Lo que se toma, quién lo toma y lo que se inventa a las 2am.</p>

      <section className="sec">
        <div className="sec-h"><h2>Top de tragos</h2></div>
        {rank.map(({ d, by }, i) => (
          <div className="li" key={d.id} style={{ display: 'block' }}>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <span className="stat" style={{ fontSize: 22, minWidth: 28 }}>{i + 1}</span>
              <span className="grow"><b>{d.name}</b><div className="muted small">{by.map((m) => m.name).join(', ')}</div></span>
              <span className="tag">{by.length} {by.length === 1 ? 'voto' : 'votos'}</span>
            </div>
            <div className="bar"><i style={{ width: `${(by.length / top) * 100}%` }} /></div>
          </div>
        ))}
        {!rank.length && <p className="muted li">Nadie votó todavía. Sé el primero.</p>}
      </section>

      <section className="sec">
        <div className="sec-h"><h2>Tus {MAX} favoritos</h2>{me && <span className="tag">{mine.length}/{MAX}</span>}</div>
        <p className="muted small">{me ? `Elegí hasta ${MAX}. Tocá de nuevo uno elegido para sacarlo.` : 'Elegí quién sos arriba para votar.'}</p>
        <div className="row" style={{ marginTop: 12 }}>
          {data.favDrinks.map((d) => (
            <button key={d.id} className={`pill ${mine.includes(d.id) ? 'on' : ''}`} aria-pressed={mine.includes(d.id)}
              disabled={!me || (!mine.includes(d.id) && mine.length >= MAX)} onClick={() => toggle(d.id)}>{d.name}</button>
          ))}
        </div>
        <form className="add" onSubmit={add}>
          <input value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="¿Falta alguno? Sumalo acá" />
          <button className="btn sm"><Plus size={14} /> Sumar</button>
        </form>
        <div style={{ marginTop: 14 }}><LocalNote /></div>
      </section>

      <ListSection title="Todas las opciones" items={data.favDrinks} onChange={setDrinks} canAdd={false}
        hint="Editá el comentario o borrá tragos que sobren."
        fields={[{ name: 'name', label: 'Bebida', required: true }, { name: 'note', label: 'Comentario' }]}
        render={(d) => <><b>{d.name}</b><div className="muted small">{d.note}</div></>} />

      <ListSection title="Qué toma cada uno" items={data.members} onChange={(v) => update('members', v)}
        canAdd={false} canDelete={false} hint="Los integrantes se agregan en Grupo."
        fields={[{ name: 'drink', label: 'Lo que suele tomar' }]}
        render={(m) => <div className="row"><b className="grow">{m.name}</b><span className="muted">{m.drink || '—'}</span></div>} />

      <ListSection title="Cócteles y combinaciones" addLabel="Nueva combinación" items={data.cocktails} onChange={(v) => update('cocktails', v)}
        fields={[{ name: 'name', label: 'Nombre', required: true }, { name: 'recipe', label: 'Receta / cómo se hace', type: 'textarea' }]}
        render={(c) => <><b>{c.name}</b><div className="muted small" style={{ whiteSpace: 'pre-line' }}>{c.recipe}</div></>} />
    </>
  )
}
