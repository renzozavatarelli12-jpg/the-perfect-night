import { useStore } from '../store'
import ListSection from '../components/ListSection'
import { who } from '../utils'

export default function Grupo() {
  const { data, update, reset } = useStore()
  const set = (k) => (v) => update(k, v)
  const memberOpts = data.members.map((m) => [m.id, m.name])
  return (
    <>
      <h1>El grupo</h1>
      <p className="lead">Todo lo que nadie de afuera entendería.</p>

      <ListSection title="Integrantes y apodos" addLabel="Sumar integrante" items={data.members} onChange={set('members')}
        fields={[{ name: 'name', label: 'Nombre', required: true }, { name: 'nick', label: 'Apodo' }, { name: 'drink', label: 'Lo que toma' }]}
        render={(m) => <div className="row"><b>{m.name}</b>{m.nick && <span className="tag">{m.nick}</span>}</div>} />

      <ListSection title="Chistes internos" items={data.jokes} onChange={set('jokes')}
        fields={[{ name: 'text', label: 'El chiste', type: 'textarea', required: true }]} render={(j) => j.text} />

      <ListSection title="Frases típicas" items={data.phrases} onChange={set('phrases')}
        fields={[{ name: 'text', label: 'La frase', required: true }, { name: 'by', label: '¿Quién la dice?', type: 'select', options: memberOpts }]}
        render={(f) => <>{f.text}<div className="muted small">— {who(data.members, f.by)}</div></>} />

      <ListSection title="Rankings" addLabel="Nuevo ranking" items={data.rankings} onChange={set('rankings')}
        fields={[{ name: 'title', label: 'Título', required: true }, { name: 'items', label: 'Posiciones (una por línea, del 1° al último)', type: 'textarea' }]}
        render={(r) => (
          <><b>{r.title}</b>
            <ol className="muted small" style={{ paddingLeft: 18, marginTop: 4 }}>
              {(r.items || '').split('\n').filter(Boolean).map((x, i) => <li key={i}>{x}</li>)}
            </ol></>
        )} />

      <ListSection title="Estadísticas absurdas" addLabel="Nueva estadística" items={data.stats} onChange={set('stats')}
        fields={[{ name: 'value', label: 'Número', required: true }, { name: 'label', label: 'Qué mide', required: true }]}
        render={(s) => <div className="row" style={{ flexWrap: 'nowrap' }}><span className="stat">{s.value}</span><span className="muted">{s.label}</span></div>} />

      <ListSection title="Anécdotas" addLabel="Nueva anécdota" items={data.stories} onChange={set('stories')}
        fields={[{ name: 'title', label: 'Título', required: true }, { name: 'date', label: 'Cuándo', type: 'date' }, { name: 'text', label: 'La historia', type: 'textarea' }]}
        render={(a) => <><b>{a.title}</b> <span className="muted small">{a.date}</span><p className="muted" style={{ marginTop: 4 }}>{a.text}</p></>} />

      <div className="sec">
        <button className="btn ghost sm" onClick={() => window.confirm('Esto borra TODO lo que cargaste y vuelve a los datos de ejemplo. ¿Seguro?') && reset()}>
          Restaurar datos de ejemplo
        </button>
      </div>
    </>
  )
}
