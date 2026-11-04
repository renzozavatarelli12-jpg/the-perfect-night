import { useState } from 'react'

// fields: [{ name, label, type?: text|textarea|select|date|time|url, options?: [[value,label]], required? }]
export default function FormSheet({ title, fields, initial = {}, onSave, onClose }) {
  const [v, setV] = useState(() => ({ ...Object.fromEntries(fields.filter((f) => f.type === 'select').map((f) => [f.name, f.options[0][0]])), ...initial }))
  const set = (name) => (e) => setV({ ...v, [name]: e.target.value })
  const submit = (e) => { e.preventDefault(); onSave(v); onClose() }
  return (
    <div className="overlay" onClick={onClose}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3>{title}</h3>
        {fields.map((f) => (
          <label key={f.name}>
            <span>{f.label}</span>
            {f.type === 'textarea' ? (
              <textarea rows={4} value={v[f.name] || ''} onChange={set(f.name)} required={f.required} />
            ) : f.type === 'select' ? (
              <select value={v[f.name] || ''} onChange={set(f.name)}>
                {f.options.map(([val, lab]) => <option key={val} value={val}>{lab}</option>)}
              </select>
            ) : (
              <input type={f.type || 'text'} value={v[f.name] || ''} onChange={set(f.name)} required={f.required} />
            )}
          </label>
        ))}
        <div className="row end">
          <button type="button" className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn">Guardar</button>
        </div>
      </form>
    </div>
  )
}
