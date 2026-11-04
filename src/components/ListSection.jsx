import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import FormSheet from './FormSheet'
import { uid } from '../utils'

// Lista editable genérica: agregar / editar / borrar. `render(item)` dibuja el contenido.
export default function ListSection({ title, hint, items, fields, onChange, render, addLabel = 'Agregar', canAdd = true, canDelete = true, className = '' }) {
  const [sheet, setSheet] = useState(null)
  const open = (item) =>
    setSheet({
      title: item ? 'Editar' : addLabel,
      initial: item || {},
      onSave: (v) => onChange(item ? items.map((i) => (i.id === item.id ? { ...i, ...v } : i)) : [...items, { ...v, id: uid() }]),
    })
  return (
    <section className="sec">
      <div className="sec-h">
        <h2>{title}</h2>
        {canAdd && <button className="btn ghost sm" onClick={() => open()}><Plus size={14} /> {addLabel}</button>}
      </div>
      {hint && <p className="muted small">{hint}</p>}
      <div className={className}>
        {items.map((item) => (
          <div className="li" key={item.id}>
            <div className="grow">{render(item)}</div>
            <button className="ib" aria-label="Editar" onClick={() => open(item)}><Pencil size={16} /></button>
            {canDelete && (
              <button className="ib" aria-label="Borrar" onClick={() => window.confirm('¿Borrar?') && onChange(items.filter((i) => i.id !== item.id))}>
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
        {!items.length && <p className="muted li">Nada por acá todavía.</p>}
      </div>
      {sheet && <FormSheet {...sheet} fields={fields} onClose={() => setSheet(null)} />}
    </section>
  )
}
