// Único lugar que guarda datos. Hoy: localStorage. Mañana: Supabase (reemplazar acá y listo).
import { createContext, useContext, useEffect, useState } from 'react'
import { seed } from './data/seed'

const KEY = 'tpn-v1'
const Ctx = createContext()
const load = (k) => { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } }

export function StoreProvider({ children }) {
  const [data, setData] = useState(() => {
    const d = { ...seed(), ...load(KEY) }
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
export const useStore = () => useContext(Ctx)
