import { useStore } from '../store'
import ListSection from '../components/ListSection'

export default function Bebidas() {
  const { data, update } = useStore()
  return (
    <>
      <h1>Bebidas</h1>
      <p className="lead">Lo que se toma, quién lo toma y lo que se inventa a las 2am.</p>

      <ListSection title="Las de siempre" items={data.favDrinks} onChange={(v) => update('favDrinks', v)}
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
