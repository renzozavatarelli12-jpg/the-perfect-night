// Contenido inicial del grupo. Lo marcado "de ejemplo" es ficticio; el resto sale del chat y de lo que confirmó el grupo.
// Se puede editar desde la web, o acá y tocando "Restaurar datos de ejemplo" en Grupo.
const addDays = (n) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
const sat = (new Date().getDay() === 6 ? 7 : 6 - new Date().getDay())

export const seed = () => ({
  members: [
    { id: 'm1', name: 'Renzo', nick: 'Ren', drink: '' },
    { id: 'm2', name: 'Joaco', nick: 'Joaquín', drink: '' },
    { id: 'm3', name: 'Sofi', nick: 'Ratita · Ninia Gandulfo', drink: '' },
    { id: 'm4', name: 'Emi', nick: 'Emilia', drink: '' },
    { id: 'm5', name: 'Tucu', nick: 'Gonzalo · Pan Dulce · El Jeta · Jeton', drink: '' },
    { id: 'm6', name: 'Keka', nick: 'Federica', drink: '' },
  ],
  nights: [
    {
      id: 'n1', title: 'Noche de ejemplo', date: addDays(sat), time: '23:30', zone: 'Recoleta',
      notes: 'Ejemplo: reemplazalo por una noche real.',
      rsvp: { m1: 'yes', m2: 'yes', m3: 'maybe', m6: 'no' },
      previas: [
        { id: 'p1', place: 'Lo de Renzo', votes: ['m1', 'm2'] },
        { id: 'p2', place: 'Lo de Tucu', votes: ['m3'] },
      ],
      votes: { m1: 'b2', m2: 'b3', m3: 'b2' },
      closed: false,
    },
  ],
  boliches: [
    { id: 'b1', name: 'Cruza Polo', zone: 'Palermo', address: 'Av. del Libertador 4100, Campo Argentino de Polo', mapUrl: '', photo: '',
      desc: '+21. Entrada variable según fecha y lista. Perfil cheto, espacioso, con sectores al aire libre. Cachengue, reggaetón y DJs.',
      comments: [{ id: 'c1', by: 'm1', text: 'Se sacan frees por lista antes de ir. Llevar DNI.' }] },
    { id: 'b2', name: 'Cruza Recoleta', zone: 'Recoleta', address: 'Vicente López 2050 (3.er piso, Recoleta Urban Mall)', mapUrl: '', photo: '',
      desc: '+21. Bar con terraza que funciona como boliche, más compacto que Cruza Polo. DJs y música bailable.', comments: [] },
    { id: 'b3', name: 'La Tincho Fierro', zone: 'Recoleta', address: 'Gloria Buenos Aires, Vicente López 2134 (la sede puede variar)', mapUrl: '', photo: '',
      desc: '+21. Descontracturado, estilo peña moderna: folklore en vivo, cachengue y hits argentinos. Suele haber promos de entrada con tragos.', comments: [] },
    { id: 'b4', name: 'Tamarisco', zone: 'Recoleta', address: 'Pres. José Evaristo Uriburu 1073', mapUrl: '', photo: '',
      desc: 'Más rústico e informal que los Cruza: folklore, música en vivo y baile. Opiniones mixtas sobre organización y seguridad.', comments: [] },
  ],
  favDrinks: [
    { id: 'd1', name: 'Fernet con coca', note: 'El clásico de siempre.' },
    { id: 'd2', name: 'Cerveza', note: '' },
    { id: 'd3', name: 'Vino tinto', note: '' },
    { id: 'd4', name: 'Campari', note: '' },
    { id: 'd5', name: 'Gancia', note: '' },
    { id: 'd6', name: 'Sidra', note: '' },
    { id: 'd7', name: 'Gin tonic', note: '' },
    { id: 'd8', name: 'Aperol spritz', note: '' },
    { id: 'd9', name: 'Vodka con jugo', note: '' },
    { id: 'd10', name: 'Whisky', note: '' },
  ],
  drinkVotes: {}, // { idDeIntegrante: [idDeTrago, ...] } hasta 3 por persona
  cocktails: [
    { id: 'k1', name: 'La Especial de ejemplo', recipe: 'Ejemplo: ingredientes y proporciones acá. Secreto de grupo.' },
  ],
  jokes: [
    { id: 'j1', text: 'Dea: lo que se tira después de un chiste.' },
    { id: 'j3', text: 'Los comunicados oficiales de Renzo: “No es juntada. No es ocio. Es inversión en capital humano.”' },
    { id: 'j4', text: 'FLAMA: así se llama el grupo desde que Joaco lo bautizó en 2022.' },
  ],
  phrases: [
    { id: 'f1', text: '“Oka.”', by: 'm3' },
    { id: 'f2', text: '“Boe.”', by: 'm2' },
    { id: 'f3', text: '“Dea.” (cierra todo chiste)', by: 'm1' },
    { id: 'f4', text: '“Ahr.”', by: 'm4' },
    { id: 'f5', text: '“Yo toy.”', by: 'm5' },
    { id: 'f6', text: '“¿Qué hacen?”', by: 'm3' },
  ],
  stats: [
    { id: 's1', label: 'Mensajes el día récord (6/1/2022)', value: '962' },
    { id: 's2', label: 'Mensajes en el chat, aproximadamente', value: '15.700' },
  ],
  stories: [
    { id: 'a1', title: 'Nace el grupo', date: '2021-12-26',
      text: 'Renzo lo crea diciendo que, si quieren, se pueden salir. Años después sigue activo.' },
    { id: 'a2', title: 'Cruza Polo o Argento', date: '2026-09-11',
      text: 'Más de 200 mensajes para decidir adónde salir, con frees por lista y todo.' },
  ],
})
