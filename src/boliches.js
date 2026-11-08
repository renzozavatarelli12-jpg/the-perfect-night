// Lo que muestra cada boliche: foto de lista, link de entradas, mapa. Los datos viven en la fila "boliches" del grupo.
const BASE = import.meta.env.BASE_URL
// Logos de los boliches de siempre (public/boliches). Si el boliche tiene su propia foto, gana esa.
const LOGO = { b1: 'cruza-polo', b2: 'cruza-recoleta', b3: 'la-tincho-fierro', b4: 'tamarisco' }
// Dónde sacar entrada para los de siempre, si nadie cargó otro link en la ficha.
const ENTRADAS = {
  b1: 'https://planout.ar/cruzapolo/HomePlanout',
  b2: 'https://planout.ar/cruzarecoleta/es/HomePlanout',
  b3: 'https://events.flashpass.com.ar/productores/la-tincho-fierro',
  b4: 'https://tr.ee/CI0k0sxObg',
  b5: 'https://events.flashpass.com.ar/productores/argento-3629',
}
export const safeUrl = (u) => (/^https?:\/\/[^\s]+$/i.test((u || '').trim()) ? u.trim() : '')
export const photo = (b) => b.photo || (LOGO[b.id] ? `${BASE}boliches/${LOGO[b.id]}.jpg` : '')
export const tickets = (b) => safeUrl(b.tickets) || ENTRADAS[b.id] || ''
export const feats = (b) => (b.feats || '').split(',').map((x) => x.trim()).filter(Boolean)

// Foto elegida -> JPEG de hasta 1280 px por lado y menos de ~250 KB (lo que acepta el servidor).
export async function shrink(file) {
  const img = await createImageBitmap(file)
  for (const [side, q] of [[1280, 0.75], [1024, 0.65], [800, 0.6], [640, 0.5]]) {
    const k = Math.min(1, side / Math.max(img.width, img.height))
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
    const out = c.toDataURL('image/jpeg', q)
    if (out.length <= 340000) return out
  }
  throw new Error('grande')
}
