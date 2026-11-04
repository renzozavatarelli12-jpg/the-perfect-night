import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { uid, today } from '../utils'

export default function NightNew() {
  const { update, me } = useStore()
  const nav = useNavigate()
  const [v, setV] = useState({ title: '', date: today(), time: '23:00', zone: '', notes: '' })
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value })
  const submit = (e) => {
    e.preventDefault()
    const id = uid()
    update('nights', (ns) => [...ns, { ...v, title: v.title || 'Una noche más', id, rsvp: me ? { [me]: 'yes' } : {}, previas: [], votes: {}, closed: false }])
    nav(`/noches/${id}`)
  }
  return (
    <>
      <h1>Nueva noche</h1>
      <p className="lead">Después te dejo un link para pasarle al grupo.</p>
      <form className="form" onSubmit={submit}>
        <label><span>Nombre de la noche</span><input value={v.title} onChange={set('title')} placeholder="Ej: Sábado sin excusas" /></label>
        <div className="row">
          <label className="grow"><span>Fecha</span><input type="date" required value={v.date} onChange={set('date')} /></label>
          <label className="grow"><span>Horario</span><input type="time" required value={v.time} onChange={set('time')} /></label>
        </div>
        <label><span>Zona</span><input value={v.zone} onChange={set('zone')} placeholder="Barrio o zona" /></label>
        <label><span>Notas (opcional)</span><textarea rows={3} value={v.notes} onChange={set('notes')} /></label>
        <button className="btn">Crear noche</button>
      </form>
    </>
  )
}
