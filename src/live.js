// Datos que viven solo en el servidor (fichas de boliches, rankings, juegos): se piden, se muestran y se recargan
// cuando alguien cambia algo (aviso en tiempo real, volver a la app o cada 20 s). Nada se da por guardado hasta que el servidor responde.
import { useCallback, useEffect, useRef, useState } from 'react'
import { call } from './cloud'
import { planErr } from './plans'

const MSG = { dup: 'Eso ya estaba anotado.', closed: 'Esa temporada o partida ya está cerrada.', seen: 'Eso ya se vio una vez: solo lo puede ver esa persona en su celu.' }
export const liveErr = (e) => MSG[(e?.code || '').replace(/^tpn_/, '')] || planErr(e)

export function useLive(fn, args, enabled = true) {
  const [v, setV] = useState(null) // null = cargando
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(0)
  const key = JSON.stringify(args)
  const seq = useRef(0)
  const load = useCallback(async () => {
    if (!enabled) return
    const n = ++seq.current
    try { const r = await call(fn, JSON.parse(key)); if (n === seq.current) { setV(r); setErr('') } } catch (e) { if (n === seq.current) setErr(liveErr(e)) }
  }, [fn, key, enabled])
  useEffect(() => {
    load()
    const tick = () => document.visibilityState === 'visible' && load()
    const t = setInterval(tick, 20000)
    addEventListener('tpn-changed', load); document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(t); removeEventListener('tpn-changed', load); document.removeEventListener('visibilitychange', tick) }
  }, [load])
  // Cambia algo en el servidor y recarga. Devuelve la respuesta, o null si falló (con el error a la vista).
  const act = useCallback(async (f, a) => {
    setBusy((b) => b + 1); setErr('')
    try { const r = await call(f, a); await load(); return r || true } catch (e) { const m = liveErr(e); await load(); setErr(m); return null } finally { setBusy((b) => b - 1) }
  }, [load])
  return { v, err, busy: busy > 0, act, reload: load, setErr }
}
