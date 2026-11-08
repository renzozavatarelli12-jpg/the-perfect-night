// Los cuatro rankings y el resumen de la temporada, calculados de los totales que manda el servidor (solo registros reales).
export const RANKS = [
  { k: 'cubatas', icon: '🍹', title: 'El Alcohólico', desc: 'Más cubatas registrados', unit: ['cubata', 'cubatas'] },
  { k: 'besos', icon: '💋', title: 'El Ganador', desc: 'Más besos registrados', unit: ['beso', 'besos'] },
  { k: 'salidas', icon: '🌙', title: 'El Senior de la Noche', desc: 'Más salidas', unit: ['salida', 'salidas'] },
  { k: 'boliches', icon: '🪩', title: 'RR. PP. de la Noche', desc: 'Más visitas a boliches', unit: ['visita', 'visitas'] },
]
export const unit = (r, n) => `${n} ${r.unit[n === 1 ? 0 : 1]}`
// "Más activo": salidas + visitas a boliches del año. No cuentan cubatas ni besos.
export const activity = (t) => t.salidas + t.boliches

// Ordenados de mayor a menor (solo quien tiene algo). Empatados comparten puesto (1, 1, 3). gap = cuánto le falta para el líder.
export function ranked(totals, val) {
  const f = typeof val === 'function' ? val : (t) => t[val]
  const r = (totals || []).map((t) => ({ ...t, n: f(t) })).filter((t) => t.n > 0).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name))
  return r.map((t) => ({ ...t, pos: r.findIndex((x) => x.n === t.n) + 1, gap: r[0].n - t.n }))
}
// Los que van primeros (todos si hay empate) y cuánto tienen; null si nadie tiene nada.
export function top(totals, val) {
  const r = ranked(totals, val).filter((t) => t.pos === 1)
  return r.length ? { names: r.map((t) => t.name), n: r[0].n } : null
}
