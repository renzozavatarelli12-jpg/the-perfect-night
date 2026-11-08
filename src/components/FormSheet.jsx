import { useState } from 'react'

// Foto elegida -> cuadrado de 128px en JPEG chico (cabe en la fila del integrante, ~5-8 KB).
async function chica(file) {
  const img = await createImageBitmap(file)
  const c = document.createElement('canvas'); c.width = c.height = 128
  const s = Math.min(img.width, img.height)
  c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 128, 128)
  let out = c.toDataURL('image/jpeg', 0.7)
  if (out.length > 12000) out = c.toDataURL('image/jpeg', 0.45)
  return out
}

// fields: [{ name, label, type?: text|textarea|select|date|time|url|photo, options?: [[value,label]], required? }]
export default function FormSheet({ title, fields, initial = {}, onSave, onClose }) {
  const [v, setV] = useState(() => ({ ...Object.fromEntries(fields.filter((f) => f.type === 'select').map((f) => [f.name, f.options[0][0]])), ...initial }))
  const set = (name) => (e) => setV({ ...v, [name]: e.target.value })
  const [perr, setPerr] = useState('')
  const pick = (name) => async (e) => {
    const f = e.target.files[0]; e.target.value = ''
    if (!f) return
    try { const src = await chica(f); setV((x) => ({ ...x, [name]: src })); setPerr('') } catch { setPerr('No pude leer esa foto. Probá con otra.') }
  }
  const [bz, setBz] = useState(false), [serr, setSerr] = useState('')
  // Si el guardado devuelve false (sin conexión, error del servidor) la hoja queda abierta con lo escrito.
  const submit = async (e) => {
    e.preventDefault(); if (bz) return
    setBz(true); const r = await onSave(v); setBz(false); setSerr('')
    if (r === false) setSerr('No se pudo guardar. Revisá la conexión y probá de nuevo.'); else onClose()
  }
  return (
    <div className="overlay" onClick={onClose}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3>{title}</h3>
        {fields.map((f) => f.type === 'photo' ? (
          <div key={f.name}>
            <span className="small muted">{f.label}</span>
            <div className="row" style={{ marginTop: 6 }}>
              {v[f.name] ? <img className="avatar" src={v[f.name]} alt="" /> : <span className="avatar" aria-hidden="true">{(v.name || '?')[0]}</span>}
              <label className="btn ghost sm" style={{ cursor: 'pointer' }}>{v[f.name] ? 'Cambiar foto' : 'Elegir foto'}<input type="file" accept="image/*" hidden onChange={pick(f.name)} /></label>
              {v[f.name] && <button type="button" className="btn ghost sm" onClick={() => setV({ ...v, [f.name]: '' })}>Sacar</button>}
            </div>
            {perr && <p className="small err" role="alert">{perr}</p>}
          </div>
        ) : (
          <label key={f.name}>
            <span>{f.label}</span>
            {f.type === 'textarea' ? (
              <textarea rows={4} value={v[f.name] || ''} onChange={set(f.name)} required={f.required} maxLength={f.max} />
            ) : f.type === 'select' ? (
              <select value={v[f.name] || ''} onChange={set(f.name)}>
                {f.options.map(([val, lab]) => <option key={val} value={val}>{lab}</option>)}
              </select>
            ) : (
              <input type={f.type || 'text'} value={v[f.name] || ''} onChange={set(f.name)} required={f.required} maxLength={f.max} />
            )}
          </label>
        ))}
        {serr && <p className="small err" role="alert">{serr}</p>}
        <div className="row end">
          <button type="button" className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn" disabled={bz}>Guardar</button>
        </div>
      </form>
    </div>
  )
}
