// Pantallas de entrada (invitación, pedir entrar, elegir quién sos, otro celu) y el selector de grupos.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, X } from 'lucide-react'
import { useAccount, errText } from '../account'
import { GroupStore } from '../store'
import { call } from '../cloud'

function Screen({ title, lead, children, cover }) {
  return (
    <main className="wrap join">
      <p className="logo">the perfect night<i>.</i></p>
      {cover && <img className="cover" src={cover} alt="" />}
      <h1>{title}</h1>
      {lead && <p className="lead">{lead}</p>}
      {children}
    </main>
  )
}
const Err = ({ e }) => (e ? <p className="small err" role="alert" style={{ marginTop: 10 }}>{errText(e)}</p> : null)

// Elegir un perfil libre del grupo o entrar como alguien nuevo.
function Pick({ profiles, defName = '', label, onGo, fixed }) {
  const [sel, setSel] = useState(fixed ? 'fixed' : profiles.length ? null : 'new')
  const [name, setName] = useState(defName)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const go = async (e) => {
    e.preventDefault()
    if (busy || !sel || (sel === 'new' && !name.trim())) return
    setBusy(true); setErr(null)
    const r = await onGo(sel === 'new' || sel === 'fixed' ? null : sel, name.trim())
    setBusy(false); setErr(r)
  }
  return (
    <form onSubmit={go} style={{ display: 'grid', gap: 12 }}>
      {profiles.length > 0 && <>
        <span className="muted small">¿Quién sos?</span>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          {profiles.map((p) => <button type="button" key={p.id} className={`pill ${sel === p.id ? 'on' : ''}`} onClick={() => setSel(p.id)}>{p.name}</button>)}
          <button type="button" className={`pill ${sel === 'new' ? 'on' : ''}`} onClick={() => setSel('new')}>Soy nuevo/a</button>
        </div>
      </>}
      {sel === 'new' && <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" aria-label="Tu nombre" maxLength={40} />}
      <button className="btn" disabled={busy || !sel}>{busy ? 'Un momento…' : label}</button>
      <Err e={err} />
    </form>
  )
}

function LinkScreen() {
  const a = useAccount(), l = a.link, p = l.peek
  const back = <button className="btn ghost" style={{ marginTop: 16 }} onClick={a.closeLink}>Volver</button>
  if (l.err) return <Screen title="Ese link no sirve" lead={errText(l.err)}>{back}</Screen>
  if (!p) return <Screen title="Mirando la invitación…" />
  const g = p.group
  if (l.sent && p.kind === 'invite') return <Screen title="Listo, pedido enviado" lead={`Un admin de ${g.name} tiene que confirmar que sos vos. Cuando lo haga, vas a ver el grupo acá.`} cover={g.cover}>{back}</Screen>
  if (p.kind === 'request') {
    if (l.sent) return <Screen title="Listo, pedido enviado" lead={`Cuando un admin de ${g.name} te acepte, vas a ver el grupo acá.`} cover={g.cover}>{back}</Screen>
    return (
      <Screen title={`Pedir entrar a ${g.name}`} lead={g.descr || 'Un admin del grupo tiene que aceptarte.'} cover={g.cover}>
        <Pick profiles={[]} defName={a.me?.user.name} label="Pedir entrar" onGo={(_, n) => a.request(n)} />
        {back}
      </Screen>
    )
  }
  return (
    <Screen title={`Te invitaron a ${g.name}`} lead={g.descr || (p.role === 'admin' ? 'Entrás como admin.' : null)} cover={g.cover}>
      {p.member
        ? <Pick profiles={[]} fixed label={`Entrar como ${p.member.name}`} onGo={() => a.accept(null, null)} />
        : <Pick profiles={p.profiles} defName={a.me?.user.name} label="Entrar" onGo={a.accept} />}
      {back}
    </Screen>
  )
}

// Link de invitación/de admin y código de otro celu (sirve para volver a entrar si este celu se olvidó de quién sos).
function HaveLink() {
  const a = useAccount()
  const [code, setCode] = useState('')
  const [dev, setDev] = useState('')
  const [err, setErr] = useState(null)
  return (
    <>
      <form className="add" onSubmit={(e) => { e.preventDefault(); code.trim() && a.openLink(code) }}>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Pegá el link o el código" aria-label="Link o código de invitación" autoCapitalize="none" autoCorrect="off" spellCheck="false" />
        <button className="btn">Seguir</button>
      </form>
      <p className="muted small" style={{ marginTop: 28 }}>¿Ya usás la app en otro celu? Ahí, en el menú del grupo, tocá “Usar en otro celu” y poné acá el código.</p>
      <form className="add" onSubmit={async (e) => { e.preventDefault(); dev.trim() && setErr(await a.deviceUse(dev)) }}>
        <input value={dev} onChange={(e) => { setDev(e.target.value); setErr(null) }} placeholder="Código de 8 letras" aria-label="Código de otro celu" autoCapitalize="characters" autoCorrect="off" spellCheck="false" maxLength={12} />
        <button className="btn ghost">Entrar</button>
      </form>
      <Err e={err} />
    </>
  )
}

function Welcome() {
  return (
    <Screen title="¿Sos de un grupo?" lead="Para entrar necesitás el link de invitación que te pasa alguien del grupo.">
      <HaveLink />
    </Screen>
  )
}

// Celu que entró con el código viejo: elige una vez quién es. Si dice ser alguien que ya existe, lo confirma un admin;
// mientras tanto (o si toca "Después") sigue usando la app como siempre.
function Claim({ onLater }) {
  const a = useAccount(), l = a.legacy
  return (
    <Screen title="¿Quién sos?" lead={`Ahora cada uno tiene su lugar en ${l.group}. Elegí tu nombre: un admin confirma que sos vos.`}>
      <Pick profiles={l.profiles} label="Listo" onGo={a.claim} />
      <button className="btn ghost" style={{ marginTop: 12 }} onClick={onLater}>Después</button>
      <p className="note" style={{ marginTop: 14 }}>¿No aparece tu nombre? Ya lo eligió alguien: usá tu link personal o el código de otro celu.</p>
      <HaveLink />
    </Screen>
  )
}

function NewGroup({ onDone }) {
  const a = useAccount()
  const [name, setName] = useState('')
  const [descr, setDescr] = useState('')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  return (
    <form style={{ display: 'grid', gap: 10 }} onSubmit={async (e) => {
      e.preventDefault(); if (!name.trim() || busy) return
      setBusy(true); const r = await a.createGroup(name.trim(), descr.trim()); setBusy(false); setErr(r); if (!r) onDone?.()
    }}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del grupo" aria-label="Nombre del grupo" maxLength={40} />
      <input value={descr} onChange={(e) => setDescr(e.target.value)} placeholder="Descripción (opcional)" aria-label="Descripción" maxLength={300} />
      <button className="btn" disabled={busy}>{busy ? 'Creando…' : 'Crear grupo'}</button>
      <Err e={err} />
    </form>
  )
}

function Pending() {
  const p = useAccount().me?.pending || []
  return p.map((x, i) => <p key={i} className="note">{x.status === 'pending' ? `Pediste entrar a ${x.group}${x.as ? ` como ${x.as}` : ''}: falta que un admin confirme.` : `${x.group} no aceptó tu pedido.`}</p>)
}

function NoGroups() {
  const a = useAccount()
  const [code, setCode] = useState('')
  return (
    <Screen title={`Hola, ${a.me.user.name}`} lead="Todavía no estás en ningún grupo.">
      <Pending />
      <h2 style={{ marginTop: 24 }}>Tengo un link</h2>
      <form className="add" onSubmit={(e) => { e.preventDefault(); code.trim() && a.openLink(code) }}>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Pegá el link" aria-label="Link de invitación" autoCapitalize="none" />
        <button className="btn">Seguir</button>
      </form>
      <h2 style={{ marginTop: 24 }}>Crear un grupo</h2>
      <NewGroup />
    </Screen>
  )
}

// Todo lo que va antes de entrar a un grupo. Adentro de un grupo, la app es la misma de siempre.
export function Root({ children }) {
  const a = useAccount()
  const [later, setLater] = useState(false)
  if (a.link) return <LinkScreen />
  if (a.status === 'loading') return <Screen title="Cargando…" />
  if (a.status === 'offline' && !a.me) return <Screen title="Sin conexión" lead="Cuando vuelva internet, entrás."><button className="btn" onClick={a.refresh}>Probar de nuevo</button></Screen>
  if (a.status === 'none') return <Welcome />
  if (a.status === 'legacy' && !later && !a.legacy.pending) return <Claim onLater={() => setLater(true)} />
  if (!a.group) return <NoGroups />
  return <GroupStore key={a.group.id + a.group.role} group={a.group} onLost={a.refresh}>{children}</GroupStore>
}

// Chip con el nombre del grupo (arriba de cada página): cambiar de grupo, crear uno, entrar con un link, otro celu.
export function GroupChip() {
  const a = useAccount()
  const [open, setOpen] = useState(false)
  if (a.status === 'legacy') { // celu viejo: sin selector de grupos; recordatorio de elegir quién es
    const p = a.legacy.pending
    return <p className="note">{p?.status === 'pending' ? `Esperando que un admin confirme que sos ${p.name}.` : p?.status === 'rejected' ? 'Un admin no confirmó tu nombre. ' : 'Todavía no elegiste quién sos. '}
      {p?.status !== 'pending' && <button className="btn ghost sm" onClick={() => location.reload()}>Elegir</button>}</p>
  }
  const reqs = a.me.groups.reduce((s, g) => s + g.requests, 0)
  return (
    <>
      <button className="gchip" onClick={() => setOpen(true)} aria-label={`Grupo: ${a.group.name}. Cambiar de grupo`}>
        {a.group.cover ? <img src={a.group.cover} alt="" /> : null}{a.group.name}<ChevronDown size={14} />{reqs > 0 && <i className="badge" aria-label={`${reqs} solicitudes`}>{reqs}</i>}
      </button>
      {open && createPortal(<GroupSheet onClose={() => setOpen(false)} />, document.body)}
    </>
  )
}

function GroupSheet({ onClose }) {
  const a = useAccount()
  const [mode, setMode] = useState(null)
  const [code, setCode] = useState('')
  const [dev, setDev] = useState(null)
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="Tus grupos" onClick={(e) => e.stopPropagation()}>
        <div className="row"><h3 className="grow">Tus grupos</h3><button className="ib" aria-label="Cerrar" onClick={onClose}><X size={18} /></button></div>
        {a.me.groups.map((g) => (
          <button key={g.id} className={`vote-main gpick ${g.id === a.group.id ? 'on' : ''}`} onClick={() => { a.setCur(g.id); onClose() }}>
            {g.cover ? <img src={g.cover} alt="" width="40" height="40" /> : <span className="avatar" aria-hidden="true">{g.name[0]}</span>}
            <span className="grow"><b>{g.name}</b><span className="muted small" style={{ display: 'block' }}>{g.role === 'admin' ? 'Admin' : 'Integrante'}{g.requests ? ` · ${g.requests} ${g.requests === 1 ? 'solicitud' : 'solicitudes'}` : ''}</span></span>
          </button>
        ))}
        <Pending />
        {mode === 'new' ? <NewGroup onDone={onClose} />
          : mode === 'link' ? (
            <form className="add" onSubmit={(e) => { e.preventDefault(); if (code.trim()) { a.openLink(code); onClose() } }}>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Pegá el link" aria-label="Link de invitación" autoCapitalize="none" autoFocus />
              <button className="btn">Seguir</button>
            </form>)
          : mode === 'dev' ? (
            <p>{dev ? <>Código para el otro celu: <b style={{ fontSize: 22, letterSpacing: 2 }}>{dev}</b><span className="muted small" style={{ display: 'block' }}>Sirve una vez y dura 10 minutos. Abrí la app en el otro celu y ponelo en “¿Ya usás la app en otro celu?”.</span></> : 'Generando…'}</p>)
          : (
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <button className="btn ghost sm" onClick={() => setMode('new')}>Crear grupo</button>
              <button className="btn ghost sm" onClick={() => setMode('link')}>Entrar con un link</button>
              <button className="btn ghost sm" onClick={async () => { setMode('dev'); try { setDev((await call('tpn_device_code')).code) } catch { setDev('— sin conexión —') } }}>Usar en otro celu</button>
            </div>)}
      </div>
    </div>
  )
}
