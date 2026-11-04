// TODO(vos): TODO lo de acá es de EJEMPLO y ficticio. Reemplazalo con lo real
// (desde la propia web, o editando este archivo y tocando "Restaurar ejemplo" en Grupo).
const addDays = (n) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
const sat = (new Date().getDay() === 6 ? 7 : 6 - new Date().getDay())

export const seed = () => ({
  members: [
    { id: 'm1', name: 'Amigo 1', nick: 'El Puntual (ironía)', drink: 'Fernet con coca' },
    { id: 'm2', name: 'Amigo 2', nick: 'DJ de la previa', drink: 'Gin tonic' },
    { id: 'm3', name: 'Amigo 3', nick: 'El Cantante Oficial', drink: 'Cerveza, siempre' },
    { id: 'm4', name: 'Amigo 4', nick: 'La Voz de la Razón', drink: 'Agua con gas (por ahora)' },
    { id: 'm5', name: 'Amigo 5', nick: 'Desaparece a las 3am', drink: 'Campari' },
    { id: 'm6', name: 'Amigo 6', nick: 'El Fotógrafo Borroso', drink: 'Lo que haya' },
  ],
  nights: [
    {
      id: 'n1', title: 'Noche de ejemplo', date: addDays(sat), time: '23:30', zone: 'Zona a definir',
      notes: 'Previa temprano, que la vez pasada llegamos todos tarde.',
      rsvp: { m1: 'yes', m2: 'yes', m3: 'maybe', m5: 'no' },
      previas: [
        { id: 'p1', place: 'Casa de Amigo 2', votes: ['m2', 'm1'] },
        { id: 'p2', place: 'Plaza con parlante', votes: ['m3'] },
      ],
      votes: { m1: 'b1', m2: 'b2', m3: 'b1' },
      closed: false,
    },
    {
      id: 'n2', title: 'Cumple de ejemplo', date: addDays(sat + 14), time: '22:00', zone: 'Zona a definir',
      notes: '', rsvp: { m1: 'yes' }, previas: [], votes: {}, closed: false,
    },
  ],
  boliches: [
    { id: 'b1', name: 'Boliche de ejemplo 1', zone: 'Zona de ejemplo', address: '', mapUrl: '', photo: '',
      desc: 'Reemplazá esto con la descripción real del lugar.',
      comments: [{ id: 'c1', by: 'm1', text: 'Comentario interno de ejemplo: "ahí no se entra sin DNI".' }] },
    { id: 'b2', name: 'Boliche de ejemplo 2', zone: 'Otra zona', address: '', mapUrl: '', photo: '',
      desc: 'Acá va lo que todos saben y nadie dice en voz alta.', comments: [] },
    { id: 'b3', name: 'Boliche de ejemplo 3', zone: 'Zona', address: '', mapUrl: '', photo: '',
      desc: 'El plan B cuando los otros están llenos.', comments: [] },
  ],
  favDrinks: [
    { id: 'd1', name: 'Fernet con coca', note: 'Clásico. No se discute.' },
    { id: 'd2', name: 'Gin tonic', note: 'Para sentirse sofisticados por 20 minutos.' },
    { id: 'd3', name: 'Cerveza', note: 'Base de toda previa.' },
  ],
  cocktails: [
    { id: 'k1', name: 'La Especial de ejemplo', recipe: 'Ingredientes y proporciones acá. Secreto de grupo.' },
  ],
  jokes: [
    { id: 'j1', text: 'Chiste interno de ejemplo #1 (reemplazar).' },
    { id: 'j2', text: 'Otro chiste que nadie de afuera va a entender.' },
  ],
  phrases: [
    { id: 'f1', text: '“Una y nos vamos.”', by: 'm1' },
    { id: 'f2', text: '“Yo ya estoy saliendo.” (en pijama)', by: 'm2' },
    { id: 'f3', text: '“Esta es la última, ahora sí.”', by: 'm3' },
  ],
  rankings: [
    { id: 'r1', title: 'Los que más tardan en llegar', items: 'Amigo 2\nAmigo 5\nAmigo 1' },
    { id: 'r2', title: 'Los que más dicen "ya salgo"', items: 'Amigo 3\nAmigo 6\nAmigo 4' },
  ],
  stats: [
    { id: 's1', label: 'Veces que se dijo "una y nos vamos"', value: '∞' },
    { id: 's2', label: 'Fotos borrosas por noche', value: '37' },
    { id: 's3', label: 'Minutos promedio de "ya llego"', value: '45' },
  ],
  stories: [
    { id: 'a1', title: 'La noche de ejemplo', date: '2025-01-01',
      text: 'Contá acá una anécdota real. Esta es de mentira y ya fue demasiado épica.' },
  ],
})
