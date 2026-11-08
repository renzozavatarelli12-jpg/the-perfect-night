import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import './rankings.css'
import { useStore } from '../store'
import { useLive } from '../live'
import { today, who } from '../utils'
import { useConfirm } from '../components/Confirm'
import { RANKS, ranked, top, unit, activity } from '../rank'

const nowY = () => +today().slice(0, 4)
const KIND = { cubatas: '🍹 Cubatas', besos: '💋 Besos', salidas: '🌙 Salida', boliches: '🪩 Boliche' }
const dmy = (d) => new Date(d + 'T12:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })

export default function Rankings() {
  const { group } = useStore()
  if (!group || group.role === 'legacy') return <div className="bn"><Hero /><p className="note">Para ver y cargar los rankings, primero elegí quién sos.</p></div>
  return <RankingsInner gid={group.id} />
}
const Hero = () => (
  <div className="bn-hero">
    <span className="bn-e" aria-hidden="true">🏆</span>
    <h1>Rankings</h1>
    <p>Temporada FLAMA. Solo cuenta lo que se anota.</p>
  </div>
)

function RankingsInner({ gid }) {
  const { data } = useStore()
  const [year, setYear] = useState(nowY()) // null = de siempre
  const L = useLive('tpn_stats_view', { p_group: gid, p_year: year })
  const v = L.v?.year === year ? L.v : null
  const closed = !!v?.season?.closed
  const add = (a) => L.act('tpn_stat_add', { p_group: gid, ...a })
  return (
    <div className="bn">
      <Hero />
      <div className="pills" role="group" aria-label="Temporada">
        {(L.v?.years || [nowY()]).map((y) => <button key={y} className={`pill ${year === y ? 'on' : ''}`} aria-pressed={year === y} onClick={() => setYear(y)}>FLAMA {y}</button>)}
        <button className={`pill ${year === null ? 'on' : ''}`} aria-pressed={year === null} onClick={() => setYear(null)}>De siempre</button>
      </div>
      {L.err && <p className="small err" role="alert" style={{ marginTop: 10 }}>{L.err}</p>}
      {!v ? <p className="muted" style={{ marginTop: 20 }}>Cargando…</p> : <>
        {closed && <p className="note bn-lock">🔒 Temporada cerrada el {new Date(v.season.closed_at).toLocaleDateString('es-AR')}. Estos números quedaron fijos.</p>}
        <section className="sec">
          <h2>Los cuatro grandes</h2>
          {RANKS.map((r) => <Board key={r.k} r={r} totals={v.totals} me={v.me} />)}
        </section>
        {year !== null && !closed && year === nowY() && <Log v={v} gid={gid} data={data} add={add} L={L} />}
        {year !== null && <Season v={v} gid={gid} year={year} L={L} data={data} />}
        <Recent v={v} L={L} data={data} />
      </>}
    </div>
  )
}

function Board({ r, totals, me }) {
  const list = ranked(totals, r.k)
  return (
    <div className={`rk rk-${r.k}`}>
      <div className="rk-h"><span className="e" aria-hidden="true">{r.icon}</span><span><b>{r.title}</b><span className="small muted">{r.desc}</span></span></div>
      {!list.length ? <p className="empty">Todavía no hay nada anotado.</p> : (
        <ol className="rk-list">
          {list.map((t) => (
            <li key={t.m} className={`${t.pos === 1 ? 'lead' : ''} ${t.m === me ? 'me' : ''}`}>
              <span className="rk-pos">{t.pos}</span>
              <span className="grow">{t.name}</span>
              {t.gap > 0 && <span className="small muted" aria-label={`a ${t.gap} del primero`}>−{t.gap}</span>}
              <span className="rk-n" aria-label={unit(r, t.n)}>{t.n}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

// Cargar lo de una noche. Siempre para uno mismo; un admin puede cargar para otro con motivo.
function Log({ v, gid, data, add, L }) {
  const [day, setDay] = useState(today())
  const [bol, setBol] = useState('')
  const [n, setN] = useState({ cubatas: 1, besos: 1 })
  const [who_, setWho] = useState('')
  const [note, setNote] = useState('')
  const [ok, setOk] = useState('')
  const admin = v.role === 'admin'
  const other = admin && who_ && who_ !== v.me
  const done = (r, t) => { if (r) { setOk(t); setTimeout(() => setOk(''), 2500) } }
  const members = data.members.filter((m) => !m.guest)
  const salí = async () => {
    if (other) {
      const r = await add({ p_kind: 'salidas', p_day: day, p_n: 1, p_boliche: null, p_member: who_, p_note: note })
      if (r && bol) await add({ p_kind: 'boliches', p_day: day, p_n: 1, p_boliche: bol, p_member: who_, p_note: note })
      return done(r, 'Anotado.')
    }
    done(await L.act('tpn_night', { p_group: gid, p_day: day, p_boliche: bol || null, p_plan: null }), bol ? 'Anotada la salida y el boliche.' : 'Anotada la salida.')
  }
  const sum = async (k) => done(await add({ p_kind: k, p_day: day, p_n: n[k], p_boliche: null, p_member: other ? who_ : null, p_note: other ? note : '' }), 'Anotado.')
  const blocked = L.busy || (other && !note.trim())
  return (
    <section className="sec">
      <h2>Anotar</h2>
      <p className="muted small">Es solo un registro de lo que pasó. Nadie tiene que sumar nada: pasar, tomar sin alcohol o no contar también vale.</p>
      <div className="bn-form">
        <label><span className="small muted">Qué noche</span><input type="date" value={day} max={today()} onChange={(e) => setDay(e.target.value)} /></label>
        {admin && <label><span className="small muted">Para quién</span>
          <select value={who_} onChange={(e) => setWho(e.target.value)}>
            <option value="">Para mí</option>
            {members.filter((m) => m.id !== v.me).map((m) => <option key={m.id} value={m.id}>{m.name} (corrección de admin)</option>)}
          </select></label>}
        {other && <label><span className="small muted">Motivo (queda guardado)</span><input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="Ej: se olvidó de anotarlo" /></label>}
      </div>
      <div className="bn-row">
        <span style={{ fontSize: 24 }} aria-hidden="true">🌙</span>
        <span className="grow">Salí<span className="muted small" style={{ display: 'block', fontWeight: 400 }}>Una por noche. Si fuiste a un boliche, elegilo y suma la visita.</span></span>
      </div>
      <div className="add">
        <select value={bol} onChange={(e) => setBol(e.target.value)} aria-label="Boliche (opcional)">
          <option value="">Sin boliche</option>
          {data.boliches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <button className="btn sm" disabled={blocked} onClick={salí}>Anotar</button>
      </div>
      {['cubatas', 'besos'].map((k) => (
        <div className="bn-row" key={k}>
          <span style={{ fontSize: 24 }} aria-hidden="true">{k === 'cubatas' ? '🍹' : '💋'}</span>
          <span className="grow">{k === 'cubatas' ? 'Cubatas' : 'Besos'}</span>
          <button className="bn-step minus" aria-label="Uno menos" disabled={n[k] <= 1} onClick={() => setN({ ...n, [k]: n[k] - 1 })}>−</button>
          <span className="bn-n">{n[k]}</span>
          <button className="bn-step" aria-label="Uno más" disabled={n[k] >= 20} onClick={() => setN({ ...n, [k]: n[k] + 1 })}>+</button>
          <button className="btn sm" disabled={blocked} onClick={() => sum(k)}>Anotar</button>
        </div>
      ))}
      {ok && <p className="small" role="status" style={{ marginTop: 8, color: 'var(--gold)' }}>✓ {ok}</p>}
    </section>
  )
}

// Últimos registros: los míos (o de todos si soy admin). Corregir = anular, con motivo si es de otro.
function Recent({ v, L, data }) {
  const ask = useConfirm()
  const [open, setOpen] = useState(false)
  const [why, setWhy] = useState({})
  const admin = v.role === 'admin'
  const bname = (id) => data.boliches.find((b) => b.id === id)?.name || 'boliche'
  const list = v.recent.filter((r) => v.year === null || r.d.startsWith(String(v.year)))
  if (!v.recent.length) return null
  return (
    <section className="sec">
      <div className="sec-h"><h2>{admin ? 'Últimos registros' : 'Lo que anotaste'}</h2>
        <button className="btn ghost sm" onClick={() => setOpen(!open)}>{open ? 'Ocultar' : `Ver (${list.length})`}</button></div>
      {open && <>
        <p className="muted small">¿Algo mal? Anulalo y cargalo bien. {admin ? 'Para anular lo de otro hace falta un motivo.' : 'Lo de los demás lo corrige un admin.'}</p>
        {!list.length && <p className="empty">Nada en esta temporada.</p>}
        {list.map((r) => {
          const mine = r.m === v.me
          return (
            <div className="li" key={r.id}>
              <span className="grow">
                <b>{KIND[r.k]}{r.n > 1 ? ` ×${r.n}` : ''}{r.k === 'boliches' && r.b ? ` · ${bname(r.b)}` : ''}</b>
                <span className="muted small" style={{ display: 'block' }}>{admin && `${who(data.members, r.m)} · `}{dmy(r.d)}{r.old ? ' · registro anterior' : ''}{r.by !== r.m ? ` · cargó ${who(data.members, r.by)}` : ''}{r.note && !r.old ? ` · ${r.note}` : ''}</span>
                {!mine && !r.locked && <input className="bn-why" value={why[r.id] || ''} maxLength={200} onChange={(e) => setWhy({ ...why, [r.id]: e.target.value })} placeholder="Motivo para anular" aria-label="Motivo" />}
              </span>
              {r.locked ? <span className="tag">🔒</span> : (
                <button className="ib" aria-label="Anular registro" disabled={L.busy || (!mine && !(why[r.id] || '').trim())}
                  onClick={async () => (await ask('¿Anular este registro? Deja de contar en los rankings (queda guardado quién lo anuló y por qué).', 'Anular'))
                    && L.act('tpn_stat_void', { p_stat: r.id, p_reason: why[r.id] || '' })}><Trash2 size={16} /></button>
              )}
            </div>
          )
        })}
      </>}
    </section>
  )
}

function Season({ v, gid, year, L, data }) {
  const ask = useConfirm()
  const s = v.season, admin = v.role === 'admin'
  const [edit, setEdit] = useState(null) // { logro, anecdote }
  const [why, setWhy] = useState('')
  const line = (t, val, u) => { const w = top(v.totals, val); return <div>{t}: <b>{w ? `${w.names.join(' y ')}` : 'Vacante'}</b>{w && <span className="small muted">{u(w.n)}</span>}</div> }
  return (
    <section className="sec">
      <h2>Resumen FLAMA {year}</h2>
      <div className="bn-sum">
        {line('Integrante más activo', activity, (n) => `${n} entre salidas y boliches visitados`)}
        {line('Mayor cantidad de salidas', 'salidas', (n) => unit(RANKS[2], n))}
        {line('Mayor cantidad de besos', 'besos', (n) => unit(RANKS[1], n))}
        {line('Mayor cantidad de cubatas', 'cubatas', (n) => unit(RANKS[0], n))}
        <div>Logro más difícil: <b>{s.logro || 'Sin elegir'}</b>{admin && !s.closed && !s.logro && <span className="small muted">Lo escribe un admin.</span>}</div>
        <div>Anécdota del año: <b className="bn-story">{s.anecdote || 'Sin elegir'}</b></div>
      </div>
      <p className="muted small" style={{ marginTop: 8 }}>“Más activo” = salidas + visitas a boliches del año (no cuentan cubatas ni besos). Empates: se muestran todos.</p>
      {admin && <div className="row" style={{ marginTop: 12 }}>
        {!s.closed && !edit && <button className="btn ghost sm" onClick={() => setEdit({ logro: s.logro, anecdote: s.anecdote })}>Escribir logro y anécdota</button>}
        {!s.closed && <button className="btn ghost sm" disabled={L.busy}
          onClick={async () => (await ask(`¿Cerrar FLAMA ${year}? Los números quedan fijos y no se puede cargar ni anular nada de ese año (salvo que un admin la reabra con motivo).`, 'Cerrar temporada'))
            && L.act('tpn_season_close', { p_group: gid, p_year: year, p_open: false, p_reason: '' })}>🔒 Cerrar temporada</button>}
        {s.closed && <form className="add" style={{ width: '100%' }} onSubmit={async (e) => { e.preventDefault(); if (why.trim() && (await ask(`¿Reabrir FLAMA ${year}? Queda registrado el motivo.`, 'Reabrir')) && (await L.act('tpn_season_close', { p_group: gid, p_year: year, p_open: true, p_reason: why }))) setWhy('') }}>
          <input value={why} maxLength={200} onChange={(e) => setWhy(e.target.value)} placeholder="Motivo para reabrir (corrección)" aria-label="Motivo para reabrir" />
          <button className="btn ghost sm" disabled={!why.trim() || L.busy}>Reabrir</button>
        </form>}
      </div>}
      {edit && <form className="bn-form" onSubmit={async (e) => { e.preventDefault(); if (await L.act('tpn_season_save', { p_group: gid, p_year: year, p_logro: edit.logro, p_anecdote: edit.anecdote })) setEdit(null) }}>
        <label><span className="small muted">Logro más difícil</span><input value={edit.logro} maxLength={300} onChange={(e) => setEdit({ ...edit, logro: e.target.value })} placeholder="Ej: Volver caminando desde Palermo" /></label>
        <label><span className="small muted">Anécdota del año</span>
          <select value="" onChange={(e) => e.target.value && setEdit({ ...edit, anecdote: data.stories.find((x) => x.id === e.target.value).title })} aria-label="Elegir de las anécdotas">
            <option value="">Elegir una de las anécdotas del grupo…</option>
            {data.stories.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
          </select>
          <textarea rows={2} value={edit.anecdote} maxLength={1000} onChange={(e) => setEdit({ ...edit, anecdote: e.target.value })} placeholder="…o escribila acá" /></label>
        <div className="row end"><button type="button" className="btn ghost sm" onClick={() => setEdit(null)}>Cancelar</button><button className="btn sm" disabled={L.busy}>Guardar</button></div>
      </form>}
      {s.history?.length > 0 && <p className="muted small" style={{ marginTop: 10 }}>{s.history.map((h, i) => <span key={i} style={{ display: 'block' }}>{h.closed_at ? `Cerrada el ${new Date(h.closed_at).toLocaleDateString('es-AR')} por ${who(data.members, h.by)}` : `Reabierta el ${new Date(h.reopened_at).toLocaleDateString('es-AR')} por ${who(data.members, h.by)}: ${h.reason}`}</span>)}</p>}
    </section>
  )
}
