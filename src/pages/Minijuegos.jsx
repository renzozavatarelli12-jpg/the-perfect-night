import { Link } from 'react-router-dom'
import './quien.css'

const GAMES = [
  ['quien', '🎭', '¿Quién es quién?', 'Imitá a otro del grupo y que adivinen', 'mg-quien'],
  ['probable', '🍻', '¿Quién es más probable que…?', 'Sale una, el más probable toma', 'mg-prob'],
]

export default function Minijuegos() {
  return (
    <>
      <h1>Minijuegos</h1>
      <p className="lead">Elegí uno.</p>
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
