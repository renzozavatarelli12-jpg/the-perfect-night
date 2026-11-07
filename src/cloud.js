// Conexión con Supabase sin librerías: funciones del servidor (tpn_*) y un aviso en tiempo real.
// La clave publicable está hecha para estar en la web: sola no puede leer ni escribir nada (todo pide una sesión).
const URL_ = import.meta.env?.VITE_SUPABASE_URL || 'https://xcligofglpsrtruziqea.supabase.co'
const KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_-MXl3P_DU9WYK76gOr2nvQ_gVHO1Ao5'
const T = 'tpn-v2-token'

// Versión compartida prendida para todos (con ON = false, solo se prendía por celu con ?nube=1 o con un link).
const ON = true
const ls = (() => { try { return localStorage } catch { return null } })()
const q = new URLSearchParams(location.search)
if (q.has('nube')) ls?.setItem('tpn-cloud', q.get('nube'))
// Link de invitación / para pedir entrar: #i=CODIGO (los viejos #g=CODIGO también). El código no queda en la barra.
export const linkCode = decodeURIComponent(location.hash.match(/[#&][ig]=([^&]+)/)?.[1] || '')
if (linkCode) { ls?.setItem('tpn-cloud', '1'); history.replaceState(null, '', location.pathname + location.search) }
export const ONLINE = ON || ls?.getItem('tpn-cloud') === '1'
export const inviteUrl = (code) => `${location.origin}${import.meta.env?.BASE_URL ?? '/'}#i=${code}`

async function rpc(fn, body) {
  const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const j = await r.json().catch(() => null)
  if (!r.ok) throw Object.assign(new Error(j?.message || 'HTTP ' + r.status), { code: j?.message })
  return j
}

export const token = () => ls?.getItem(T)
export const setToken = (t) => (t ? ls?.setItem(T, t) : ls?.removeItem(T))
// Llama una función del servidor con la sesión de este celu.
export const call = (fn, args = {}) => rpc(fn, { p_token: token(), ...args })
export const callPub = (fn, args) => rpc(fn, args) // sin sesión (mirar un link, entrar desde otro celu)

// Lo que necesita src/sync.js para un grupo.
// legacy = celu que entró con el código viejo y todavía no tiene persona confirmada: usa las funciones de siempre.
export const groupApi = (gid, legacy) => ({
  token,
  logout: () => setToken(null),
  join: async () => ({}),
  pull: (since) => (legacy ? call('tpn_pull', { p_since: since }) : call('tpn_gpull', { p_group: gid, p_since: since })),
  push: (changes) => (legacy ? call('tpn_push', { p_changes: changes }) : call('tpn_gpush', { p_group: gid, p_changes: changes })),
})

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
