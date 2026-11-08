// Ficha de un boliche: datos (los edita cualquiera del grupo, como siempre), fotos y comentarios del grupo (servidor).
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Ticket, MapPin, Pencil, Trash2, Camera } from 'lucide-react'
import { useStore } from '../store'
import { useLive } from '../live'
import { who, mapLink } from '../utils'
import { photo, tickets, feats, shrink } from '../boliches'
import FormSheet from './FormSheet'
import { useConfirm } from './Confirm'

const FIELDS = [
  { name: 'name', label: 'Nombre', required: true, max: 60 },
  { name: 'zone', label: 'Zona / barrio', max: 60 },
  { name: 'address', label: 'Dirección', max: 120 },
  { name: 'tickets', label: 'Link oficial para sacar entrada', type: 'url', max: 300 },
  { name: 'mapUrl', label: 'Link de Google Maps (opcional: si no, se busca por la dirección)', type: 'url', max: 300 },
  { name: 'desc', label: 'Descripción', type: 'textarea', max: 600 },
  { name: 'feats', label: 'Características (separadas por coma: terraza, cachengue, +21…)', max: 200 },
  { name: 'info', label: 'Para organizar la salida (horarios, lista, precio, dress code…)', type: 'textarea', max: 600 },
]
const fecha = (iso) => new Date(iso).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function BolicheSheet({ id, onClose }) {
  return createPortal(<Ficha id={id} onClose={onClose} />, document.body)
}

function Ficha({ id, onClose }) {
  const { data, update, group } = useStore()
  const b = data.boliches.find((x) => x.id === id)
  const L = useLive('tpn_boliche_view', { p_group: group?.id, p_boliche: id }, !!group && group.role !== 'legacy')
  const ask = useConfirm()
  const [edit, setEdit] = useState(false)
  const [t, setT] = useState('')
  const [big, setBig] = useState(null)
  const [up, setUp] = useState('')
  const name = (m) => who(data.members, m)
  if (!b) return null
  const v = L.v, mine = v?.me, admin = v?.role === 'admin'
  const cover = v?.photos[0]?.src || photo(b)
  const tk = tickets(b)
  const addPhoto = async (e) => {
    const f = e.target.files[0]; e.target.value = ''
    if (!f) return
    setUp('Achicando la foto…')
    let src
    try { src = await shrink(f) } catch { setUp(''); return L.setErr('No pude leer esa foto o es demasiado grande. Probá con otra.') }
    setUp('Subiendo…')
    await L.act('tpn_bphoto_add', { p_group: group.id, p_boliche: id, p_data: src })
    setUp('')
  }
  const send = async (e) => { e.preventDefault(); const body = t.trim(); if (body && (await L.act('tpn_bcomment_add', { p_group: group.id, p_boliche: id, p_body: body }))) setT('') }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet bol" role="dialog" aria-label={`Ficha de ${b.name}`} onClick={(e) => e.stopPropagation()}>
        <div className="bol-cover">
          {cover ? <img src={cover} alt="" /> : <span className="bol-ph" aria-hidden="true">{b.name[0]}</span>}
          <button className="ib bol-x" aria-label="Cerrar" onClick={onClose}><X size={20} /></button>
        </div>
        <div>
          <h3>{b.name}</h3>
          {(b.zone || b.address) && <p className="muted small" style={{ marginTop: 6 }}>{[b.zone, b.address].filter(Boolean).join(' · ')}</p>}
        </div>
        <div className="row">
          {tk && <a className="btn sm" href={tk} target="_blank" rel="noreferrer"><Ticket size={16} /> Sacar entrada</a>}
          <a className="btn ghost sm" href={mapLink(b)} target="_blank" rel="noreferrer"><MapPin size={16} /> Cómo llegar</a>
          <button className="btn ghost sm" onClick={() => setEdit(true)}><Pencil size={14} /> Editar</button>
        </div>
        {b.desc && <p className="bol-desc">{b.desc}</p>}
        {feats(b).length > 0 && <div className="pills">{feats(b).map((f) => <span className="tag" key={f}>{f}</span>)}</div>}
        {b.info && <div className="bol-info"><span className="muted small">Para organizar la salida</span><p>{b.info}</p></div>}
        {!b.desc && !b.info && !feats(b).length && <p className="empty">Todavía no tiene descripción. Tocá Editar y contá cómo es.</p>}

        {L.err && <p className="small err" role="alert">{L.err}</p>}
        {group?.role === 'legacy' ? <p className="note">Para ver fotos y comentarios, primero elegí quién sos.</p> : <>
          <h4>Fotos</h4>
          {!v ? <p className="small muted">Cargando…</p> : (
            <div className="bol-ph-grid">
              {v.photos.map((p) => (
                <div className="bol-th" key={p.id}>
                  <button onClick={() => setBig(p.src)} aria-label="Ver foto grande"><img src={p.src} alt={`Foto de ${b.name} (subió ${name(p.m)})`} loading="lazy" /></button>
                  {(p.m === mine || admin) && <button className="ib" aria-label="Borrar foto" disabled={L.busy}
                    onClick={async () => (await ask('¿Borrar esta foto?', 'Borrar')) && L.act('tpn_bphoto_delete', { p_photo: p.id })}><Trash2 size={14} /></button>}
                </div>
              ))}
              {v.photos.length < 6 && <label className={`bol-add ${up ? 'on' : ''}`}><Camera size={20} /><span className="small">{up || 'Sumar foto'}</span>
                <input type="file" accept="image/*" hidden disabled={!!up} onChange={addPhoto} /></label>}
            </div>
          )}
          {v && <p className="small muted">Hasta 6 fotos por boliche. Se achican solas antes de subir.</p>}

          <h4>Lo que dice el grupo</h4>
          <form className="add" onSubmit={send}>
            <input value={t} onChange={(e) => setT(e.target.value)} placeholder="¿Qué tal la música, la fila, la entrada?" aria-label="Comentario" maxLength={500} />
            <button className="btn sm" disabled={L.busy || !t.trim()}>Publicar</button>
          </form>
          {v && !v.comments.length && <p className="empty">Nadie comentó todavía.</p>}
          {v?.comments.slice().reverse().map((c) => (
            <div className="cm" key={c.id}>
              <span className="small"><b>{name(c.m)}</b> <span className="muted">{fecha(c.at)}</span></span>
              <p>{c.body}</p>
              {(c.m === mine || admin) && <button className="ib" aria-label="Borrar comentario" disabled={L.busy}
                onClick={async () => (await ask('¿Borrar este comentario?', 'Borrar')) && L.act('tpn_bcomment_delete', { p_comment: c.id })}><Trash2 size={14} /></button>}
            </div>
          ))}
        </>}
      </div>
      {edit && <div onClick={(e) => e.stopPropagation()}><FormSheet title={`Editar ${b.name}`} fields={FIELDS} initial={b} onClose={() => setEdit(false)}
        onSave={(x) => update('boliches', (bs) => bs.map((y) => (y.id === id ? { ...y, ...Object.fromEntries(FIELDS.map((f) => [f.name, (x[f.name] || '').trim()])), name: x.name.trim() || y.name } : y)))} /></div>}
      {big && <div className="overlay bol-big" onClick={(e) => { e.stopPropagation(); setBig(null) }}><img src={big} alt="" /></div>}
    </div>
  )
}
