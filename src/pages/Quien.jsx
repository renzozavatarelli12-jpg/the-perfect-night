import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Crown, X } from 'lucide-react'
import './quien.css'
import { useStore } from '../store'
import ListSection from '../components/ListSection'
import { useConfirm } from '../components/Confirm'
import { shuffle, derange, tally } from '../quien'
import { winners, uid, today } from '../utils'

// La partida en curso queda guardada en este celu: si se recarga o se cambia de pestaña, sigue donde estaba.
const KEEP = 'tpn-quien'
const kept = (() => { try { return JSON.parse(localStorage.getItem(KEEP)) || {} } catch { return {} } })()
function useKept(k, init) {
  const [v, set] = useState(() => (k in kept ? kept[k] : init))
  useEffect(() => { kept[k] = v; try { localStorage.setItem(KEEP, JSON.stringify(kept)) } catch { /* sin espacio: solo en memoria */ } }, [k, v])
  return [v, set]
}

const CATS = ['Personalidad', 'Boliches y salidas', 'Relaciones y situaciones incómodas', 'Amistades', 'Situaciones absurdas', 'Anécdotas', 'Humor interno']
const MIN = 3, MAX = 10
const COL = ['#8B5CF6', '#C4B5FD', '#FF7A66', '#FFD166', '#fff']
const CONF = Array.from({ length: 28 }, (_, i) => ({ '--x': `${(i * 37) % 100}%`, '--d': `${(i % 9) * -0.4}s`, '--col': COL[i % 5] }))
const Glass = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h8l-1 8a3 3 0 0 1-6 0z" /><path d="M11 14v6M8 20h6" /></svg>
)
const Cheers = () => <div className="qq-cheers"><span className="l"><Glass /></span><span className="r"><Glass /></span><span className="spark">✨</span></div>
const Board = ({ names, scores, add }) => (
  <ol className="qq-board">
    {names.map((n, i) => ({ n, i, p: scores[i] })).sort((a, b) => b.p - a.p).map((r, k) => (
      <li key={r.i}><span className="qq-pos">{k + 1}</span><b>{r.n}</b>{add && add[r.i] > 0 && <span className="qq-add">+{add[r.i]}</span>}<span className="qq-pts">{r.p}</span></li>
    ))}
  </ol>
)

export default function Quien() {
  const { data, update } = useStore()
  const ask = useConfirm()
  const [ph, setPh] = useKept('ph', 'cover')
  const [names, setNames] = useKept('names', [])
  const [draft, setDraft] = useState('')
  const [err, setErr] = useState('')
  const [R, setR] = useKept('R', null) // ronda: {t: a quién interpreta cada uno, q, answers, order, votes, res}
  const [i, setI] = useKept('i', 0)
  const [flip, setFlip] = useState(false)
  const [text, setText] = useState('')
  const [picks, setPicks] = useState({})
  const [scores, setScores] = useKept('scores', [])
  const [used, setUsed] = useKept('used', [])
  const [add, setAdd] = useKept('add', [])
  const [saved, setSaved] = useKept('saved', false)
  const n = names.length
  const go = (p, idx = 0) => { setPh(p); setI(idx); setFlip(false); setText(''); setPicks({}) }
  const reset = () => { setNames([]); setR(null); setScores([]); setUsed([]); setAdd([]); setSaved(false); go('cover') }
  useEffect(() => { // el resultado queda para el grupo (se ve en Minijuegos)
    if (ph !== 'final' || saved || !n) return
    update('partidas', (l) => [...l, { id: uid(), game: 'quien', d: today(), scores: names.map((name, k) => ({ name, pts: scores[k] ?? 0 })) }])
    setSaved(true)
  }, [ph]) // eslint-disable-line react-hooks/exhaustive-deps
  const exit = async () => { if (await ask('¿Salir de la partida? Se pierde el puntaje.', 'Salir')) reset() }

  const addName = (e) => {
    e.preventDefault()
    const v = draft.trim().replace(/\s+/g, ' ')
    if (v.length < 3) return setErr('Poné nombre y apellido (mínimo 3 letras).')
    if (names.some((x) => x.toLowerCase() === v.toLowerCase())) return setErr('Ya está ese nombre.')
    if (names.length >= MAX) return setErr(`Máximo ${MAX} jugadores.`)
    setNames([...names, v]); setDraft(''); setErr('')
  }
  const newRound = (sc = scores) => {
    const fresh = data.quien.filter((q) => !used.includes(q.id))
    const pool = fresh.length ? fresh : data.quien
    const q = pool[Math.floor(Math.random() * pool.length)]
    setUsed(fresh.length ? [...used, q.id] : [q.id])
    setScores(sc)
    setR({ t: derange(n), q, answers: Array(n).fill(''), order: shuffle([...Array(n).keys()]), votes: Array.from({ length: n }, () => ({})) })
    go('hand')
  }
  const start = () => { setScores(Array(n).fill(0)); newRound(Array(n).fill(0)) }
  const saveAnswer = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    const answers = [...R.answers]; answers[i] = text.trim(); setR({ ...R, answers })
    i + 1 < n ? go('hand', i + 1) : go('vhand')
  }
  const vlist = R ? R.order.filter((a) => a !== i && R.t[a] !== i) : [] // no votás tus respuestas ni las que te imitan a vos
  const confirmVotes = () => {
    const votes = R.votes.map((v, k) => (k === i ? picks : v))
    if (i + 1 < n) { setR({ ...R, votes }); return go('vhand', i + 1) }
    const res = tally(n, votes, R.t)
    setAdd(res.pts); setScores(scores.map((s, k) => s + res.pts[k]))
    setR({ ...R, votes, res }); go('reveal')
  }
  const author = R && ph === 'reveal' ? R.order[i] : 0
  const nextReveal = () => (i + 1 < n ? go('reveal', i + 1) : go('result'))
  const nextDrink = () => (i + 1 < R.res.drinks.length ? go('drink', i + 1) : go('next'))
  const afterResult = () => (R.res.drinks.length ? go('drink') : go('next'))
  const top = winners(names.map((_, k) => k), (k) => scores[k])

  let body
  if (ph === 'cover') body = (
    <div className="qq-stage">
      <div className="qq-emoji">🎭</div>
      <h1 className="qq-title">¿Quién es quién?</h1>
      <p className="qq-sub">Respondé como si fueras otro del grupo. Los demás adivinan a quién estás imitando.</p>
      <button className="qq-btn" disabled={!data.quien.length} onClick={() => go('players')}>Empezar partida</button>
    </div>
  )
  else if (ph === 'players') body = (
    <div className="qq-stage">
      <h2 className="qq-h">¿Quiénes juegan?</h2>
      <p className="qq-sub">Mínimo {MIN}, máximo {MAX}. Nombre y apellido.</p>
      <form onSubmit={addName} className="qq-card">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Nombre y apellido" maxLength={40} />
        {err && <div className="qq-no small" style={{ marginTop: 8 }}>{err}</div>}
        <button className="qq-btn ghost" style={{ marginTop: 12 }}>Sumar</button>
      </form>
      <div className="qq-chips">
        {names.map((x, k) => <span className="qq-chip" key={x}>{x}<button aria-label={`Sacar a ${x}`} onClick={() => setNames(names.filter((_, j) => j !== k))}><X size={14} /></button></span>)}
      </div>
      <button className="qq-btn" disabled={n < MIN} onClick={start}>{n < MIN ? `Faltan ${MIN - n}` : 'Arrancar'}</button>
    </div>
  )
  else if (ph === 'hand' || ph === 'vhand') body = (
    <div className="qq-stage">
      <div className="qq-emoji">📱</div>
      <h2 className="qq-h">Pasale el celu a</h2>
      <div className="qq-card tilt"><div className="qq-name" style={{ fontSize: 26 }}>{names[i]}</div></div>
      <p className="qq-sub">{ph === 'hand' ? 'Que nadie mire.' : 'A votar. Que nadie mire.'}</p>
      <button className="qq-btn" onClick={() => go(ph === 'hand' ? 'target' : 'vote', i)}>Soy {names[i].split(' ')[0]}</button>
    </div>
  )
  else if (ph === 'target') body = (
    <div className="qq-stage">
      <p className="qq-sub">{names[i].split(' ')[0]}, te toca interpretar a</p>
      <div className="qq-card tilt2 qq-flipin"><div className="qq-emoji">🤫</div><div className="qq-name" style={{ fontSize: 28 }}>{names[R.t[i]]}</div></div>
      <p className="qq-sub">Es secreto. Contestá como lo haría esa persona.</p>
      <button className="qq-btn" onClick={() => go('write', i)}>Entendido</button>
    </div>
  )
  else if (ph === 'write') body = (
    <form className="qq-stage" onSubmit={saveAnswer}>
      <div className="qq-chip">{R.q.cat}</div>
      <div className="qq-card q">{R.q.text}</div>
      <p className="qq-sub">Respondé como {names[R.t[i]]}</p>
      <textarea rows={3} autoFocus value={text} onChange={(e) => setText(e.target.value)} maxLength={140} placeholder="Tu respuesta…" />
      <button className="qq-btn coral" disabled={!text.trim()}>Guardar</button>
    </form>
  )
  else if (ph === 'vote') body = (
    <div className="qq-stage">
      <h2 className="qq-h">{names[i].split(' ')[0]}, ¿a quién imita cada uno?</h2>
      <p className="qq-sub">{R.q.text}</p>
      {vlist.map((a, k) => (
        <div className="qq-card" key={a}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>{names[a].split(' ')[0]} dijo: “{R.answers[a]}”</div>
          <select value={picks[a] ?? ''} onChange={(e) => setPicks({ ...picks, [a]: Number(e.target.value) })}>
            <option value="" disabled>Elegí a alguien</option>
            {names.map((x, j) => j !== i && j !== a && <option key={j} value={j}>{x}</option>)}
          </select>
        </div>
      ))}
      <button className="qq-btn coral" disabled={vlist.some((a) => picks[a] === undefined)} onClick={confirmVotes}>Confirmar votos</button>
    </div>
  )
  else if (ph === 'reveal') {
    const tg = R.t[author]
    const right = names.filter((_, v) => v !== author && v !== tg && R.votes[v][author] === tg)
    const wrong = names.filter((_, v) => v !== author && v !== tg && R.votes[v][author] !== tg)
    body = (
      <div className="qq-stage">
        <p className="qq-sub">Respuesta {i + 1} de {n}</p>
        <div className="qq-card q">{names[author]} dijo: “{R.answers[author]}”</div>
        {!flip ? <button className="qq-btn" onClick={() => setFlip(true)}>Revelar</button> : (
          <div className="qq-card qq-flipin">
            <div className="qq-name">{names[author]} imitaba a {names[tg]}</div>
            <p className="qq-ok small" style={{ marginTop: 8 }}>{right.length ? `Acertaron: ${right.join(', ')}` : 'Nadie acertó'}</p>
            <p className="qq-no small">{wrong.length ? `Se equivocaron: ${wrong.join(', ')}` : '¡Todos acertaron!'}</p>
            <button className="qq-btn" style={{ marginTop: 12 }} onClick={nextReveal}>{i + 1 < n ? 'Siguiente' : 'Ver resultados'}</button>
          </div>
        )}
      </div>
    )
  }
  else if (ph === 'result') body = (
    <div className="qq-stage">
      <h2 className="qq-h">Resultados de la ronda</h2>
      <Board names={names} scores={scores} add={add} />
      <p className="qq-sub">{R.res.drinks.length ? `Toman: ${R.res.drinks.map((d) => names[d.id]).join(', ')}` : 'Nadie toma esta ronda.'}</p>
      <button className="qq-btn" onClick={afterResult}>{R.res.drinks.length ? 'Pasar a los tragos' : 'Seguir'}</button>
    </div>
  )
  else if (ph === 'drink') {
    const d = R.res.drinks[i]
    body = (
      <div className="qq-stage">
        <Cheers />
        <p className="qq-sub">Turno de</p>
        <h2 className="qq-title" style={{ fontSize: 30 }}>{names[d.id]}</h2>
        <p className="qq-sub">{d.why === 'wrong' ? 'Se equivocó al adivinar.' : 'Nadie se equivocó: tomás vos, que imitaste.'}</p>
        <button className="qq-btn coral" onClick={nextDrink}>Tomo 🍻</button>
        <button className="qq-btn ghost" onClick={nextDrink}>Paso, sin drama</button>
      </div>
    )
  }
  else if (ph === 'next') body = (
    <div className="qq-stage">
      <h2 className="qq-h">Puntaje</h2>
      <Board names={names} scores={scores} />
      <button className="qq-btn" onClick={() => newRound()}>Otra ronda</button>
      <button className="qq-btn ghost" onClick={() => go('final')}>Terminar y ver ganador</button>
    </div>
  )
  else body = (
    <div className="qq-stage" style={{ position: 'relative' }}>
      <div className="qq-conf">{CONF.map((s, k) => <i key={k} style={s} />)}</div>
      <Crown size={44} color="#FFD166" />
      <h2 className="qq-title" style={{ fontSize: 30 }}>{top.length ? top.map((k) => names[k]).join(' y ') : 'Nadie sumó'}</h2>
      <p className="qq-sub">{top.length > 1 ? 'Empate: ganan todos.' : top.length ? '¡Ganó la partida!' : 'Todos al mismo nivel.'}</p>
      <Board names={names} scores={scores} />
      <button className="qq-btn" onClick={reset}>Jugar de nuevo</button>
      <Link to="/minijuegos" className="qq-btn ghost" style={{ textAlign: 'center' }}>Volver a Minijuegos</Link>
    </div>
  )

  return (
    <>
      <div className="qq">
        <div className="qq-top">
          {ph === 'cover' ? <Link to="/minijuegos"><ArrowLeft size={14} /> Minijuegos</Link> : <button onClick={exit}><ArrowLeft size={14} /> Salir</button>}
          {ph !== 'cover' && ph !== 'players' && ph !== 'final' && <span className="small">{n} jugadores</span>}
        </div>
        {body}
      </div>
      {ph === 'cover' && (
        <ListSection title="Preguntas" addLabel="Sumar una" hint="Se usa “esta persona” para hablar de quien imitás." items={data.quien}
          onChange={(v) => update('quien', v)}
          fields={[{ name: 'cat', label: 'Categoría', type: 'select', options: CATS.map((c) => [c, c]), required: true }, { name: 'text', label: 'Pregunta', required: true }]}
          render={(q) => <><span className="muted small">{q.cat} · </span>{q.text}</>} />
      )}
    </>
  )
}
