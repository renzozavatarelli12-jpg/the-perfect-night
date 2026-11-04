import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, MapPin, Moon, Vote } from 'lucide-react'
import { useStore } from '../store'
import FormSheet from '../components/FormSheet'
import { useConfirm } from '../components/Confirm'
import { uid, today, who, mapLink } from '../utils'

const fields = [
  { name: 'name', label: 'Nombre', required: true },
  { name: 'zone', label: 'Zona' },
  { name: 'address', label: 'Dirección' },
  { name: 'mapUrl', label: 'Link de Google Maps (opcional)', type: 'url' },
  { name: 'photo', label: 'URL de una foto (opcional)', type: 'url' },
  { name: 'desc', label: 'Descripción', type: 'textarea' },
]

export default function Boliches() {
  const { data, update, me } = useStore()
  const [sheet, setSheet] = useState(null)
  const ask = useConfirm()
  const [draft, setDraft] = useState({})
  const next = data.nights.filter((n) => n.date >= today()).sort((a, b) => a.date.localeCompare(b.date))[0]
  const save = (item) => (v) =>
    update('boliches', (bs) => (item ? bs.map((b) => (b.id === item.id ? { ...b, ...v } : b)) : [...bs, { ...v, id: uid(), comments: [] }]))
  const comment = (b) => (e) => {
    e.preventDefault()
    const text = (draft[b.id] || '').trim()
    if (!text) return
    update('boliches', (bs) => bs.map((x) => (x.id === b.id ? { ...x, comments: [...x.comments, { id: uid(), by: me, text }] } : x)))
    setDraft({ ...draft, [b.id]: '' })
  }

  return (
    <>
      <div className="sec-h">
        <h1>Nuestros boliches</h1>
        <button className="btn sm" onClick={() => setSheet({ title: 'Nuevo boliche', onSave: save() })}><Plus size={14} /> Agregar</button>
      </div>
      <p className="lead">Los de siempre, con sus comentarios internos.</p>
      {next && (
        <Link to={`/noches/${next.id}`} className="tag row" style={{ marginTop: 14, width: 'fit-content', gap: 6 }}>
          <Vote size={13} /> Votar destino para “{next.title}”
        </Link>
      )}

      <div className="grid">
        {data.boliches.map((b) => (
          <article className="card" key={b.id}>
            <div className="ph">{b.photo ? <img src={b.photo} alt={b.name} loading="lazy" /> : <Moon size={32} />}</div>
            <div className="body">
              <div className="row">
                <h3 className="grow">{b.name}</h3>
                <button className="ib" aria-label="Editar" onClick={() => setSheet({ title: 'Editar boliche', initial: b, onSave: save(b) })}><Pencil size={15} /></button>
                <button className="ib" aria-label="Borrar" onClick={async () => (await ask(`¿Borrar ${b.name}?`, 'Borrar')) && update('boliches', (bs) => bs.filter((x) => x.id !== b.id))}><Trash2 size={15} /></button>
              </div>
              <a className="muted small row" style={{ gap: 6 }} href={mapLink(b)} target="_blank" rel="noreferrer">
                <MapPin size={14} /> {b.address || b.zone || 'Ver en el mapa'}
              </a>
              {b.desc && <p>{b.desc}</p>}
              {b.comments.map((c) => <p key={c.id} className="comment"><b>{who(data.members, c.by)}:</b> {c.text}</p>)}
              <form className="add" style={{ marginTop: 0 }} onSubmit={comment(b)}>
                <input disabled={!me} value={draft[b.id] || ''} onChange={(e) => setDraft({ ...draft, [b.id]: e.target.value })}
                  placeholder={me ? 'Comentario interno…' : 'Elegí quién sos arriba para comentar'} />
              </form>
            </div>
          </article>
        ))}
      </div>
      {sheet && <FormSheet fields={fields} {...sheet} onClose={() => setSheet(null)} />}
    </>
  )
}
