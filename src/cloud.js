// Conexión con Supabase sin librerías: 3 funciones (tpn_join / tpn_pull / tpn_push) y un aviso en tiempo real.
// La clave publicable está hecha para estar en la web: sola no puede leer ni escribir nada (todo pide la sesión del grupo).
const URL_ = import.meta.env?.VITE_SUPABASE_URL || 'https://xcligofglpsrtruziqea.supabase.co'
const KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_-MXl3P_DU9WYK76gOr2nvQ_gVHO1Ao5'
const T = 'tpn-v2-token'

// Versión compartida prendida para todos (con ON = false, solo se prendía por celu con ?nube=1 o el link de invitación #g=código).
const ON = true
const ls = (() => { try { return localStorage } catch { return null } })()
const q = new URLSearchParams(location.search)
if (q.has('nube')) ls?.setItem('tpn-cloud', q.get('nube'))
export const invite = decodeURIComponent(location.hash.match(/[#&]g=([^&]+)/)?.[1] || '')
if (invite) { ls?.setItem('tpn-cloud', '1'); history.replaceState(null, '', location.pathname + location.search) } // el código no queda en la barra
export const ONLINE = ON || ls?.getItem('tpn-cloud') === '1'

async function rpc(fn, body) {
  const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const j = await r.json().catch(() => null)
  if (!r.ok) throw Object.assign(new Error(j?.message || 'HTTP ' + r.status), { code: j?.message })
  return j
}

export const api = {
  token: () => ls?.getItem(T),
  logout: () => ls?.removeItem(T),
  async join(code) {
    try {
      const r = await rpc('tpn_join', { p_code: code })
      if (r.token) ls.setItem(T, r.token)
      return r
    } catch { return { error: 'net' } }
  },
  pull: (since) => rpc('tpn_pull', { p_token: api.token(), p_since: since }),
  push: (changes) => rpc('tpn_push', { p_token: api.token(), p_changes: changes }),
}

// Aviso "cambió algo" (Supabase Realtime, protocolo Phoenix). Si se corta, reconecta; mientras tanto el chequeo periódico cubre.
export function listen(topic, onChange) {
  let ws, hb, stop = false, wait = 1000, ref = 0
  const send = (m) => ws.readyState === 1 && ws.send(JSON.stringify({ ...m, ref: String(++ref) }))
  const open = () => {
    ws = new WebSocket(`${URL_.replace('http', 'ws')}/realtime/v1/websocket?apikey=${KEY}&vsn=1.0.0`)
    ws.onopen = () => {
      wait = 1000
      send({ topic: 'realtime:' + topic, event: 'phx_join', payload: { config: { broadcast: { self: false }, presence: { key: '' }, postgres_changes: [], private: false } } })
      hb = setInterval(() => send({ topic: 'phoenix', event: 'heartbeat', payload: {} }), 25000)
      onChange() // por si cambió algo mientras no estaba conectado
    }
    ws.onmessage = (e) => { try { if (JSON.parse(e.data).event === 'broadcast') onChange() } catch { /* mensaje raro: se ignora */ } }
    ws.onclose = () => { clearInterval(hb); if (!stop) setTimeout(open, (wait = Math.min(wait * 2, 30000))) }
  }
  open()
  return () => { stop = true; clearInterval(hb); ws.close() }
}
