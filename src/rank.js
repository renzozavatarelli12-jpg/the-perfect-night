import { uid, winners } from './utils'

// Lo que se anota de cada integrante. Para sumar otra estadística, agregarla acá (y un logro/ranking abajo si hace falta).
export const KINDS = [
  { k: 'cubatas', icon: '🍹', label: 'Cubatas' },
  { k: 'besos', icon: '💋', label: 'Besos' },
  { k: 'salidas', icon: '🌙', label: 'Salidas' },
  { k: 'boliches', icon: '🪩', label: 'Boliches visitados' },
]
// Los 4 rankings. k = estadística que mide.
export const RANKS = [
  { k: 'cubatas', icon: '🍹', title: 'El Alcohólico', desc: 'Más cubatas' },
  { k: 'besos', icon: '💋', title: 'El MVP', desc: 'Más besos' },
  { k: 'salidas', icon: '🌙', title: 'El Senior de la Noche', desc: 'Más salidas' },
  { k: 'boliches', icon: '🪩', title: 'RR. PP. de la Noche', desc: 'Más boliches visitados' },
]
// Logros: se desbloquean solos al llegar a goal de la estadística k. dif = qué tan difícil es (para "el más difícil del año").
// "El último en pie" (3 afters) no está: todavía no se registran afters.
export const LOGROS = [
  { id: 'leyenda', icon: '👑', name: 'Leyenda en vida', k: 'salidas', goal: 20, dif: 2 },
  { id: 'higado', icon: '🫀', name: 'Hígado de titanio', k: 'cubatas', goal: 50, dif: 3 },
]

// log: [{ id, m: idIntegrante, k: estadística, d: 'YYYY-MM-DD', n }]. Los totales se calculan del log, nunca se guardan aparte.
export const total = (log, m, k, from = '0000', to = '9999-99') =>
  log.reduce((s, e) => (e.m === m && e.k === k && e.d >= from && e.d <= to + '-99' ? s + e.n : s), 0)
export const inYear = (log, m, k, y) => total(log, m, k, y, y)

// +1 / -1. Un solo registro por integrante, estadística y día (no se duplica); una salida cuenta una vez por día.
export function bump(log, m, k, d, delta) {
  const mine = log.filter((e) => e.m === m && e.k === k)
  const today = mine.find((e) => e.d === d)
  if (delta > 0) {
    if (k === 'salidas' && today) return log
    return today ? log.map((e) => (e === today ? { ...e, n: e.n + 1 } : e)) : [...log, { id: uid(), m, k, d, n: 1 }]
  }
  const t = today || [...mine].sort((a, b) => (a.d < b.d ? 1 : -1))[0]
  if (!t) return log
  return t.n > 1 ? log.map((e) => (e === t ? { ...e, n: e.n - 1 } : e)) : log.filter((e) => e !== t)
}

export const progress = (log, m, lg) => total(log, m, lg.k)
export const unlocked = (log, m) => LOGROS.filter((lg) => total(log, m, lg.k) >= lg.goal)
// Logros que se desbloquearon durante el año y (a fin de año) no estaban antes.
export const unlockedIn = (log, m, y) => LOGROS.filter((lg) => total(log, m, lg.k, '0000', y) >= lg.goal && total(log, m, lg.k, '0000', String(y - 1)) < lg.goal)

// Resumen anual: usa solo lo registrado ese año.
export function season(log, members, y) {
  const names = (ms) => ms.map((m) => m.name)
  const by = (k) => winners(members, (m) => inYear(log, m.id, k, y))
  const act = winners(members, (m) => KINDS.reduce((s, x) => s + inYear(log, m.id, x.k, y), 0))
  const got = members.flatMap((m) => unlockedIn(log, m.id, +y).map((lg) => ({ lg, m })))
  const hard = got.length ? Math.max(...got.map((x) => x.lg.dif)) : 0
  const best = got.filter((x) => x.lg.dif === hard)
  return {
    activo: names(act), salidas: names(by('salidas')), besos: names(by('besos')), cubatas: names(by('cubatas')),
    logro: best.length ? { lg: best[0].lg, who: best.map((x) => x.m.name) } : null,
  }
}
