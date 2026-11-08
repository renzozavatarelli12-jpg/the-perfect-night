// Previa Games. Para sumar un juego: agregarlo acá (y su pantalla). Los que tienen partida en el servidor usan tpn_games (kind).
export const GAMES = [
  { to: 'quien', icon: '🎭', title: '¿Quién es quién?', desc: 'Cada uno imita en secreto a otro del grupo y los demás adivinan', cls: 'mg-quien' },
  { to: 'probable', icon: '🍻', title: '¿Quién es más probable que…?', desc: 'Sale una pregunta y el grupo vota', cls: 'mg-prob' },
]

// Resultado de una ronda. La persona imitada no cuenta. Penalización: cada uno que se equivocó;
// si nadie se equivocó, quien imitó. (La penalización siempre se puede pasar: no resta nada.)
export function roundResult(r) {
  const voters = Object.entries(r.guesses).filter(([v]) => v !== r.target)
  const right = voters.filter(([, g]) => g === r.target).map(([v]) => v)
  const wrong = voters.filter(([, g]) => g !== r.target).map(([v]) => v)
  return { right, wrong, penalty: wrong.length ? wrong : [r.imitator] }
}

// Tabla de la partida: 1 punto por acierto. Desempate: menos errores. Mismo puntaje y errores = mismo puesto.
export function standings(game) {
  const s = Object.fromEntries(game.players.map((p) => [p.m, { m: p.m, name: p.name, right: 0, wrong: 0 }]))
  for (const r of game.rounds) { const x = roundResult(r); x.right.forEach((m) => s[m] && s[m].right++); x.wrong.forEach((m) => s[m] && s[m].wrong++) }
  const l = Object.values(s).sort((a, b) => b.right - a.right || a.wrong - b.wrong || a.name.localeCompare(b.name))
  return l.map((t) => ({ ...t, pos: l.findIndex((x) => x.right === t.right && x.wrong === t.wrong) + 1 }))
}
