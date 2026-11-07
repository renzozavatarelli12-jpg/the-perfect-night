// Único lugar que guarda datos. Con la nube prendida: Supabase (src/sync.js + src/cloud.js). Si no: localStorage como siempre.
import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react'
import { seed } from './data/seed'
import { ONLINE, api, listen } from './cloud'
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

let eng
function CloudStore({ children }) {
  eng ||= createEngine({ api, ls: localStorage })
  const { data, st } = useSyncExternalStore(eng.subscribe, eng.get)
  const [me, setMe] = useState(() => load(KEY + '-me'))
  useEffect(() => { localStorage.setItem(KEY + '-me', JSON.stringify(me)) }, [me])

  useEffect(() => {
    if (st.needJoin) return
    const tick = () => document.visibilityState === 'visible' && eng.sync()
    eng.sync()
    const t = setInterval(tick, 20000) // red de seguridad si el aviso en tiempo real no llega
    addEventListener('online', tick); document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(t); removeEventListener('online', tick); document.removeEventListener('visibilitychange', tick) }
  }, [st.needJoin])
  useEffect(() => (st.topic && !st.needJoin ? listen(st.topic, () => eng.pull()) : undefined), [st.topic, st.needJoin])

  // Suma al grupo lo de una copia o de este celu, sin pisar nada. Devuelve { added, clash }.
  const merge = (d) => { const o = eng.offer(d, seed()); eng.importRows(o.add); return { added: o.add.size, clash: o.clash } }
  const value = { data, update: eng.update, me, setMe, online: true, sync: st, eng, merge, replaceAll: (d) => merge(d) }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const StoreProvider = ONLINE ? CloudStore : LocalStore
export const useStore = () => useContext(Ctx)
