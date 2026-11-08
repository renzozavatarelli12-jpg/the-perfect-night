import { useState } from 'react'
import { Plus, Pencil, Trash2, X, MapPin } from 'lucide-react'
import { useStore } from '../store'
import { usePlans, STATUS, ITEM, ANS, dayLabel, split } from '../plans'
import { who, mapLink, today } from '../utils'
import { call } from '../cloud'
import { liveErr } from '../live'
import BolicheSheet from './Boliche'
import FormSheet from './FormSheet'
import { useConfirm } from './Confirm'

const SEATS = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => [String(n), String(n)])
const hhmm = (iso) => new Date(iso).toLocaleString('es-AR', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function Plans() {
  const { group } = useStore()
  if (group?.role === 'legacy') return null // sesión vieja sin persona: primero se confirma el perfil
  return <PlansInner gid={group.id} />
}

function PlansInner({ gid }) {
  const { data } = useStore()
  const P = usePlans(gid)
  const [open, setOpen] = useState(null)
  const [form, setForm] = useState(null) // 'new'
  const [past, setPast] = useState(false)
  const { live, past: old } = split(P.plans)
  const bolOpts = [['', 'Sin elegir'], ...data.boliches.map((b) => [b.id, b.name])]

  return (
    <section className="sec" aria-label="¿Qué se hace hoy?">
      <div className="sec-h">
        <h2>¿Qué se hace hoy?</h2>
        <button className="btn sm" onClick={() => setForm('new')} disabled={!P.plans}><Plus size={16} /> Proponer plan</button>
      </div>
      <p className="small muted" role="status" aria-live="polite">{P.busy ? 'Guardando…' : P.plans ? '' : P.err ? '' : 'Cargando…'}</p>
      {P.err && <p className="small err" role="alert">{P.err} <button className="pill" onClick={() => { P.clearErr(); P.reload() }}>Reintentar</button></p>}
      {P.plans && live.length === 0 && <p className="empty">Todavía no hay planes. Proponé uno: solo hace falta un nombre.</p>}
      {live.map((p) => <Card key={p.id} p={p} P={P} data={data} open={open === p.id} toggle={() => setOpen(open === p.id ? null : p.id)} bolOpts={bolOpts} />)}
      {old.length > 0 && <button className="pill" style={{ marginTop: 12 }} onClick={() => setPast(!past)}>{past ? 'Ocultar' : 'Ver'} terminados y cancelados ({old.length})</button>}
      {past && old.map((p) => <Card key={p.id} p={p} P={P} data={data} open={open === p.id} toggle={() => setOpen(open === p.id ? null : p.id)} bolOpts={bolOpts} />)}
      {form === 'new' && <PlanForm title="Proponer un plan" bolOpts={bolOpts} onClose={() => setForm(null)} onSave={(v) => P.savePlan(null, clean(v)).then((ok) => ok && setForm(null))} />}
    </section>
  )
}

const clean = (v) => ({ title: v.title, day: v.day || '', time: v.time || '', zone: v.zone || '', place: v.place || '', final_time: v.final_time || '', boliche: v.boliche || '' })

function PlanForm({ title, initial, bolOpts, onSave, onClose }) {
  return (
    <FormSheet title={title} initial={initial} onClose={onClose} onSave={onSave}
      fields={[
        { name: 'title', label: 'Qué se hace (ej: Previa en lo de Juan y boliche)', required: true, max: 80 },
        { name: 'day', label: 'Día (opcional)', type: 'date' },
        { name: 'time', label: 'Horario aproximado (opcional)', max: 20 },
        { name: 'zone', label: 'Zona (opcional)', max: 60 },
        { name: 'place', label: 'Lugar de la previa (opcional)', max: 80 },
        { name: 'boliche', label: 'Boliche (opcional)', type: 'select', options: bolOpts },
        { name: 'final_time', label: 'Horario final (opcional)', max: 20 },
      ]} />
  )
}

function Card({ p, P, data, open, toggle, bolOpts }) {
  const n = (a) => p.rsvps.filter((r) => r.a === a).length
  const bol = data.boliches.find((b) => b.id === p.boliche)
  return (
    <div className="plan">
      <button className="plan-h" onClick={toggle} aria-expanded={open}>
        <span className="grow">
          <b>{p.title}</b>
          <span className="small muted"> {dayLabel(p.day)}{p.time ? ` · ${p.time}` : ''}{p.zone ? ` · ${p.zone}` : ''}{bol ? ` · ${bol.name}` : ''}</span>
          <span className="small muted"> · {n('si')} van{n('capaz') ? ` · ${n('capaz')} capaz` : ''}</span>
        </span>
        <span className={'tag st-' + p.status}>{STATUS[p.status]}</span>
      </button>
      {open && <Detail p={p} P={P} data={data} bol={bol} bolOpts={bolOpts} />}
    </div>
  )
}

function Detail({ p, P, data, bol, bolOpts }) {
  const ask = useConfirm()
  const [edit, setEdit] = useState(false)
  const [ficha, setFicha] = useState(false)
  const [fui, setFui] = useState(null) // { ok, text }
  const mine = P.me
  // "Fui": recién acá suma una salida (y la visita al boliche del plan) para los rankings. Confirmar "Voy" no cuenta.
  const canFui = (p.status === 'conf' || p.status === 'done') && !!p.day && p.day <= today()
  const markFui = async () => {
    try { const r = await call('tpn_night', { p_group: P.gid, p_day: null, p_boliche: null, p_plan: p.id }); setFui({ ok: true, text: r.added > 1 ? 'Anotado: salida y boliche para los rankings.' : 'Anotado para los rankings.' }) }
    catch (e) { setFui({ ok: false, text: liveErr(e) }) }
  }
  const name = (id) => who(data.members, id)
  const top = [...data.boliches].map((b) => [b, Object.values(data.hoy.votes).filter((v) => v === b.id).length]).sort((a, b) => b[1] - a[1])[0]
  const del = async () => { if (await ask(`¿Borrar el plan "${p.title}" con todo lo que tiene cargado?`, 'Sí, borrar')) P.delPlan(p.id) }
  const canDel = p.by === mine || P.role === 'admin'
  return (
    <div className="plan-b">
      <div className="pills" role="group" aria-label="Estado del plan">
        {Object.entries(STATUS).map(([k, l]) => <button key={k} className={'pill' + (p.status === k ? ' on' : '')} aria-pressed={p.status === k} disabled={P.busy} onClick={() => p.status !== k && P.savePlan(p.id, { status: k })}>{l}</button>)}
      </div>

      <div className="plan-info">
        {p.place && <div><span className="muted small">Previa</span> {p.place}</div>}
        {p.boliche && !bol && <div><span className="muted small">Boliche</span> <span className="tag">Ya no está en la lista</span></div>}
        {bol && <div><span className="muted small">Boliche</span> <button className="linkish" onClick={() => setFicha(true)}><b>{bol.name}</b></button> <a className="map" href={mapLink(bol)} target="_blank" rel="noreferrer"><MapPin size={13} aria-hidden="true" /> Cómo llegar</a></div>}
        {p.final_time && <div><span className="muted small">Horario final</span> {p.final_time}</div>}
        {!bol && top && top[1] > 0 && <button className="pill" disabled={P.busy} onClick={() => P.savePlan(p.id, { boliche: top[0].id })}>Usar el más votado: {top[0].name}</button>}
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn ghost sm" onClick={() => setEdit(true)}><Pencil size={14} /> Editar datos</button>
          {canDel && <button className="btn ghost sm" onClick={del}><Trash2 size={14} /> Borrar</button>}
        </div>
        <p className="small muted">Lo propuso {name(p.by)}.</p>
      </div>

      <h3>¿Venís?</h3>
      <div className="pills" role="group" aria-label="Tu respuesta">
        {Object.entries(ANS).map(([k, l]) => {
          const on = p.rsvps.find((r) => r.m === mine)?.a === k
          return <button key={k} className={'pill' + (on ? ' on' : '')} aria-pressed={on} disabled={P.busy} onClick={() => P.rsvp(p.id, on ? '' : k)}>{l}</button>
        })}
      </div>
      {Object.entries(ANS).map(([k, l]) => { const ms = p.rsvps.filter((r) => r.a === k); return ms.length ? <p key={k} className="small"><b>{l} ({ms.length}):</b> <span className="muted">{ms.map((r) => name(r.m)).join(', ')}</span></p> : null })}

      {canFui && <>
        <h3>¿Fuiste?</h3>
        <p className="small muted">Para los rankings: suma tu salida{bol ? ` y la visita a ${bol.name}` : ''}. Solo cuenta si tocás acá.</p>
        <div className="row" style={{ marginTop: 6 }}><button className="pill" disabled={!!fui?.ok} onClick={markFui}>{fui?.ok ? '✓ Fui' : 'Fui'}</button>
          {fui && <span role="status" className={'small ' + (fui.ok ? 'muted' : 'err')}>{fui.text}</span>}</div>
      </>}

      <Cars p={p} P={P} name={name} mine={mine} ask={ask} />
      <Items p={p} P={P} data={data} name={name} mine={mine} />
      <Comments p={p} P={P} name={name} mine={mine} />

      {ficha && bol && <BolicheSheet id={bol.id} onClose={() => setFicha(false)} />}
      {edit && <PlanForm title="Datos del plan" bolOpts={bolOpts} initial={{ title: p.title, day: p.day || '', time: p.time, zone: p.zone, place: p.place, final_time: p.final_time, boliche: bol ? p.boliche : '' }}
        onClose={() => setEdit(false)} onSave={(v) => P.savePlan(p.id, clean(v))} />}
    </div>
  )
}

function Cars({ p, P, name, mine, ask }) {
  const [form, setForm] = useState(null) // 'new' | car
  const myCar = p.cars.find((c) => c.driver === mine)
  const ridingIn = p.cars.find((c) => c.riders.includes(mine))
  const boss = (c) => c.driver === mine || P.role === 'admin'
  return (
    <>
      <h3>Autos</h3>
      {p.cars.length === 0 && <p className="small muted">Nadie ofreció auto todavía.</p>}
      {p.cars.map((c) => {
        const free = c.seats - c.riders.length
        const full = free <= 0
        const off = c.cancelled || c.closed
        return (
          <div className={'car' + (c.cancelled ? ' off' : '')} key={c.id}>
            <div className="row">
              <span className="grow"><b>{name(c.driver)}</b> <span className="muted small">{c.origin ? `sale de ${c.origin}` : ''}{c.depart ? ` · ${c.depart}` : ''}</span></span>
              <span className={'tag' + (full || off ? '' : ' ok')}>{c.cancelled ? 'No sale' : c.closed ? 'Cerrado' : full ? 'Lleno' : `${free} ${free === 1 ? 'lugar' : 'lugares'}`}</span>
            </div>
            {c.note && <p className="small muted">{c.note}</p>}
            <p className="small">{c.riders.length ? <>Van: {c.riders.map((m) => (
              <span key={m} className="chip">{name(m)}{boss(c) && <button aria-label={`Sacar a ${name(m)}`} disabled={P.busy} onClick={async () => (await ask(`¿Sacar a ${name(m)} del auto?`, 'Sí, sacar')) && P.car(c.id, 'kick', m)}><X size={12} /></button>}</span>
            ))}</> : <span className="muted">Sin pasajeros todavía.</span>}</p>
            <div className="row">
              {c.driver !== mine && !c.riders.includes(mine) && <button className="btn sm" disabled={P.busy || off || full || !!myCar} onClick={() => P.car(c.id, 'join')}>{ridingIn ? 'Pasarme a este' : 'Me sumo'}</button>}
              {c.riders.includes(mine) && <button className="btn ghost sm" disabled={P.busy} onClick={() => P.car(c.id, 'leave')}>Me bajo</button>}
              {boss(c) && <>
                <button className="btn ghost sm" onClick={() => setForm(c)}>Editar</button>
                <button className="btn ghost sm" disabled={P.busy} onClick={() => P.car(c.id, c.closed ? 'open' : 'close')}>{c.closed ? 'Reabrir' : 'Cerrar'}</button>
                <button className="btn ghost sm" disabled={P.busy} onClick={() => P.car(c.id, c.cancelled ? 'uncancel' : 'cancel')}>{c.cancelled ? 'Sí sale' : 'No sale'}</button>
                <button className="ib" aria-label="Borrar auto" disabled={P.busy} onClick={async () => (await ask('¿Borrar este auto?', 'Sí, borrar')) && P.car(c.id, 'delete')}><Trash2 size={16} /></button>
              </>}
            </div>
          </div>
        )
      })}
      {!myCar && <button className="btn ghost sm" style={{ marginTop: 10 }} onClick={() => setForm('new')}><Plus size={14} /> Ofrezco mi auto</button>}
      {form && <FormSheet title={form === 'new' ? 'Ofrecer mi auto' : 'Editar auto'} onClose={() => setForm(null)}
        initial={form === 'new' ? { seats: '3' } : { origin: form.origin, depart: form.depart, seats: String(form.seats), note: form.note }}
        fields={[{ name: 'origin', label: 'De dónde sale (opcional)', max: 60 }, { name: 'depart', label: 'A qué hora sale (opcional)', max: 20 }, { name: 'seats', label: 'Lugares libres (sin contarte)', type: 'select', options: SEATS }, { name: 'note', label: 'Comentario (opcional)', max: 120 }]}
        onSave={(v) => P.saveCar(p.id, form === 'new' ? null : form.id, { origin: v.origin || '', depart: v.depart || '', seats: v.seats, note: v.note || '' })} />}
    </>
  )
}

function Items({ p, P, data, name, mine }) {
  const [form, setForm] = useState(false)
  const [q, setQ] = useState('')
  const drinks = data.favDrinks.filter((d) => !p.items.some((i) => i.name.toLowerCase() === d.name.toLowerCase()))
  const add = (e) => { e.preventDefault(); const t = q.trim(); if (t) { P.saveItem(p.id, null, { name: t }); setQ('') } }
  const opts = [['', 'Nadie todavía'], ...data.members.map((m) => [m.id, m.name])]
  return (
    <>
      <h3>Compras</h3>
      {p.items.length === 0 && <p className="small muted">Lista vacía. Sumá lo que falta comprar.</p>}
      {p.items.map((i) => (
        <div className={'item st-' + i.state} key={i.id}>
          <span className="grow"><b>{i.name}</b>{i.qty && <span className="muted"> · {i.qty}</span>}<span className="small muted"> {i.who ? `· ${name(i.who)}` : ''}</span></span>
          <select aria-label={`Estado de ${i.name}`} value={i.state} disabled={P.busy} onChange={(e) => P.saveItem(p.id, i.id, { state: e.target.value })}>{Object.entries(ITEM).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          {!i.who && <button className="btn ghost sm" disabled={P.busy} onClick={() => P.saveItem(p.id, i.id, { who: mine })}>Yo lo llevo</button>}
          {i.who && i.who === mine && <button className="btn ghost sm" disabled={P.busy} onClick={() => P.saveItem(p.id, i.id, { who: '' })}>Soltar</button>}
          {(i.by === mine || P.role === 'admin') && <button className="ib" aria-label={`Sacar ${i.name}`} disabled={P.busy} onClick={() => P.delItem(i.id)}><Trash2 size={16} /></button>}
        </div>
      ))}
      <form className="add" onSubmit={add}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Qué falta (ej: hielo)" aria-label="Producto" maxLength={60} />
        <button className="btn sm" disabled={P.busy}>Sumar</button>
      </form>
      {drinks.length > 0 && <p className="small muted" style={{ marginTop: 8 }}>Bebidas del grupo: {drinks.map((d) => <button key={d.id} className="pill" disabled={P.busy} onClick={() => P.saveItem(p.id, null, { name: d.name })}>+ {d.name}</button>)}</p>}
      <button className="pill" style={{ marginTop: 8 }} onClick={() => setForm(true)}>Con cantidad y responsable…</button>
      {form && <FormSheet title="Sumar a la lista" onClose={() => setForm(false)} initial={{ who: '' }}
        fields={[{ name: 'name', label: 'Producto', required: true, max: 60 }, { name: 'qty', label: 'Cantidad (opcional)', max: 20 }, { name: 'who', label: 'Quién lo lleva', type: 'select', options: opts }]}
        onSave={(v) => P.saveItem(p.id, null, { name: v.name, qty: v.qty || '', who: v.who || '' })} />}
    </>
  )
}

function Comments({ p, P, name, mine }) {
  const [t, setT] = useState('')
  const send = async (e) => { e.preventDefault(); const b = t.trim(); if (b && (await P.comment(p.id, b))) setT('') }
  return (
    <>
      <h3>Novedades</h3>
      <form className="add" onSubmit={send}>
        <input value={t} onChange={(e) => setT(e.target.value)} placeholder="Contá algo del plan" aria-label="Novedad" maxLength={500} />
        <button className="btn sm" disabled={P.busy}>Publicar</button>
      </form>
      {p.comments.map((c) => (
        <div className="cm" key={c.id}>
          <span className="small"><b>{name(c.m)}</b> <span className="muted">{hhmm(c.at)}</span></span>
          <p>{c.body}</p>
          {(c.m === mine || P.role === 'admin') && <button className="ib" aria-label="Borrar novedad" disabled={P.busy} onClick={() => P.delComment(c.id)}><Trash2 size={14} /></button>}
        </div>
      ))}
    </>
  )
}
