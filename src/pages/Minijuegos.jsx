import { Link } from 'react-router-dom'
import './quien.css'
import { useStore } from '../store'
import { GAMES } from '../games'


export default function Minijuegos() {
  const { data } = useStore()
  const last = [...(data.partidas || [])].reverse().slice(0, 5)
  return (
    <>
      <h1>Previa Games</h1>
      <p className="lead">Para cuando estamos juntos antes de salir. Alcanza con un celu que vaya pasando de mano en mano.</p>
      <div className="mg-grid">
        {GAMES.map(({ to, icon, title, desc, cls }) => (
          <Link key={to} to={to} className={`mg-tile ${cls}`}>
            <span className="mg-icon" aria-hidden="true">{icon}</span>
            <b>{title}</b>
            <span className="small">{desc}</span>
          </Link>
        ))}
      </div>
      {last.length > 0 && (
        <section className="sec">
          <h2>Partidas de antes (en este celu)</h2>
          {last.map((p) => {
            const top = [...p.scores].sort((a, b) => b.pts - a.pts)
            return (
              <div className="li" key={p.id}>
                <span className="grow"><b>🎭 {top.filter((x) => x.pts === top[0]?.pts).map((x) => x.name).join(' y ')}</b> <span className="muted small" style={{ display: 'block' }}>{top.map((x) => `${x.name} ${x.pts}`).join(' · ')}</span></span>
                <span className="muted small">{new Date(p.d + 'T12:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}</span>
              </div>
            )
          })}
        </section>
      )}
    </>
  )
}
