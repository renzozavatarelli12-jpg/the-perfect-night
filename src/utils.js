import { seed } from './data/seed'

export const uid = () => Math.random().toString(36).slice(2, 9)
export const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10) // fecha LOCAL (toISOString a secas daría "mañana" de noche en Argentina)
export const who = (members, id) => members.find((m) => m.id === id)?.name ?? (String(id).startsWith('g_') ? 'Invitado' : '¿?')
// Invitado: alguien ajeno al grupo que se suma por una salida. Se quita después.
export const newGuest = (name) => ({ id: 'g_' + uid(), name, nick: '', drink: '', guest: true })
// Los que van ganando (todos si hay empate); [] si nadie votó.
export const winners = (items, count) => { const max = Math.max(0, ...items.map(count)); return max ? items.filter((i) => count(i) === max) : [] }
export const mapLink = (b) =>
  b.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${b.name} ${b.address || b.zone || ''}`)}`

// --- copia de seguridad ---
const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x)
export const makeBackup = (data, me) => ({ app: 'the-perfect-night', version: 1, exportedAt: new Date().toISOString(), data, me })

// Valida una copia SIN tocar nada. Devuelve { data, me } o { error }.
export function parseBackup(text) {
  let b
  try { b = JSON.parse(text) } catch { return { error: 'El archivo no es un JSON válido.' } }
  if (!isObj(b) || b.app !== 'the-perfect-night' || !isObj(b.data)) return { error: 'Este archivo no es una copia de The Perfect Night.' }
  const d = b.data
  const ref = seed()
  for (const k of Object.keys(ref).filter((k) => Array.isArray(ref[k]))) {
    if (k === 'probable' && d[k] === undefined) continue // copias viejas no lo traen
    if (!Array.isArray(d[k])) return { error: `Falta la sección "${k}" o está dañada.` }
    if (!d[k].every((i) => isObj(i) && typeof i.id === 'string')) return { error: `La sección "${k}" tiene elementos inválidos.` }
  }
  if (!d.members.every((m) => typeof m.name === 'string')) return { error: 'Algún integrante tiene datos dañados.' }
  // hoy es opcional (copias viejas no lo traen)
  const h = d.hoy
  if (h !== undefined && !(isObj(h) && isObj(h.votes) && Array.isArray(h.previas) && h.previas.every((p) => isObj(p) && Array.isArray(p.votes)))) return { error: 'La votación de hoy está dañada.' }
  return { data: { hoy: ref.hoy, probable: ref.probable, ...d }, me: d.members.some((m) => m.id === b.me) ? b.me : null }
}

// --- mensaje de WhatsApp ---
export function hoyMessage(hoy, data, url) {
  const p = winners(hoy.previas, (x) => x.votes.length).map((x) => x.place)
  const b = winners(data.boliches, (x) => Object.values(hoy.votes).filter((v) => v === x.id).length).map((x) => x.name)
  const f = (a) => (a.length ? a.join(' / ') + (a.length > 1 ? ' (empate)' : '') : 'a votar')
  return ['🌙 the perfect night.', `🍻 Previa: ${f(p)}`, `🪩 Boliche: ${f(b)}`, '', `Votá en la app: ${url}`,
    '(Por ahora cada uno ve los votos en su propio celu: este mensaje no los sincroniza.)'].join('\n')
}
