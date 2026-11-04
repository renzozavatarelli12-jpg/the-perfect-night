export const uid = () => Math.random().toString(36).slice(2, 9)
export const today = () => new Date().toISOString().slice(0, 10)
export const fmtDate = (d) =>
  new Date(d + 'T12:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
export const who = (members, id) => members.find((m) => m.id === id)?.name ?? '¿?'
export const mapLink = (b) =>
  b.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${b.name} ${b.address || b.zone || ''}`)}`
