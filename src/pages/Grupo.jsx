import { useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { useStore } from '../store'
import LocalNote from '../components/LocalNote'
import { useConfirm } from '../components/Confirm'
import ListSection from '../components/ListSection'
import { GroupHead, Admin } from '../components/Admin'
import { downloadBackup, parseBackup } from '../utils'

function Backup() {
  const { data, me, replaceAll, online } = useStore()
  const file = useRef()
  const ask = useConfirm()
  const [msg, setMsg] = useState(null)
  const exportar = () => {
    downloadBackup(data, me)
    setMsg({ ok: true, text: 'Copia descargada. Guardala bien (por ejemplo, mandátela por WhatsApp).' })
  }
  const importar = async (e) => {
    const f = e.target.files[0]; e.target.value = ''
    if (!f) return
    let r
    try { r = f.size > 5e6 ? { error: 'El archivo es demasiado grande.' } : parseBackup(await f.text()) } catch { r = { error: 'No se pudo leer el archivo.' } }
    if (r.error) return setMsg({ ok: false, text: `${r.error} No se cambió nada.` })
    const c = (k) => r.data[k].length
    if (online) { // con la nube no se reemplaza nada: se suma lo que el grupo no tiene
      if (!(await ask('Se suma al grupo lo de la copia que el grupo no tenga. No se borra ni se pisa nada. ¿Seguimos?', 'Sumar'))) return setMsg({ ok: false, text: 'Cancelado. No se cambió nada.' })
      const { added, clash } = replaceAll(r.data, r.me)
      return setMsg({ ok: true, text: `${added === 0 ? 'No había nada nuevo para sumar' : added === 1 ? 'Se sumó 1 cosa' : `Se sumaron ${added} cosas`}.${clash ? ` ${clash === 1 ? '1 ya estaba distinta en el grupo: quedó la del grupo.' : `${clash} ya estaban distintas en el grupo: quedaron las del grupo.`}` : ''}` })
    }
    if (!(await ask(`Esto REEMPLAZA todo lo que tenés ahora por la copia (${c('boliches')} boliches, ${c('members')} integrantes). Tip: exportá una copia de lo actual antes. ¿Reemplazar?`, 'Reemplazar')))
      return setMsg({ ok: false, text: 'Importación cancelada. No se cambió nada.' })
    replaceAll(r.data, r.me)
    setMsg({ ok: true, text: 'Copia importada.' })
  }
  return (
    <section className="sec">
      <h2>Copia de seguridad</h2>
      <LocalNote />
      {online && <p className="note">Lo del grupo ya se guarda online para todos. Esto es por las dudas.</p>}
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn ghost sm" onClick={exportar}><Download size={14} /> Exportar copia</button>
        <button className="btn ghost sm" onClick={() => file.current.click()}><Upload size={14} /> Importar copia</button>
        <input ref={file} type="file" accept=".json,application/json" hidden onChange={importar} />
      </div>
      {msg && <p role="status" className={`small ${msg.ok ? 'muted' : 'err'}`} style={{ marginTop: 10 }}>{msg.text}</p>}
    </section>
  )
}

const AV = ['var(--lav)', 'var(--flare)', 'var(--gold)', '#9FD8C4', '#E7A6D6', '#A9C4F5'] // un color por integrante

export default function Grupo() {
  const { data, update, reset, online, canAct = () => true } = useStore()
  const ask = useConfirm()
  const set = (k) => (v) => update(k, v)
  const fixed = data.members.filter((m) => !m.guest)
  const drinkOpts = [['', '—'], ...data.favDrinks.map((d) => [d.id, d.name])]
  const drinkName = (id) => data.favDrinks.find((d) => d.id === id)?.name
  return (
    <>
      <h1>El grupo</h1>
      <p className="lead">Los de siempre, sus apodos y las historias que no se cuentan afuera.</p>
      {online && <GroupHead />}

      <ListSection title="Los de siempre" addLabel="Sumar integrante" items={fixed} editable={(m) => canAct(m.id)} onChange={(v) => update('members', (ms) => [...v, ...ms.filter((m) => m.guest)])}
        fields={[{ name: 'name', label: 'Nombre', required: true }, { name: 'nick', label: 'Apodo' }, { name: 'photo', label: 'Foto de perfil', type: 'photo' }, { name: 'drink', label: 'Qué tomás', type: 'select', options: drinkOpts }]}
        render={(m) => (
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            {m.photo ? <img className="avatar" src={m.photo} alt="" /> : <span className="avatar" aria-hidden="true" style={{ '--av': AV[fixed.indexOf(m) % AV.length] }}>{m.name[0]}</span>}
            <span className="grow"><b style={{ fontSize: 17 }}>{m.name}</b>{m.nick && <span className="muted small" style={{ display: 'block' }}>{m.nick}</span>}</span>
            {drinkName(m.drink) && <span className="tag">{drinkName(m.drink)}</span>}
          </div>
        )} />

      <ListSection title="Anécdotas" addLabel="Nueva anécdota" items={data.stories} onChange={set('stories')}
        fields={[{ name: 'title', label: 'Título', required: true }, { name: 'date', label: 'Cuándo', type: 'date' }, { name: 'text', label: 'La historia', type: 'textarea' }]}
        render={(a) => <><b style={{ fontSize: 17 }}>{a.title}</b> {a.date && <span className="muted small" style={{ display: 'block' }}>{new Date(a.date + 'T12:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}<p className="muted" style={{ marginTop: 4, maxWidth: '60ch' }}>{a.text}</p></>} />

      {online && <Admin />}

      <Backup />

      {!online && <div className="sec">
        <button className="btn ghost sm" onClick={async () => (await ask('Esto borra todo lo que cargaste y vuelve a los datos de ejemplo. No hay vuelta atrás.', 'Restaurar')) && reset()}>
          Restaurar datos de ejemplo
        </button>
      </div>}
    </>
  )
}
