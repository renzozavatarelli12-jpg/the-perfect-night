import { useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { useStore } from '../store'
import LocalNote from '../components/LocalNote'
import { useConfirm } from '../components/Confirm'
import ListSection from '../components/ListSection'
import { who, today, makeBackup, parseBackup } from '../utils'

function Backup() {
  const { data, me, replaceAll } = useStore()
  const file = useRef()
  const ask = useConfirm()
  const [msg, setMsg] = useState(null)
  const exportar = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(makeBackup(data, me), null, 2)], { type: 'application/json' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `the-perfect-night-${today()}.json` })
    document.body.append(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setMsg({ ok: true, text: 'Copia descargada. Guardala bien (por ejemplo, mandátela por WhatsApp).' })
  }
  const importar = async (e) => {
    const f = e.target.files[0]; e.target.value = ''
    if (!f) return
    let r
    try { r = f.size > 5e6 ? { error: 'El archivo es demasiado grande.' } : parseBackup(await f.text()) } catch { r = { error: 'No se pudo leer el archivo.' } }
    if (r.error) return setMsg({ ok: false, text: `${r.error} No se cambió nada.` })
    const c = (k) => r.data[k].length
    if (!(await ask(`Esto REEMPLAZA todo lo que tenés ahora por la copia (${c('boliches')} boliches, ${c('members')} integrantes). Tip: exportá una copia de lo actual antes. ¿Reemplazar?`, 'Reemplazar')))
      return setMsg({ ok: false, text: 'Importación cancelada. No se cambió nada.' })
    replaceAll(r.data, r.me)
    setMsg({ ok: true, text: 'Copia importada.' })
  }
  return (
    <section className="sec">
      <h2>Copia de seguridad</h2>
      <LocalNote />
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn ghost sm" onClick={exportar}><Download size={14} /> Exportar copia</button>
        <button className="btn ghost sm" onClick={() => file.current.click()}><Upload size={14} /> Importar copia</button>
        <input ref={file} type="file" accept=".json,application/json" hidden onChange={importar} />
      </div>
      {msg && <p role="status" className={`small ${msg.ok ? 'muted' : 'err'}`} style={{ marginTop: 10 }}>{msg.text}</p>}
    </section>
  )
}

export default function Grupo() {
  const { data, update, reset } = useStore()
  const ask = useConfirm()
  const set = (k) => (v) => update(k, v)
  const fixed = data.members.filter((m) => !m.guest)
  const memberOpts = fixed.map((m) => [m.id, m.name])
  const drinkOpts = [['', '—'], ...data.favDrinks.map((d) => [d.id, d.name])]
  const drinkName = (id) => data.favDrinks.find((d) => d.id === id)?.name
  const fans = (d) => fixed.filter((m) => m.drink === d.id)
  const ranked = [...data.favDrinks].sort((a, b) => fans(b).length - fans(a).length)
  return (
    <>
      <h1>El grupo</h1>
      <p className="lead">Todo lo que nadie de afuera entendería.</p>

      <ListSection title="Integrantes y apodos" addLabel="Sumar integrante" items={fixed} onChange={(v) => update('members', (ms) => [...v, ...ms.filter((m) => m.guest)])}
        fields={[{ name: 'name', label: 'Nombre', required: true }, { name: 'nick', label: 'Apodo' }, { name: 'drink', label: 'Qué tomás', type: 'select', options: drinkOpts }]}
        render={(m) => <div className="row"><b>{m.name}</b>{m.nick && <span className="tag">{m.nick}</span>}{drinkName(m.drink) && <span className="tag">🍹 {drinkName(m.drink)}</span>}</div>} />

      <ListSection title="Ranking de tragos" addLabel="Sumar trago" hint="Se arma solo con lo que elige cada uno arriba (lápiz → Qué tomás)." items={ranked} onChange={set('favDrinks')}
        fields={[{ name: 'name', label: 'Trago', required: true }]}
        render={(d) => <><b>{d.name}</b> <span className="muted small">{fans(d).length ? `${fans(d).length} · ${fans(d).map((m) => m.name).join(', ')}` : '—'}</span></>} />

      <ListSection title="Boliches" hint="Los que aparecen para votar en Hoy." items={data.boliches} onChange={set('boliches')}
        fields={[{ name: 'name', label: 'Nombre', required: true }, { name: 'zone', label: 'Zona' }, { name: 'address', label: 'Dirección' }, { name: 'mapUrl', label: 'Link de Google Maps (opcional)', type: 'url' }, { name: 'photo', label: 'URL de una foto (opcional)', type: 'url' }]}
        render={(b) => <><b>{b.name}</b> <span className="muted small">{b.zone}</span></>} />

      <ListSection title="Frases típicas" items={data.phrases} onChange={set('phrases')}
        fields={[{ name: 'text', label: 'La frase', required: true }, { name: 'by', label: '¿Quién la dice?', type: 'select', options: memberOpts }]}
        render={(f) => <>{f.text}<div className="muted small">— {who(data.members, f.by)}</div></>} />

      <ListSection title="Estadísticas absurdas" addLabel="Nueva estadística" items={data.stats} onChange={set('stats')}
        fields={[{ name: 'value', label: 'Número', required: true }, { name: 'label', label: 'Qué mide', required: true }]}
        render={(s) => <div className="row" style={{ flexWrap: 'nowrap' }}><span className="stat">{s.value}</span><span className="muted">{s.label}</span></div>} />

      <ListSection title="Anécdotas" addLabel="Nueva anécdota" items={data.stories} onChange={set('stories')}
        fields={[{ name: 'title', label: 'Título', required: true }, { name: 'date', label: 'Cuándo', type: 'date' }, { name: 'text', label: 'La historia', type: 'textarea' }]}
        render={(a) => <><b>{a.title}</b> <span className="muted small">{a.date}</span><p className="muted" style={{ marginTop: 4 }}>{a.text}</p></>} />

      <Backup />

      <div className="sec">
        <button className="btn ghost sm" onClick={async () => (await ask('Esto borra TODO lo que cargaste y vuelve a los datos de ejemplo. ¿Seguro?', 'Restaurar')) && reset()}>
          Restaurar datos de ejemplo
        </button>
      </div>
    </>
  )
}
