// ¿Quién es quién? Las partidas viven en el servidor: él sortea a quién imita cada uno y guarda el secreto.
// El celu solo pide ver UN secreto por vez (el propio, o el de quien tiene el celu en la mano, una sola vez).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Crown, X, Check } from 'lucide-react'
import './quien.css'
import { useStore } from '../store'
import { useLive, liveErr } from '../live'
import { call } from '../cloud'
import ListSection from '../components/ListSection'
import { useConfirm } from '../components/Confirm'
import { roundResult, standings } from '../games'

const CATS = ['Personalidad', 'Boliches y salidas', 'Relaciones y situaciones incómodas', 'Amistades', 'Situaciones absurdas', 'Anécdotas', 'Humor interno']
const MIN = 3, MAX = 12
const COL = ['#8B5CF6', '#C4B5FD', '#FF7A66', '#FFD166', '#fff']
const CONF = Array.from({ length: 28 }, (_, i) => ({ '--x': `${(i * 37) % 100}%`, '--d': `${(i % 9) * -0.4}s`, '--col': COL[i % 5] }))
const KEEP = 'tpn-partida-'
const kept = (g) => { try { return localStorage.getItem(KEEP + g) } catch { return null } }
const keep = (g, id) => { try { id ? localStorage.setItem(KEEP + g, id) : localStorage.removeItem(KEEP + g) } catch { /* sin espacio */ } }
const first = (s) => (s || '').split(' ')[0]

export default function Quien() {
  const { group } = useStore()
  if (!group || group.role === 'legacy') return <div className="qq"><div className="qq-stage"><p className="qq-sub">Para jugar, primero elegí quién sos.</p></div></div>
  return <QuienInner gid={group.id} />
}

function QuienInner({ gid }) {
  const { data, update } = useStore()
  const [gameId, setGameRaw] = useState(() => kept(gid))
  const setGame = (id) => { keep(gid, id); setGameRaw(id) }
  return (
    <>
      <div className="qq">
        {gameId ? <Game id={gameId} gid={gid} onExit={() => setGame(null)} /> : <Lobby gid={gid} onGame={setGame} />}
      </div>
      {!gameId && (
        <ListSection title="Ideas para imitar" addLabel="Sumar una" hint="Si a alguien no se le ocurre qué hacer, sale una de estas: respondela como tu personaje." items={data.quien}
          onChange={(v) => update('quien', v)}
          fields={[{ name: 'cat', label: 'Categoría', type: 'select', options: CATS.map((c) => [c, c]), required: true }, { name: 'text', label: 'Pregunta', required: true }]}
          render={(q) => <><span className="muted small">{q.cat} · </span>{q.text}</>} />
      )}
    </>
  )
}

function Lobby({ gid, onGame }) {
  const { data } = useStore()
  const L = useLive('tpn_games_list', { p_group: gid })
  const [pick, setPick] = useState(null) // null = portada; [] = eligiendo jugadores
  const [req, setReq] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const live = (L.v?.games || []).filter((g) => g.status === 'play')
  const people = data.members // integrantes e invitados del grupo
  const start = async () => {
    setBusy(true); setErr('')
    try { const r = await call('tpn_game_new', { p_group: gid, p_kind: 'quien', p_players: pick, p_req: req }); onGame(r.game.id) } catch (e) { setErr(liveErr(e)) } finally { setBusy(false) }
  }
  if (pick) return (
    <>
      <div className="qq-top"><button onClick={() => setPick(null)}><ArrowLeft size={14} /> Volver</button><span className="small">{pick.length} elegidos</span></div>
      <div className="qq-stage">
        <h2 className="qq-h">¿Quiénes juegan?</h2>
        <p className="qq-sub">Tocá a los que están. Mínimo {MIN}, máximo {MAX}.</p>
        <div className="qq-chips">
          {people.map((m) => { const on = pick.includes(m.id); return (
            <button key={m.id} className={`qq-chip pick ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => setPick(on ? pick.filter((x) => x !== m.id) : pick.length < MAX ? [...pick, m.id] : pick)}>
              {on && <Check size={14} />}{m.name}{m.guest ? ' (invitado)' : ''}
            </button>
          ) })}
        </div>
        {err && <p className="qq-no small" role="alert">{err}</p>}
        <button className="qq-btn" disabled={pick.length < MIN || busy} onClick={start}>{pick.length < MIN ? `Faltan ${MIN - pick.length}` : busy ? 'Sorteando…' : 'Sortear y empezar'}</button>
      </div>
    </>
  )
  const past = (L.v?.games || []).filter((g) => g.status === 'done').slice(0, 10)
  return (
    <>
      <div className="qq-top"><Link to="/minijuegos"><ArrowLeft size={14} /> Previa Games</Link></div>
      <div className="qq-stage">
        <div className="qq-emoji">🎭</div>
        <h1 className="qq-title">¿Quién es quién?</h1>
        <p className="qq-sub">La app sortea en secreto a quién imita cada uno. Por turnos, cada uno imita a su personaje y los demás adivinan quién es.</p>
        {live.map((g) => (
          <button key={g.id} className="qq-btn ghost" onClick={() => onGame(g.id)}>Seguir la partida de las {new Date(g.at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} ({g.players.map((p) => first(p.name)).join(', ')})</button>
        ))}
        <button className="qq-btn" onClick={() => { setPick([]); setReq(crypto.randomUUID()); setErr('') }}>Nueva partida</button>
        {L.err && <p className="qq-no small">{L.err}</p>}
        {past.length > 0 && <div className="qq-card">
          <b>Últimas partidas</b>
          {past.map((g) => { const s = standings(g); const w = s.filter((t) => t.pos === 1 && t.right > 0); return (
            <button key={g.id} className="qq-hist" onClick={() => onGame(g.id)}>
              <span className="grow"><b>{w.length ? `🏆 ${w.map((t) => first(t.name)).join(' y ')}` : 'Sin ganador'}</b><span className="small" style={{ display: 'block' }}>{g.rounds.length} {g.rounds.length === 1 ? 'ronda' : 'rondas'} · {g.players.length} jugadores</span></span>
              <span className="small">{new Date(g.at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}</span>
            </button>
          ) })}
        </div>}
      </div>
    </>
  )
}

function Game({ id, gid, onExit }) {
  const { data } = useStore()
  const ask = useConfirm()
  const L = useLive('tpn_game_get', { p_game: id })
  const [hand, setHand] = useState(null) // { m, step: 'pass' | 'show', target }
  const [guess, setGuess] = useState({})
  const [shown, setShown] = useState(null) // ronda recién jugada (para el resultado)
  const [q, setQ] = useState(null)
  const g = L.v?.game, me = L.v?.me
  if (!g) return <div className="qq-stage"><p className="qq-sub">{L.err || 'Cargando la partida…'}</p>{L.err && <button className="qq-btn ghost" onClick={onExit}>Volver</button>}</div>
  const name = (m) => g.players.find((p) => p.m === m)?.name || '¿?'
  const boss = g.by === me || L.v.role === 'admin'
  const done = new Set(g.rounds.map((r) => r.imitator))
  const next = g.players.find((p) => !done.has(p.m))
  const top = (
    <div className="qq-top">
      <button onClick={onExit}><ArrowLeft size={14} /> Salir</button>
      {g.status === 'play' && boss && <span className="row" style={{ gap: 14 }}>
        <button onClick={async () => (await ask('¿Terminar ya? Se cuenta lo jugado hasta ahora.', 'Terminar')) && L.act('tpn_game_end', { p_game: id, p_cancel: false })}>Terminar</button>
        <button onClick={async () => (await ask('¿Cancelar la partida? No va a aparecer en el historial.', 'Cancelar partida')) && (await L.act('tpn_game_end', { p_game: id, p_cancel: true })) && onExit()}><X size={14} /> Cancelar</button>
      </span>}
    </div>
  )
  const err = L.err && <p className="qq-no small" role="alert">{L.err}</p>

  if (g.status === 'canc') return <>{top}<div className="qq-stage"><h2 className="qq-h">Partida cancelada</h2><button className="qq-btn" onClick={onExit}>Volver</button></div></>
  if (g.status === 'done') return <>{top}<Final g={g} onExit={onExit} /></>

  // 1) secreto de uno, en el celu compartido
  if (hand) {
    const reveal = async () => {
      try { const r = await call('tpn_game_reveal', { p_game: id, p_member: hand.m }); setHand({ ...hand, step: 'show', target: r.name }) } catch (e) { L.setErr(liveErr(e)); setHand(null) }
    }
    return <>{top}{hand.step === 'pass' ? (
      <div className="qq-stage">
        <div className="qq-emoji">📱</div>
        <h2 className="qq-h">Pasale el celu a</h2>
        <div className="qq-card tilt"><div className="qq-name" style={{ fontSize: 30 }}>{name(hand.m)}</div></div>
        <p className="qq-sub">Que nadie más mire. Se puede ver una sola vez en este celu.</p>
        <button className="qq-btn" onClick={reveal}>Soy {first(name(hand.m))}: mostrar</button>
        <button className="qq-btn ghost" onClick={() => setHand(null)}>Volver</button>
      </div>
    ) : (
      <div className="qq-stage">
        <p className="qq-sub">{first(name(hand.m))}, te toca imitar a</p>
        <div className="qq-card tilt2 qq-flipin"><div className="qq-emoji">🤫</div><div className="qq-name" style={{ fontSize: 30 }}>{hand.target}</div></div>
        <p className="qq-sub">Es secreto. Memorizalo y tocá listo antes de pasar el celu.</p>
        <button className="qq-btn" onClick={() => { setHand(null); L.reload() }}>Listo, ocultar</button>
      </div>
    )}</>
  }

  // 3) resultado de la ronda recién jugada
  if (shown) {
    const r = g.rounds.find((x) => x.imitator === shown)
    if (r) {
      const x = roundResult(r)
      return <>{top}<div className="qq-stage">
        <p className="qq-sub">Ronda {g.rounds.length} de {g.players.length}</p>
        <div className="qq-card qq-flipin"><div className="qq-name" style={{ fontSize: 30 }}>{first(name(r.imitator))} imitaba a {name(r.target)}</div>
          <p className="qq-ok small">{x.right.length ? `✓ Acertaron: ${x.right.map((m) => first(name(m))).join(', ')}` : 'Nadie acertó'}</p>
          {x.wrong.length > 0 && <p className="qq-no small">✗ Se equivocaron: {x.wrong.map((m) => first(name(m))).join(', ')}</p>}
        </div>
        <div className="qq-card">
          <b>Turno de penalización{x.penalty.length > 1 ? ' (uno por cada uno)' : ''}</b>
          <div className="qq-name" style={{ fontSize: 28 }}>{x.penalty.map((m) => first(name(m))).join(', ')}</div>
          <p className="qq-sub small">{x.wrong.length ? 'Por equivocarse al adivinar.' : 'Nadie se equivocó: le toca a quien imitó.'} Cada uno elige: 🍹 un trago, 🥤 algo sin alcohol o 🙅 paso. Pasar no resta puntos.</p>
        </div>
        <button className="qq-btn" onClick={() => { setShown(null); setGuess({}); setQ(null) }}>{next ? 'Siguiente imitación' : 'Ver cómo quedó'}</button>
      </div></>
    }
  }

  // 2) todos vieron su secreto -> rondas
  const unseen = g.players.filter((p) => !p.seen)
  if (!next) return <>{top}<div className="qq-stage">
    <h2 className="qq-h">¡Imitaron todos!</h2>
    <Table g={g} />
    {boss ? <button className="qq-btn" disabled={L.busy} onClick={() => L.act('tpn_game_end', { p_game: id, p_cancel: false })}>Cerrar y ver resultado</button>
      : <p className="qq-sub">Falta que quien armó la partida la cierre.</p>}
  </div></>

  const voters = g.players.filter((p) => p.m !== next.m)
  const ready = voters.some((p) => guess[p.m])
  const idea = () => { const l = data.quien; if (l.length) setQ(l[Math.floor(Math.random() * l.length)]) }
  return <>{top}<div className="qq-stage">
    {err}
    {unseen.length > 0 && <div className="qq-card">
      <b>1. Cada uno ve a quién imita</b>
      <p className="qq-sub small">Tocá tu nombre y pasá el celu, o mirálo en tu propio celu (Previa Games → esta partida).</p>
      <div className="qq-chips">
        {g.players.map((p) => p.seen
          ? <span key={p.m} className="qq-chip done"><Check size={14} /> {first(p.name)}</span>
          : <button key={p.m} className="qq-chip pick" onClick={() => setHand({ m: p.m, step: 'pass' })}>{first(p.name)}</button>)}
      </div>
    </div>}
    {g.players.find((p) => p.m === me)?.seen && <MyTarget id={id} me={me} />}
    <div className="qq-card q">
      <span className="small">2. Imitación {g.rounds.length + 1} de {g.players.length}</span>
      <div className="qq-name" style={{ fontSize: 34 }}>Turno de {first(next.name)}</div>
      <p className="qq-sub">Imitá a tu personaje. Los demás miran y después adivinan.</p>
      {q ? <p className="qq-sub"><b>Idea:</b> {q.text}</p> : data.quien.length > 0 && <button className="qq-btn ghost" onClick={idea}>No se me ocurre nada: dame una idea</button>}
    </div>
    <div className="qq-card">
      <b>3. ¿A quién imitaba {first(next.name)}?</b>
      {voters.map((p) => (
        <label key={p.m} className="qq-guess"><span>{first(p.name)}</span>
          <select value={guess[p.m] || ''} onChange={(e) => setGuess({ ...guess, [p.m]: e.target.value })}>
            <option value="">No vota</option>
            {voters.map((o) => <option key={o.m} value={o.m}>{o.m === p.m ? `${o.name} (yo)` : o.name}</option>)}
          </select></label>
      ))}
      <p className="qq-sub small">Si te imitaban a vos, tu voto no cuenta (ni suma ni resta).</p>
      <button className="qq-btn coral" disabled={!ready || L.busy} onClick={async () => {
        const gs = Object.fromEntries(Object.entries(guess).filter(([, v]) => v))
        if (await L.act('tpn_game_round', { p_game: id, p_imitator: next.m, p_guesses: gs })) setShown(next.m)
      }}>Revelar</button>
    </div>
    {g.rounds.length > 0 && <Table g={g} />}
  </div></>
}

// En mi propio celu: ver el mío cuando quiera (solo se muestra mientras lo pido).
function MyTarget({ id, me }) {
  const [t, setT] = useState(null)
  return t ? <button className="qq-btn ghost" onClick={() => setT(null)}>Imitás a <b>{t}</b> · tocá para ocultar</button>
    : <button className="qq-btn ghost" onClick={async () => { try { setT((await call('tpn_game_reveal', { p_game: id, p_member: me })).name) } catch { /* sin conexión */ } }}>Ver a quién imito yo</button>
}

function Table({ g }) {
  return (
    <ol className="qq-board">
      {standings(g).map((t) => (
        <li key={t.m}><span className="qq-pos">{t.pos}</span><b>{t.name}</b><span className="small">{t.right} ✓ · {t.wrong} ✗</span><span className="qq-pts">{t.right}</span></li>
      ))}
    </ol>
  )
}

function Final({ g, onExit }) {
  const s = standings(g)
  const w = s.filter((t) => t.pos === 1 && t.right > 0)
  const hits = s.reduce((a, t) => a + t.right, 0), miss = s.reduce((a, t) => a + t.wrong, 0)
  return (
    <div className="qq-stage" style={{ position: 'relative' }}>
      {w.length > 0 && <div className="qq-conf">{CONF.map((st, k) => <i key={k} style={st} />)}</div>}
      <Crown size={44} color="#FFD166" />
      <h2 className="qq-title" style={{ fontSize: 34 }}>{w.length ? w.map((t) => t.name).join(' y ') : 'Nadie acertó'}</h2>
      <p className="qq-sub">{w.length > 1 ? 'Empate: ganan todos.' : w.length ? '¡Ganó la partida!' : 'Todos al mismo nivel.'} {g.rounds.length} de {g.players.length} rondas · {hits} aciertos · {miss} errores.</p>
      <Table g={g} />
      <p className="qq-sub small">1 punto por acierto. Desempate: menos errores. Lo que se tomó o no, no cuenta.</p>
      {g.rounds.length > 0 && <div className="qq-card">
        <b>Ronda por ronda</b>
        {g.rounds.map((r, k) => { const x = roundResult(r); const n = (m) => first(g.players.find((p) => p.m === m)?.name); return (
          <p key={k} className="small">{n(r.imitator)} → {n(r.target)} · <span className="qq-ok">{x.right.length} ✓</span> <span className="qq-no">{x.wrong.length} ✗</span></p>
        ) })}
      </div>}
      <button className="qq-btn" onClick={onExit}>Volver</button>
    </div>
  )
}
