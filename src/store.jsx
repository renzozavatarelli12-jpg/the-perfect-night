// Único lugar que guarda datos. Con la nube prendida: Supabase (src/sync.js + src/cloud.js). Si no: localStorage como siempre.
import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react'
import { seed } from './data/seed'
import { groupApi, listen } from './cloud'
import { createEngine } from './sync'

const KEY = 'tpn-v1'
const Ctx = createContext()
const load = (k) => { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } }

// Lo que había en este celu antes de la nube. Nunca se borra (sirve de respaldo).
export const localData = () => ({ ...seed(), ...load(KEY) })

function LocalStore({ children }) {
  const [data, setData] = useState(() => {
    const d = localData()
    // shortcut: boliche nuevo del seed (Argento) se suma una sola vez a los datos ya guardados; el próximo, repetir con otro id.
    if (!d.boliches.some((b) => b.id === 'b5') && !localStorage.getItem(KEY + '-b5')) d.boliches = [...d.boliches, seed().boliches.find((b) => b.id === 'b5')]
    localStorage.setItem(KEY + '-b5', '1')
    return d
  })
  const [me, setMe] = useState(() => load(KEY + '-me'))
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(data)) }, [data])
  useEffect(() => { localStorage.setItem(KEY + '-me', JSON.stringify(me)) }, [me])

  // update('boliches', lista) o update('boliches', (lista) => nuevaLista)
  const update = (key, v) => setData((d) => ({ ...d, [key]: typeof v === 'function' ? v(d[key]) : v }))
  const reset = () => setData(seed())
  const replaceAll = (d, m) => { setData(d); setMe(m) }

  return <Ctx.Provider value={{ data, update, me, setMe, reset, replaceAll }}>{children}</Ctx.Provider>
}

// Arranque de un grupo nuevo: boliches, tragos y preguntas genéricas (sin chistes internos de otro grupo).
export const starter = () => { const s = seed(); return { boliches: s.boliches, favDrinks: s.favDrinks, probable: s.probable, quien: s.quien.filter((q) => q.cat !== 'Humor interno') } }

// Cada grupo tiene su motor y su copia en este celu. El grupo de antes de los grupos (mismo canal) sigue usando la copia vieja.
const engines = new Map()
export const prefixOf = (g) => (load('tpn-v2-topic') === g.topic ? 'tpn-v2' : 'tpn-g-' + g.id)
function engineFor(g) {
  const k = g.id + (g.role === 'legacy' ? ':viejo' : '') // celu viejo confirmado: motor nuevo (otras funciones), misma copia
  if (!engines.has(k)) engines.set(k, createEngine({ api: groupApi(g.id, g.role === 'legacy'), ls: localStorage, prefix: prefixOf(g) }))
  return engines.get(k)
}

export function GroupStore({ group, onLost, children }) {
  const eng = engineFor(group)
  const { data, st } = useSyncExternalStore(eng.subscribe, eng.get)
  const meKey = 'tpn-me-' + group.id
  const [me, setMe] = useState(() => load(meKey) ?? (prefixOf(group) === 'tpn-v2' ? load(KEY + '-me') : null) ?? group.member_id)
  useEffect(() => { localStorage.setItem(meKey, JSON.stringify(me)) }, [me, meKey])

  useEffect(() => {
    if (st.needJoin) return void onLost?.()
    const tick = () => document.visibilityState === 'visible' && eng.sync()
    eng.sync()
    const t = setInterval(tick, 20000) // red de seguridad si el aviso en tiempo real no llega
    addEventListener('online', tick); document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(t); removeEventListener('online', tick); document.removeEventListener('visibilitychange', tick) }
  }, [st.needJoin, eng, onLost])
  useEffect(() => (st.topic && !st.needJoin ? listen(st.topic, () => eng.pull()) : undefined), [st.topic, st.needJoin, eng])
  // grupo recién creado: se cargan los boliches y preguntas de arranque, una sola vez
  useEffect(() => {
    const k = 'tpn-seed-' + group.id
    if (st.loaded && localStorage.getItem(k)) { eng.importRows(eng.offer(starter(), {}).add); localStorage.removeItem(k) }
  }, [st.loaded, eng, group.id])

  // Suma al grupo lo de una copia o de este celu, sin pisar nada. Devuelve { added, clash }.
  const merge = (d) => { const o = eng.offer(d, seed()); eng.importRows(o.add); return { added: o.add.size, clash: o.clash } }
  // ¿Puedo votar / editar como este perfil? Sí: el mío, invitados y perfiles que nadie tomó (o soy admin). El servidor lo controla igual.
  const canAct = (id) => group.role === 'admin' || id === group.member_id || !(group.bound || []).includes(id)
  const value = { data, update: eng.update, me, setMe, online: true, sync: st, eng, merge, replaceAll: (d) => merge(d), group, canAct, legacyCopy: prefixOf(group) === 'tpn-v2' }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const LocalStoreProvider = LocalStore
export const useStore = () => useContext(Ctx)
