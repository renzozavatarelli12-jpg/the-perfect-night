import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Home, CalendarDays, Disc3, Martini, Users } from 'lucide-react'
import { useStore } from '../store'

const tabs = [
  ['/', 'Inicio', Home],
  ['/noches', 'Noches', CalendarDays],
  ['/boliches', 'Boliches', Disc3],
  ['/bebidas', 'Bebidas', Martini],
  ['/grupo', 'Grupo', Users],
]

export default function Layout() {
  const { data, me, setMe } = useStore()
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return (
    <>
      <header className="top">
        <Link to="/" className="logo">the perfect night<i>.</i></Link>
        <nav className="tabs">
          {tabs.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === '/'}>
              <Icon size={20} /> {label}
            </NavLink>
          ))}
        </nav>
        <select className="me" value={me || ''} onChange={(e) => setMe(e.target.value || null)} aria-label="¿Quién sos?">
          <option value="">¿Quién sos?</option>
          {data.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </header>
      <main className="wrap"><Outlet /></main>
    </>
  )
}
