// Arriba de "Grupo": portada, nombre y descripción. Para admins: invitaciones, solicitudes e integrantes con acceso.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Copy, MessageCircle } from 'lucide-react'
import { useAccount, errOf, errText } from '../account'
import { call, inviteUrl } from '../cloud'
import { useStore } from '../store'
import { useConfirm } from './Confirm'
import FormSheet from './FormSheet'

function Share({ url, text }) {
  const [ok, setOk] = useState(false)
  return (
    <div className="row" style={{ flexWrap: 'wrap' }}>
      <button className="btn sm" onClick={async () => { try { await navigator.clipboard.writeText(url); setOk(true) } catch { prompt('Copiá el link:', url) } }}><Copy size={14} /> {ok ? 'Copiado ✓' : 'Copiar link'}</button>
      <a className="btn ghost sm" href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`} target="_blank" rel="noreferrer"><MessageCircle size={14} /> WhatsApp</a>
    </div>
  )
}

export function GroupHead() {
  const a = useAccount(), g = a.group
  const [edit, setEdit] = useState(false)
  return (
    <section className="sec ghead">
      {g.cover && <img className="cover" src={g.cover} alt="" />}
      <div className="row">
        <span className="grow"><b style={{ fontSize: 20 }}>{g.name}</b>{g.descr && <span className="muted" style={{ display: 'block' }}>{g.descr}</span>}</span>
        <span className="tag">{g.role === 'admin' ? 'Admin' : 'Integrante'}</span>
        {g.role === 'admin' && <button className="btn ghost sm" onClick={() => setEdit(true)}>Editar</button>}
      </div>
      <p className="note">Grupo privado: solo entra quien tiene una invitación o a quien acepta un admin.</p>
      {edit && createPortal(<FormSheet title="Editar grupo" initial={{ name: g.name, descr: g.descr, cover: g.cover }}
        fields={[{ name: 'name', label: 'Nombre', required: true }, { name: 'descr', label: 'Descripción', type: 'textarea' }, { name: 'cover', label: 'Foto del grupo', type: 'photo' }]}
        onSave={(v) => a.saveGroup(g.id, v.name.trim(), (v.descr || '').trim(), v.cover || '')} onClose={() => setEdit(false)} />, document.body)}
    </section>
  )
}

export function Admin() {
  const a = useAccount(), g = a.group
  const { data } = useStore()
  const ask = useConfirm()
  const [st, setSt] = useState(null)
  const [err, setErr] = useState(null)
  const [made, setMade] = useState(null) // invitación recién creada: { url, label }
  const [forWho, setForWho] = useState('')
  const run = async (f) => { setErr(null); try { const r = await f(); if (r?.invites) setSt(r); a.refresh() } catch (e) { setErr(errOf(e)) } }
  const reload = () => run(() => call('tpn_admin', { p_group: g.id }))
  useEffect(() => { if (g.role === 'admin') reload() }, [g.id, g.role]) // eslint-disable-line react-hooks/exhaustive-deps
  if (g.role !== 'admin') return null
  if (!st) return <section className="sec"><h2>Administrar</h2><p className="muted">{err ? errText(err) : 'Cargando…'}</p></section>
  const prof = (id) => data.members.find((m) => m.id === id)?.name
  const invite = (single) => run(async () => {
    const label = forWho ? prof(forWho) : single ? 'Un uso' : 'Varios usos'
    const r = await call('tpn_invite', { p_group: g.id, p_single: single, p_role: 'member', p_member: forWho || null, p_label: label })
    setMade({ url: inviteUrl(r.code), label: forWho ? label : '', single }); setForWho('')
    return call('tpn_admin', { p_group: g.id })
  })
  const active = st.invites.filter((i) => !i.revoked && !i.used)
  return (
    <section className="sec admin">
      <h2>Administrar</h2>
      {err && <p className="small err" role="alert">{errText(err)}</p>}

      <h3>Invitar</h3>
      <label className="small muted">Para
        <select value={forWho} onChange={(e) => setForWho(e.target.value)} style={{ marginTop: 6 }}>
          <option value="">Alguien nuevo (elige su nombre)</option>
          {data.members.filter((m) => !m.guest).map((m) => <option key={m.id} value={m.id}>{m.name}{st.members.some((x) => x.member_id === m.id) ? ' (celu nuevo / recuperar)' : ''}</option>)}
        </select>
      </label>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button className="btn sm" onClick={() => invite(true)}>Link de un solo uso</button>
        {!forWho && <button className="btn ghost sm" onClick={() => invite(false)}>Link para varios</button>}
      </div>
      {made && <div className="made">
        <p className="small">{made.single ? 'Sirve una sola vez' : 'Sirve para varios, hasta que lo revoques'}{made.label ? ` · ${made.label}` : ''}. Solo se muestra ahora: mandalo ya.</p>
        <Share url={made.url} text={`Sumate a ${g.name} en The Perfect Night:`} />
      </div>}

      <h3>Link para pedir entrar</h3>
      <p className="note">Quien lo abra puede pedir entrar; no entra hasta que un admin lo acepte.</p>
      <Share url={inviteUrl(st.request_code)} text={`Pedí entrar a ${g.name} en The Perfect Night:`} />

      <h3>Solicitudes {st.requests.length > 0 && <span className="badge">{st.requests.length}</span>}</h3>
      {!st.requests.length && <p className="muted small">No hay pedidos.</p>}
      {st.requests.map((q) => (
        <div className="li" key={q.id}>
          <span className="grow"><b>{q.name}</b>{q.member_id && <span className="muted small" style={{ display: 'block' }}>Dice ser {prof(q.member_id) || q.name}: aceptá solo si sabés que es esa persona</span>}</span>
          <button className="btn sm" onClick={() => run(() => call('tpn_decide', { p_request: q.id, p_accept: true, p_member: null }))}>Aceptar</button>
          <button className="btn ghost sm" onClick={() => run(() => call('tpn_decide', { p_request: q.id, p_accept: false, p_member: null }))}>Rechazar</button>
        </div>
      ))}

      <h3>Invitaciones activas</h3>
      {!active.length && <p className="muted small">Ninguna.</p>}
      {active.map((i) => (
        <div className="li" key={i.id}>
          <span className="grow">{i.label || 'Invitación'}<span className="muted small" style={{ display: 'block' }}>{i.single ? 'Un uso' : `Varios usos · ${i.uses} ${i.uses === 1 ? 'entró' : 'entraron'}`}{i.role === 'admin' ? ' · como admin' : ''}</span></span>
          <button className="btn ghost sm" onClick={async () => (await ask('¿Revocar esta invitación? El link deja de servir. Los que ya entraron siguen adentro.', 'Revocar')) && run(() => call('tpn_revoke', { p_invite: i.id }))}>Revocar</button>
        </div>
      ))}

      {st.legacy > 0 && <>
        <h3>Celus con el código viejo</h3>
        <p className="note">{st.legacy} {st.legacy === 1 ? 'celu entra' : 'celus entran'} con el código de antes sin haber confirmado quién {st.legacy === 1 ? 'es' : 'son'}. Cuando estén todos, cortales el acceso (los datos quedan).</p>
        <button className="btn ghost sm" onClick={async () => (await ask('¿Cortar el acceso de los celus que entran con el código viejo? Van a necesitar una invitación nueva.', 'Cortar')) && run(() => call('tpn_legacy_cut', { p_group: g.id }))}>Cortar acceso</button>
      </>}

      <h3>Con acceso</h3>
      {st.members.map((m) => (
        <div className="li" key={m.user_id}>
          <span className="grow"><b>{prof(m.member_id) || m.name}</b><span className="muted small" style={{ display: 'block' }}>{m.role === 'admin' ? 'Admin' : 'Integrante'}{m.user_id === a.me.user.id ? ' · vos' : ''}</span></span>
          <button className="btn ghost sm" onClick={() => run(() => call('tpn_set_member', { p_group: g.id, p_user: m.user_id, p_role: m.role === 'admin' ? 'member' : 'admin' }))}>{m.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}</button>
          {m.user_id !== a.me.user.id && <button className="btn ghost sm" onClick={async () => (await ask(`¿Sacar a ${prof(m.member_id) || m.name} del grupo? Deja de tener acceso; su perfil y sus estadísticas quedan.`, 'Sacar')) && run(() => call('tpn_set_member', { p_group: g.id, p_user: m.user_id, p_role: 'remove' }))}>Sacar</button>}
        </div>
      ))}
    </section>
  )
}
