import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Flame, Users, Gamepad2, Trophy } from 'lucide-react'
import { useStore } from '../store'
import { Join, SyncDot, SyncBar, Migrate } from './Cloud'

const tabs = [
  ['/', 'Hoy', Flame],
  ['/grupo', 'Grupo', Users],
  ['/minijuegos', 'Minijuegos', Gamepad2],
  ['/rankings', 'Rankings', Trophy],
]

export default function Layout() {
  const { data, me, setMe, online, sync } = useStore()
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  if (online && sync.needJoin) return <Join />
  return (
    <>
      <header className="top">
        <Link to="/" className="logo">the perfect night<i>.</i>{online && <SyncDot />}</Link>
        <nav className="tabs">
          {tabs.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === '/'}>
              <Icon size={20} /> {label}
            </NavLink>
          ))}
        </nav>
        <select className="me" value={me || ''} onChange={(e) => setMe(e.target.value || null)} aria-label="¿Quién sos?">
          <option value="">¿Quién sos?</option>
          {data.members.filter((m) => !m.guest).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          {data.members.some((m) => m.guest) && (
            <optgroup label="Invitados">
              {data.members.filter((m) => m.guest).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </optgroup>
          )}
        </select>
      </header>
      {online && <SyncBar />}
      {online && <Migrate />}
      <main className="wrap"><Outlet /></main>
    </>
  )
}
