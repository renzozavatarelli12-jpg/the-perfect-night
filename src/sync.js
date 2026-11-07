// Sincronización con el grupo (sin React ni red: se le pasa `api`, así se puede probar sola).
// Los datos de la app se parten en filas (una por integrante, boliche, voto, registro…), cada una con su versión `r`.
// Los cambios locales quedan en una cola (`ops`) hasta que el servidor los confirma; lo que se ve = servidor + cola.
// Si otro cambió la misma fila antes, gana el servidor y se avisa (salvo operaciones "merge", que se vuelven a aplicar
// sobre lo nuevo, p. ej. sumar un cubata).

export const COLS = ['members', 'boliches', 'favDrinks', 'probable', 'quien', 'log', 'stories', 'partidas']
const K = (c, i) => c + '/' + i
const split = (rk) => { const j = rk.indexOf('/'); return [rk.slice(0, j), rk.slice(j + 1)] }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

export function toRows(d) {
  const m = new Map()
  for (const c of COLS) for (const x of d[c] || []) m.set(K(c, x.id), x)
  for (const { votes, ...p } of d.hoy?.previas || []) {
    m.set(K('previa', p.id), p)
    for (const v of votes || []) m.set(K('pvoto', p.id + '|' + v), true)
  }
  for (const [k, v] of Object.entries(d.hoy?.votes || {})) if (v) m.set(K('voto', k), v)
  for (const [y, t] of Object.entries(d.flama || {})) m.set(K('flama', y), t)
  return m
}

export function fromRows(m) {
  const d = { hoy: { previas: [], votes: {} }, flama: {} }
  for (const c of COLS) d[c] = []
  const pv = []
  for (const [rk, v] of m) {
    if (v == null) continue
    const [c, i] = split(rk)
    if (COLS.includes(c)) d[c].push(v)
    else if (c === 'previa') d.hoy.previas.push({ ...v, votes: [] })
    else if (c === 'pvoto') pv.push(i.split('|'))
    else if (c === 'voto') d.hoy.votes[i] = v
    else if (c === 'flama') d.flama[i] = v
  }
  for (const [p, who] of pv) d.hoy.previas.find((x) => x.id === p)?.votes.push(who)
  return d
}

// Filas que cambian de a → b (null = se borra).
export function diff(a, b) {
  const out = new Map()
  for (const [rk, v] of b) if (!same(a.get(rk), v)) out.set(rk, v)
  for (const rk of a.keys()) if (!b.has(rk)) out.set(rk, null)
  return out
}
const applyPatch = (d, patch) => { const m = toRows(d); for (const [rk, v] of patch) v == null ? m.delete(rk) : m.set(rk, v); return fromRows(m) }

export const LOST = 'Alguien cambió lo mismo que vos al mismo tiempo: quedó su versión.'

export function createEngine({ api, ls, prefix = 'tpn-v2', wait = setTimeout }) {
  const load = (k, d) => { try { return JSON.parse(ls.getItem(prefix + k)) ?? d } catch { return d } }
  const save = (k, v) => { try { ls.setItem(prefix + k, JSON.stringify(v)) } catch { /* sin espacio: queda en memoria */ } }
  let rows = new Map(load('-rows', [])) // rk -> { v (null = borrado), r, o }
  let since = load('-since', 0)
  let ops = load('-ops', []).map((o) => ({ patch: new Map(o.patch), base: o.base }))
  let st = { loaded: since > 0, online: true, pending: 0, notice: null, needJoin: !api.token(), topic: load('-topic', null) }
  let data, snap, busy = false, pullAfter = false, retryMs = 0, timer = null
  const subs = new Set()
  const rev = (rk) => rows.get(rk)?.r ?? 0
  const server = () => fromRows(new Map([...rows].filter(([, x]) => x.v != null).sort((a, b) => a[1].o - b[1].o).map(([rk, x]) => [rk, x.v])))

  const compute = () => {
    data = server()
    for (const op of ops) data = op.fn ? { ...data, [op.k]: op.fn(data[op.k]) } : applyPatch(data, op.patch)
    st = { ...st, pending: ops.length }
    snap = { data, st }
    save('-rows', [...rows]); save('-since', since); save('-ops', ops.map((o) => ({ patch: [...o.patch], base: o.base })))
    subs.forEach((f) => f())
  }
  // Cambios en cola que chocan con una versión nueva del servidor: se descartan (si no eran ya lo mismo, se avisa).
  const rebase = () => {
    let lost = false
    for (const op of ops) {
      if (op.fn) continue
      for (const [rk, v] of [...op.patch]) {
        if (rev(rk) === op.base[rk]) continue
        if (!same(rows.get(rk)?.v ?? null, v)) lost = true
        op.patch.delete(rk)
      }
    }
    ops = ops.filter((op) => op.fn || op.patch.size)
    if (lost) st = { ...st, notice: LOST }
  }
  const take = (list) => { for (const x of list) rows.set(K(x.c, x.i), { v: x.v ?? null, r: x.r, o: x.o }) }

  const fail = (e, n) => {
    if (e.code === 'tpn_session') { api.logout(); st = { ...st, needJoin: true }; return }
    if (e.code === 'tpn_forbidden' || e.code === 'tpn_claim' || e.code === 'tpn_upgraded') { st = { ...st, needJoin: true }; return } // ya no es de este grupo: la cuenta se vuelve a fijar
    if (e.code === 'tpn_invalid' || e.code === 'tpn_full') { ops.splice(0, n); st = { ...st, notice: 'Un cambio no se pudo guardar. Probá de nuevo.' }; return }
    if (e.code === 'tpn_denied') { ops.splice(0, n); st = { ...st, notice: 'Eso es de otra persona del grupo: solo lo puede cambiar ella o un admin.' }; return }
    st = { ...st, online: false }
    retryMs = Math.min(retryMs ? retryMs * 2 : 2000, 30000)
    clearTimeout(timer); timer = wait(() => eng.sync(), retryMs)
  }
  const ok = () => { retryMs = 0; st = { ...st, online: true } }

  const eng = {
    get: () => snap,
    subscribe: (f) => { subs.add(f); return () => subs.delete(f) },
    // merge = true: si choca, se vuelve a aplicar la función sobre lo nuevo (solo para funciones que no pisan, como bump).
    update(k, v, merge = false) {
      const cur = data[k]
      const nv = typeof v === 'function' ? v(cur) : v
      if (nv === cur) return
      const patch = diff(toRows({ [k]: cur }), toRows({ [k]: nv }))
      if (!patch.size) return
      const base = {}
      for (const rk of patch.keys()) base[rk] = rev(rk)
      ops.push({ k, fn: merge && typeof v === 'function' ? v : null, patch, base })
      compute()
      clearTimeout(timer); timer = wait(() => eng.flush(), 250)
    },
    async pull() {
      if (st.needJoin) return
      if (busy) { pullAfter = true; return } // mientras se sube algo no se toca la cola
      try {
        const res = await api.pull(since)
        take(res.rows)
        for (const x of res.rows) since = Math.max(since, x.r)
        ok(); st = { ...st, loaded: true, topic: res.topic }; save('-topic', res.topic)
        rebase()
      } catch (e) { fail(e, 0) }
      compute()
    },
    async flush(tries = 0) {
      if (busy || !ops.length || st.needJoin) return
      busy = true
      const n = ops.length
      const changes = [...diff(toRows(server()), toRows(data))].map(([rk, v]) => { const [c, i] = split(rk); return { c, i, v, b: rev(rk) } })
      let again = false
      try {
        if (changes.length) {
          const res = await api.push(changes)
          if (res.ok) {
            for (const x of res.rows) {
              const rk = K(x.c, x.i), old = rev(rk)
              rows.set(rk, { v: changes.find((c) => c.c === x.c && c.i === x.i).v, r: x.r, o: x.o })
              for (const op of ops.slice(n)) if (op.base[rk] === old) op.base[rk] = x.r // lo que vino después se apoyaba en esto
            }
            ops.splice(0, n)
          } else { take(res.rows); rebase(); again = true }
        } else ops.splice(0, n)
        ok()
      } catch (e) { fail(e, n) }
      busy = false
      compute()
      if (pullAfter) { pullAfter = false; await eng.pull() }
      if ((again && tries < 3) || (!again && ops.length && st.online)) await eng.flush(again ? tries + 1 : 0)
    },
    async sync() { await eng.pull(); await eng.flush() },
    async join(code) {
      const r = await api.join(code)
      if (r.error) return r.error
      st = { ...st, needJoin: false }
      await eng.sync()
      return null
    },
    // Datos viejos de este celu (o de una copia): qué se puede sumar al grupo sin pisar nada.
    offer(local, seedData) {
      const empty = !rows.size, seedRows = toRows(seedData), add = new Map()
      let clash = 0
      for (const [rk, v] of toRows(local)) {
        const c = split(rk)[0]
        if (c === 'voto' || c === 'pvoto' || (!empty && c === 'previa')) continue // votos y previas son de una noche
        if (!empty && same(seedRows.get(rk), v)) continue // lo de ejemplo que nunca se tocó
        const s = rows.get(rk)
        if (s) { if (!same(s.v, v)) clash++; continue }
        add.set(rk, v)
      }
      return { add, clash }
    },
    importRows(add) {
      if (!add.size) return
      const base = {}
      for (const rk of add.keys()) base[rk] = 0 // solo cosas nuevas: si ya existen en el grupo, no se tocan
      ops.push({ k: null, fn: null, patch: add, base })
      compute(); eng.flush()
    },
    clearNotice() { st = { ...st, notice: null }; compute() },
  }
  compute()
  return eng
}
