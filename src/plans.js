// Planes de un grupo (Fase 2). Todo lo decide el servidor: acá solo se pide y se muestra lo que él confirma.
// Nada se muestra como guardado hasta que el servidor responde; si falla, se avisa y el plan queda como estaba.
import { useCallback, useEffect, useRef, useState } from 'react'
import { call } from './cloud'
import { errOf, errText } from './account'

const ERR2 = {
  full: 'Está lleno.', closed: 'Ese auto ya no está disponible.', driver: 'Vos manejás ese auto.', has_car: 'Ya tenés tu propio auto en este plan.',
  seats: 'Hay más pasajeros que lugares. Primero sacá a alguien.', gone: 'Eso ya no existe.', session: 'Se venció tu sesión. Volvé a entrar.',
}
export const planErr = (e) => ERR2[errOf(e)] || errText(errOf(e))

export function usePlans(groupId, enabled = true) {
  const [st, setSt] = useState({ plans: null, me: null, role: null }) // plans null = cargando
  const [busy, setBusy] = useState(0)
  const [err, setErr] = useState('')
  const alive = useRef(true)
  const seq = useRef(0)
  useEffect(() => () => { alive.current = false }, [])

  const load = useCallback(async () => {
    if (!enabled) return
    const n = ++seq.current
    try {
      const r = await call('tpn_plans_list', { p_group: groupId })
      if (alive.current && n === seq.current) { setSt(r); setErr('') }
    } catch (e) { if (alive.current) setErr(planErr(e)) }
  }, [groupId, enabled])

  useEffect(() => {
    load()
    const tick = () => document.visibilityState === 'visible' && load()
    const t = setInterval(tick, 20000)
    addEventListener('tpn-changed', load); addEventListener('online', tick); document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(t); removeEventListener('tpn-changed', load); removeEventListener('online', tick); document.removeEventListener('visibilitychange', tick) }
  }, [load])

  // Hace un cambio en el servidor y recién cuando confirma pisa ese plan con lo que devolvió. Devuelve true si salió bien.
  const act = useCallback(async (fn, args) => {
    setBusy((b) => b + 1); setErr('')
    try {
      const r = await call(fn, args)
      seq.current++ // una lectura que venía en camino quedó vieja
      if (alive.current) setSt((s) => ({ ...s, plans: r?.deleted ? (s.plans || []).filter((p) => p.id !== r.deleted) : upsert(s.plans || [], r) }))
      return true
    } catch (e) { const m = planErr(e); await load(); if (alive.current) setErr(m); return false } finally { if (alive.current) setBusy((b) => b - 1) }
  }, [load])

  return { ...st, gid: groupId, busy: busy > 0, err, clearErr: () => setErr(''), act, reload: load,
    // atajos
    savePlan: (plan, data) => act('tpn_plan_save', { p_group: groupId, p_plan: plan, p_data: data }),
    delPlan: (plan) => act('tpn_plan_delete', { p_plan: plan }),
    rsvp: (plan, a) => act('tpn_rsvp', { p_plan: plan, p_answer: a }),
    saveCar: (plan, car, data) => act('tpn_car_save', { p_plan: plan, p_car: car, p_data: data }),
    car: (car, action, member = null) => act('tpn_car_do', { p_car: car, p_action: action, p_member: member }),
    saveItem: (plan, item, data) => act('tpn_item_save', { p_plan: plan, p_item: item, p_data: data }),
    delItem: (item) => act('tpn_item_delete', { p_item: item }),
    comment: (plan, body) => act('tpn_comment_add', { p_plan: plan, p_body: body }),
    delComment: (c) => act('tpn_comment_delete', { p_comment: c }),
  }
}

const upsert = (list, p) => (list.some((x) => x.id === p.id) ? list.map((x) => (x.id === p.id ? p : x)) : [...list, p])

export const STATUS = { org: 'En organización', conf: 'Confirmado', done: 'Terminado', canc: 'Cancelado' }
export const ITEM = { pend: 'Pendiente', enc: 'Encargado', comp: 'Comprado' }
export const ANS = { si: 'Voy', capaz: 'Capaz', no: 'No voy' }

const DAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
export const dayLabel = (d) => {
  if (!d) return 'Día a definir'
  const [y, m, dd] = d.split('-').map(Number)
  return `${DAYS[new Date(y, m - 1, dd).getDay()]} ${dd}/${m}`
}
// Activos primero (por fecha, sin fecha al final); terminados y cancelados aparte.
export const split = (plans) => {
  const live = (plans || []).filter((p) => p.status === 'org' || p.status === 'conf')
  return { live, past: (plans || []).filter((p) => p.status === 'done' || p.status === 'canc') }
}
