import { useState } from 'react'
import './rankings.css'
import { useStore } from '../store'
import { today, uid } from '../utils'
import { KINDS, RANKS, LOGROS, total, inYear, bump, unlocked, season } from '../rank'

const list = (a) => (a.length ? a.join(' y ') : 'Vacante')

export default function Rankings() {
  const { data, update, me } = useStore()
  const members = data.members.filter((m) => !m.guest)
  const [pid, setPid] = useState(me && members.some((m) => m.id === me) ? me : members[0]?.id)
  const nowY = today().slice(0, 4)
  const years = [...new Set([nowY, ...data.log.map((e) => e.d.slice(0, 4))])].sort().reverse()
  const [year, setYear] = useState(nowY)
  const set = (m, k, d) => update('log', (l) => bump(l, m, k, today(), d))
  const S = season(data.log, members, year)
  const p = members.find((m) => m.id === pid)
  const ana = data.flama[year] || ''
  const [dName, setDName] = useState('')
  const setDrink = (id) => update('members', (ms) => ms.map((m) => (m.id === pid ? { ...m, drink: id } : m)))
  const addDrink = (e) => {
    e.preventDefault()
    const name = dName.trim()
    if (!name) return
    const same = data.favDrinks.find((d) => d.name.toLowerCase() === name.toLowerCase()) // no duplicar
    const id = same ? same.id : uid()
    if (!same) update('favDrinks', (ds) => [...ds, { id, name, note: '' }])
    setDrink(id); setDName('')
  }
  const leaders = (k) => {
    const max = Math.max(0, ...members.map((m) => total(data.log, m.id, k)))
    return { max, who: max ? members.filter((m) => total(data.log, m.id, k) === max).map((m) => m.name) : [] }
  }

  return (
    <div className="bn">
      <div className="bn-hero">
        <span className="bn-e" aria-hidden="true">🏆</span>
        <h1>Rankings</h1>
        <p>Quién la rompe más. Anotá bien.</p>
      </div>

      <section className="sec">
        <h2>Los cuatro grandes</h2>
        <div className="bn-grid">
          {RANKS.map((r) => { const L = leaders(r.k); return (
            <div className="bn-card" key={r.k}>
              <span className="e">{r.icon}</span><b>{r.title}</b>
              <span className="w">{list(L.who)}</span>
              <span className="small" aria-label={`${L.max} ${r.desc.toLowerCase()}`}>{L.max || ''}</span>
            </div>
          ) })}
        </div>
      </section>

      <section className="sec">
        <h2>Tu ficha</h2>
        {members.length ? (
          <>
            <select value={pid} onChange={(e) => setPid(e.target.value)} aria-label="Integrante">
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <div style={{ marginTop: 12 }}>
              <span className="muted small">Qué tomás</span>
              <div className="row" style={{ marginTop: 6, flexWrap: 'wrap' }}>
                {data.favDrinks.map((d) => (
                  <button key={d.id} className={`pill ${p?.drink === d.id ? 'on' : ''}`} onClick={() => setDrink(p?.drink === d.id ? '' : d.id)}>{d.name}</button>
                ))}
              </div>
              <form className="add" onSubmit={addDrink}>
                <input value={dName} onChange={(e) => setDName(e.target.value)} placeholder="¿Otro trago? Escribilo" />
                <button className="btn sm">Sumar</button>
              </form>
            </div>
            {KINDS.map((x) => (
              <div className="bn-row" key={x.k}>
                <span style={{ fontSize: 24 }}>{x.icon}</span>
                <span className="grow">{x.label}<span className="muted small" style={{ display: 'block', fontWeight: 400 }}>{inYear(data.log, pid, x.k, nowY)} en {nowY}</span></span>
                <button className="bn-step minus" aria-label={`Restar ${x.label}`} disabled={!total(data.log, pid, x.k)} onClick={() => set(pid, x.k, -1)}>−</button>
                <span className="bn-n">{total(data.log, pid, x.k)}</span>
                <button className="bn-step" aria-label={`Sumar ${x.label}`} onClick={() => set(pid, x.k, 1)}>+</button>
              </div>
            ))}
            <p className="muted small" style={{ marginTop: 8 }}>El + anota en la fecha de hoy (la salida, una vez por día). El − borra el último que cargaste.</p>
            <div className="bn-logros">
              {LOGROS.map((lg) => { const on = unlocked(data.log, pid).includes(lg); return (
                <div className={`bn-logro ${on ? 'on' : ''}`} key={lg.id}>
                  <span className="e" aria-hidden="true">{lg.icon}</span>
                  <span><b>{lg.name}</b></span><span className="small">{on ? '¡Desbloqueado!' : `${Math.min(total(data.log, pid, lg.k), lg.goal)}/${lg.goal} ${KINDS.find((x) => x.k === lg.k).label.toLowerCase()}`}</span>
                </div>
              ) })}
            </div>
          </>
        ) : <p className="muted">Sumá integrantes en Grupo.</p>}
      </section>

      <section className="sec">
        <h2>FLAMA {year}</h2>
        <select value={year} onChange={(e) => setYear(e.target.value)} aria-label="Temporada">
          {years.map((y) => <option key={y} value={y}>FLAMA {y}</option>)}
        </select>
        <div className="bn-sum">
          <div>Integrante más activo: <b>{list(S.activo)}</b></div>
          <div>Más salidas: <b>{list(S.salidas)}</b></div>
          <div>Más besos: <b>{list(S.besos)}</b></div>
          <div>Más cubatas: <b>{list(S.cubatas)}</b></div>
          <div>Logro más difícil: <b>{S.logro ? `${S.logro.lg.icon} ${S.logro.lg.name} (${list(S.logro.who)})` : 'Ninguno todavía'}</b></div>
        </div>
        <label style={{ display: 'grid', gap: 6, marginTop: 14 }}>
          <span className="muted small">Anécdota del año</span>
          <select value="" onChange={(e) => e.target.value && update('flama', (f) => ({ ...f, [year]: data.stories.find((s) => s.id === e.target.value).title }))} aria-label="Elegir de las anécdotas">
            <option value="">Elegir una de las anécdotas…</option>
            {data.stories.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
          <textarea rows={2} value={ana} placeholder="…o escribila acá" onChange={(e) => update('flama', (f) => ({ ...f, [year]: e.target.value }))} />
        </label>
      </section>
    </div>
  )
}
