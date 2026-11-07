// Quién es este celu (persona) y en qué grupos está. Sin email ni contraseña: la sesión queda guardada en el celu.
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { call, callPub, token, setToken, linkCode } from './cloud'

const Ctx = createContext()
const load = (k) => { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } }
const save = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)) } catch { /* sin espacio */ } }
export const errOf = (e) => (e?.code || '').replace(/^tpn_/, '') || 'net'
export const ERR = {
  code: 'Ese link o código no existe. Fijate que esté bien copiado.',
  used: 'Esa invitación ya se usó o la revocaron. Pedí una nueva.',
  rate: 'Demasiados intentos. Esperá 15 minutos y probá de nuevo.',
  taken: 'Ese perfil ya lo tomó otra persona. Elegí otro o entrá como nuevo.',
  name: 'Poné tu nombre (hasta 40 letras).',
  full: 'Llegaron al límite. Probá más tarde.',
  last_admin: 'Tiene que quedar al menos un admin en el grupo.',
  forbidden: 'No tenés permiso para eso.',
  invalid: 'Algo de lo que pusiste no es válido.',
  net: 'No hay conexión. Probá de nuevo en un rato.',
}
export const errText = (e) => ERR[e] || ERR.net
// Saca el código de un link pegado (…#i=CODIGO) o lo toma tal cual.
export const codeFrom = (s) => decodeURIComponent((s || '').match(/[#&][ig]=([^&\s]+)/)?.[1] || (s || '').trim())

export function AccountProvider({ children }) {
  const [me, setMeRaw] = useState(() => (token() ? load('tpn-me') : null)) // { user, groups, pending }
  const [status, setStatus] = useState(() => (!token() ? 'none' : load('tpn-me') ? 'ok' : 'loading'))
  const [legacy, setLegacy] = useState(null) // sesión de antes de los grupos: { group, topic, profiles }
  const [link, setLink] = useState(linkCode ? { code: linkCode } : null)
  const [cur, setCurRaw] = useState(() => load('tpn-cur'))
  const setMe = (m) => { setMeRaw(m); save('tpn-me', m); setStatus('ok') }
  const setCur = (g) => { setCurRaw(g); save('tpn-cur', g) }
  const done = (r) => { if (r.token) setToken(r.token); if (r.me) setMe(r.me); if (r.group) setCur(r.group) }
  const fail = async (f) => { try { return await f() } catch (e) { return errOf(e) } }

  const refresh = useCallback(async () => {
    if (!token()) { setMeRaw(null); setStatus('none'); return }
    try {
      const r = await call('tpn_me')
      if (r.legacy) { setLegacy(r.legacy); setStatus('legacy') } else { setMeRaw(r); save('tpn-me', r); setStatus('ok') }
    } catch (e) {
      if (e.code === 'tpn_session') { setToken(null); save('tpn-me', null); setMeRaw(null); setStatus('none') }
      else setStatus((s) => (s === 'loading' ? 'offline' : s)) // sin conexión: se sigue con lo último que bajó
    }
  }, [])
  useEffect(() => {
    refresh()
    const f = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', f); addEventListener('online', f)
    return () => { document.removeEventListener('visibilitychange', f); removeEventListener('online', f) }
  }, [refresh])

  // Link abierto o pegado: primero se mira qué es (invitación o pedir entrar).
  useEffect(() => {
    if (!link || link.peek || link.err) return
    callPub('tpn_peek', { p_code: link.code })
      .then((r) => setLink((l) => (l?.code === link.code ? (r.error ? { ...l, err: r.error } : { ...l, peek: r }) : l)))
      .catch((e) => setLink((l) => (l?.code === link.code ? { ...l, err: errOf(e) } : l)))
  }, [link])

  const value = {
    me, status, legacy, link, refresh,
    group: status === 'legacy' && legacy ? { id: legacy.id, name: legacy.group, topic: legacy.topic, role: 'legacy', member_id: null, bound: [], descr: '', cover: '', requests: 0 }
      : me?.groups.find((g) => g.id === cur) || me?.groups[0] || null,
    setCur,
    openLink: (s) => setLink({ code: codeFrom(s) }),
    closeLink: () => setLink(null),
    accept: (member, name) => fail(async () => {
      const r = await call('tpn_accept', { p_code: link.code, p_member: member, p_name: name })
      if (r.error) return r.error
      done(r)
      if (r.pending) setLink((l) => ({ ...l, sent: true })); else setLink(null)
      return null
    }),
    request: (name) => fail(async () => {
      const r = await call('tpn_request', { p_code: link.code, p_name: name })
      if (r.error) return r.error
      done(r); setLink((l) => ({ ...l, sent: true })); return null
    }),
    claim: (member, name) => fail(async () => {
      const r = await call('tpn_claim', { p_member: member, p_name: name })
      if (r.me) { setMe(r.me); setLegacy(null) } else await refresh() // "soy tal": queda esperando al admin, mientras sigue entrando como antes
      return null
    }),
    createGroup: (name, descr) => fail(async () => {
      const r = await call('tpn_group_new', { p_name: name, p_descr: descr })
      localStorage.setItem('tpn-seed-' + r.group, '1') // al abrirlo se cargan boliches y preguntas de arranque
      done(r); return null
    }),
    saveGroup: (g, name, descr, cover) => fail(async () => { setMe(await call('tpn_group_save', { p_group: g, p_name: name, p_descr: descr, p_cover: cover })); return null }),
    deviceUse: (code) => fail(async () => { const r = await callPub('tpn_device_use', { p_code: code.trim() }); if (r.error) return r.error; done(r); return null }),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export const useAccount = () => useContext(Ctx)
