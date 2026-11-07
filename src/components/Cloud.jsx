import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useStore, localData } from '../store'
import { seed } from '../data/seed'
import { downloadBackup } from '../utils'

// Punto en el header: verde = al día, coral = cambios sin subir, gris = sin conexión.
export function SyncDot() {
  const { sync: s } = useStore()
  const [cls, label] = !s.online ? ['off', 'Sin conexión'] : s.pending ? ['wait', 'Guardando cambios…'] : ['ok', 'Todo al día con el grupo']
  return <span className={`sync-dot ${cls}`} role="status" aria-label={label} title={label} />
}

// Línea debajo del header, solo cuando hay algo que decir.
export function SyncBar() {
  const { sync: s, eng } = useStore()
  let text = null
  if (!s.loaded) text = s.online ? 'Cargando lo del grupo…' : 'Sin conexión. Cuando vuelva internet, se carga lo del grupo.'
  else if (!s.online) text = s.pending ? `Sin conexión. ${s.pending === 1 ? '1 cambio espera' : `${s.pending} cambios esperan`} para subirse (todavía no los ven los demás).` : 'Sin conexión: estás viendo lo último que bajó.'
  if (!text && !s.notice) return null
  return (
    <div className={`sync-bar ${s.notice && !text ? 'note' : ''}`} role="status">
      <span className="grow">{text || s.notice}</span>
      {!text && <button className="ib" aria-label="Cerrar aviso" onClick={eng.clearNotice}><X size={16} /></button>}
    </div>
  )
}

const DONE = 'tpn-v2-migrated'
// Datos que este celu tenía de antes: ofrecer subirlos al grupo (sin pisar) una vez que bajó lo del grupo.
export function Migrate() {
  const { sync: s, eng, data, me } = useStore()
  const [hide, setHide] = useState(() => !!localStorage.getItem(DONE))
  const [saved, setSaved] = useState(false)
  if (hide || !s.loaded || !s.online || s.pending) return null
  const local = localData()
  const { add, clash } = eng.offer(local, seed())
  if (!add.size) { localStorage.setItem(DONE, '1'); return null }
  const empty = !data.members.length && !data.boliches.length
  const subir = () => { eng.importRows(add); localStorage.setItem(DONE, '1'); setHide(true) }
  return createPortal(
    <div className="overlay">
      <div className="sheet" role="dialog" aria-label="Datos de este celu">
        <h3>{empty ? 'El grupo está vacío' : 'Este celu tiene cosas de antes'}</h3>
        <p className="muted">{empty
          ? 'Subimos lo que tenés en este celu (integrantes, boliches, preguntas, estadísticas…) como punto de partida para todos.'
          : `Hay ${add.size} ${add.size === 1 ? 'cosa' : 'cosas'} que el grupo no tiene. Se suman sin borrar nada de lo que ya cargaron los demás.`}
          {clash > 0 && ` ${clash} ${clash === 1 ? 'cosa ya existe distinta' : 'cosas ya existen distintas'} en el grupo: queda la del grupo.`}
        </p>
        <p className="small muted">Lo de este celu no se borra. Por las dudas, bajate una copia antes.</p>
        <button className="btn ghost" onClick={() => { downloadBackup(local, me); setSaved(true) }}>{saved ? 'Copia descargada ✓' : 'Descargar copia'}</button>
        <button className="btn" onClick={subir}>Subir al grupo</button>
        <button className="btn ghost" onClick={() => setHide(true)}>Ahora no</button>
      </div>
    </div>,
    document.body,
  )
}
