import { Link } from 'react-router-dom'
import './quien.css'

const GAMES = [
  ['quien', '🎭', '¿Quién es quién?', 'Respondé como otro del grupo y que adivinen a quién imitás', 'mg-quien'],
  ['probable', '🍻', '¿Quién es más probable que…?', 'Sale una, el más probable toma', 'mg-prob'],
]

export default function Minijuegos() {
  return (
    <>
      <h1>Minijuegos</h1>
      <p className="lead">Para la previa. Un solo celu, que vaya pasando de mano en mano.</p>
      <div className="mg-grid">
        {GAMES.map(([to, icon, title, desc, cls]) => (
          <Link key={to} to={to} className={`mg-tile ${cls}`}>
            <span className="mg-icon" aria-hidden="true">{icon}</span>
            <b>{title}</b>
            <span className="small">{desc}</span>
          </Link>
        ))}
      </div>
    </>
  )
}
