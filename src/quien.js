// Lógica pura de ¿Quién es quién? (separada de la pantalla para poder probarla).
export const shuffle = (a) => {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]] }
  return r
}
// p[i] = a quién interpreta el jugador i. Nadie se toca a sí mismo (n >= 2).
export const derange = (n) => { let p; do p = shuffle([...Array(n).keys()]); while (p.some((t, i) => t === i)); return p }
// t[a] = a quién imitó el jugador a. votes[v][a] = a quién cree v que imitó a. Votan todos menos quien imitó (a) y el imitado (t[a]).
// Punto: 1 por acierto. Trago: máximo uno por jugador y ronda; equivocarse pesa más que "te descubrieron".
// Si alguien se equivocó con una respuesta, toma él; si nadie se equivocó, toma quien imitó.
export function tally(n, votes, t) {
  const pts = Array(n).fill(0), why = {}
  for (let a = 0; a < n; a++) {
    const wrong = []
    for (let v = 0; v < n; v++) {
      if (v === a || v === t[a]) continue
      if (votes[v][a] === t[a]) pts[v]++; else wrong.push(v)
    }
    if (wrong.length) wrong.forEach((v) => { why[v] = 'wrong' })
    else if (!why[a]) why[a] = 'found'
  }
  return { pts, drinks: Object.keys(why).map(Number).sort((x, y) => x - y).map((id) => ({ id, why: why[id] })) }
}
