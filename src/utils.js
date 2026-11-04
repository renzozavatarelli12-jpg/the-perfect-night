import { seed } from './data/seed'

export const uid = () => Math.random().toString(36).slice(2, 9)
export const today = () => new Date().toISOString().slice(0, 10)
export const fmtDate = (d) =>
  new Date(d + 'T12:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
export const who = (members, id) => members.find((m) => m.id === id)?.name ?? '¿?'
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
  for (const k of Object.keys(seed())) {
    if (!Array.isArray(d[k])) return { error: `Falta la sección "${k}" o está dañada.` }
    if (!d[k].every((i) => isObj(i) && typeof i.id === 'string')) return { error: `La sección "${k}" tiene elementos inválidos.` }
  }
  const okNight = (n) => isObj(n.rsvp) && isObj(n.votes) && /^\d{4}-\d{2}-\d{2}$/.test(n.date) && typeof n.time === 'string' &&
    Array.isArray(n.previas) && n.previas.every((p) => isObj(p) && Array.isArray(p.votes))
  if (!d.nights.every(okNight)) return { error: 'Alguna noche tiene datos dañados.' }
  if (!d.boliches.every((x) => Array.isArray(x.comments))) return { error: 'Algún boliche tiene datos dañados.' }
  if (!d.members.every((m) => typeof m.name === 'string')) return { error: 'Algún integrante tiene datos dañados.' }
  return { data: d, me: d.members.some((m) => m.id === b.me) ? b.me : null }
}

// --- mensaje de WhatsApp ---
export function nightMessage(night, data, url) {
  const going = data.members.filter((m) => night.rsvp[m.id] === 'yes').map((m) => m.name)
  const counts = data.boliches.map((b) => [b.name, Object.values(night.votes).filter((v) => v === b.id).length])
  const max = Math.max(0, ...counts.map((c) => c[1]))
  const top = max ? counts.filter((c) => c[1] === max).map((c) => c[0]) : []
  const pmax = Math.max(0, ...night.previas.map((p) => p.votes.length))
  const previa = !night.previas.length ? null
    : pmax ? night.previas.filter((p) => p.votes.length === pmax).map((p) => p.place).join(' / ')
    : `a votar (${night.previas.map((p) => p.place).join(', ')})`
  const boliche = !top.length ? 'todavía sin votos' : night.closed ? top.join(' / ') : `${top.join(' / ')} (${top.length > 1 ? 'empate, por ahora' : 'va ganando'})`
  return [
    `🌙 ${night.title}`,
    `📅 ${fmtDate(night.date)} · ${night.time} hs`,
    night.zone ? `📍 ${night.zone}` : null,
    previa ? `🍻 Previa: ${previa}` : null,
    `🪩 Boliche: ${boliche}`,
    `✅ Van${going.length ? ` (${going.length}): ${going.join(', ')}` : ': todavía nadie confirmó'}`,
    night.notes ? `📝 ${night.notes}` : null,
    '',
    `Entrá a la app: ${url}`,
    '(Resumen al momento de enviarlo. Cada uno ve y carga sus votos en su propio navegador: este mensaje no sincroniza nada.)',
  ].filter((l) => l !== null).join('\n')
}
