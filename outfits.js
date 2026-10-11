/* Outfits pensados por ocasión: piezas concretas (tipo + colores que valen), por qué funcionan y un truco.
   La app los cruza con tu armario: marca lo que ya tienes y lo que te falta. */
'use strict';

const OCASIONES_IDEAS = ['Trabajo', 'Cita', 'Noche', 'Finde', 'Evento', 'Deporte'];
// Qué ocasión toca cada día por defecto (0 = domingo). Se puede cambiar tocando el día.
const SEMANA_OC = { 0: 'Finde', 1: 'Trabajo', 2: 'Trabajo', 3: 'Trabajo', 4: 'Trabajo', 5: 'Trabajo', 6: 'Finde' };

const OUTFITS = [
  // ---------- Trabajo ----------
  { id: 'tr-oxford', oc: 'Trabajo', t: 'Camisa oxford y chino', clima: ['Entretiempo', 'Frío', 'Calor'], piezas: [
    { cats: ['Camisas'], col: ['Azul claro', 'Blanco'], d: 'Camisa oxford azul claro o blanca, por fuera si es corta' },
    { cats: ['Pantalones'], col: ['Azul marino', 'Beis', 'Gris'], d: 'Chino azul marino o beis' },
    { cats: ['Zapatillas', 'Zapatos'], col: ['Blanco', 'Marrón', 'Negro'], d: 'Zapatilla blanca de piel o zapato marrón' }],
    por: 'Es el uniforme que nunca falla en una oficina: arreglado sin parecer de boda.', truco: 'Remanga dos vueltas las mangas: queda más natural.' },
  { id: 'tr-jersey', oc: 'Trabajo', t: 'Jersey sobre camisa', clima: ['Frío', 'Entretiempo'], piezas: [
    { cats: ['Sudaderas y jerséis'], col: ['Azul marino', 'Gris', 'Burdeos', 'Verde oliva'], d: 'Jersey fino de cuello redondo, liso' },
    { cats: ['Camisas'], col: ['Blanco', 'Azul claro'], d: 'Camisa con el cuello por fuera del jersey' },
    { cats: ['Vaqueros', 'Pantalones'], col: ['Vaquero', 'Gris', 'Azul marino'], d: 'Vaquero oscuro o pantalón gris' },
    { cats: ['Zapatos', 'Zapatillas'], col: ['Marrón', 'Negro', 'Blanco'], d: 'Botín marrón o zapatilla de piel' }],
    por: 'Dos capas dan estructura al torso y disimulan la tripa mejor que una prenda sola.', truco: 'Que el jersey sea de tu talla: si hace bolsas, pierde la gracia.' },
  { id: 'tr-polo', oc: 'Trabajo', t: 'Polo de punto y pantalón claro', clima: ['Calor', 'Entretiempo'], piezas: [
    { cats: ['Polos'], col: ['Azul marino', 'Blanco', 'Burdeos', 'Verde oliva'], d: 'Polo liso, mejor de punto que de piqué' },
    { cats: ['Pantalones'], col: ['Beis', 'Gris', 'Azul marino'], d: 'Chino o pantalón de lino' },
    { cats: ['Zapatillas'], col: ['Blanco'], d: 'Zapatilla blanca limpia' }],
    por: 'Fresco en verano y más cuidado que una camiseta.', truco: 'Polo oscuro arriba y pantalón claro: estiliza la parte de arriba.' },
  { id: 'tr-sobrecamisa', oc: 'Trabajo', t: 'Camiseta, sobrecamisa y vaquero', clima: ['Entretiempo', 'Frío'], piezas: [
    { cats: ['Camisetas'], col: ['Blanco', 'Negro', 'Gris'], d: 'Camiseta lisa de buen tejido' },
    { cats: ['Chaquetas y abrigos', 'Camisas'], col: ['Verde oliva', 'Azul marino', 'Marrón', 'Beis'], d: 'Sobrecamisa abierta' },
    { cats: ['Vaqueros'], col: ['Vaquero', 'Negro'], d: 'Vaquero recto oscuro' },
    { cats: ['Zapatillas', 'Zapatos'], col: ['Blanco', 'Marrón'], d: 'Zapatilla blanca o botín' }],
    por: 'La sobrecamisa abierta crea una línea vertical que alarga y disimula la cintura.', truco: 'Para el viernes, el mismo conjunto con camiseta negra ya vale para salir después.' },

  // ---------- Cita ----------
  { id: 'ci-bar', oc: 'Cita', t: 'Cita en un bar: negro y vaquero', clima: ['Entretiempo', 'Frío', 'Calor'], piezas: [
    { cats: ['Camisetas', 'Polos'], col: ['Negro', 'Azul marino'], d: 'Camiseta o polo negro de buen tejido' },
    { cats: ['Vaqueros'], col: ['Vaquero'], d: 'Vaquero azul oscuro, sin rotos' },
    { cats: ['Zapatillas'], col: ['Blanco'], d: 'Zapatillas blancas impecables' },
    { cats: ['Chaquetas y abrigos'], col: ['Negro', 'Marrón', 'Verde oliva', 'Vaquero'], d: 'Chaqueta si refresca (cazadora, sobrecamisa)', opc: true }],
    por: 'El negro cerca de la cara te da contraste con el pelo oscuro y estiliza. Sencillo, cuidado y seguro.', truco: 'Lo que más se nota de cerca: barba perfilada, uñas y dos toques de colonia.' },
  { id: 'ci-cena', oc: 'Cita', t: 'Cena: camisa y chino oscuro', clima: ['Entretiempo', 'Frío', 'Calor'], piezas: [
    { cats: ['Camisas'], col: ['Blanco', 'Azul marino', 'Azul claro', 'Burdeos'], d: 'Camisa lisa, un botón abierto' },
    { cats: ['Pantalones', 'Vaqueros'], col: ['Azul marino', 'Negro', 'Vaquero', 'Gris'], d: 'Chino oscuro o vaquero oscuro' },
    { cats: ['Zapatos', 'Zapatillas'], col: ['Marrón', 'Negro', 'Blanco'], d: 'Zapato o zapatilla de piel' }],
    por: 'Un nivel por encima de tu día normal, sin parecer disfrazado.', truco: 'Camisa por dentro solo si el pantalón tiene buen tiro y llevas cinturón; si no, por fuera y del largo justo.' },
  { id: 'ci-dia', oc: 'Cita', t: 'Cita de día: paseo o café', clima: ['Calor', 'Entretiempo'], piezas: [
    { cats: ['Camisetas', 'Polos'], col: ['Blanco', 'Azul marino', 'Verde oliva'], d: 'Camiseta o polo liso' },
    { cats: ['Pantalones', 'Vaqueros', 'Pantalón corto'], col: ['Beis', 'Vaquero', 'Azul marino'], d: 'Chino beis o vaquero; corto solo si es plan de playa' },
    { cats: ['Zapatillas'], col: ['Blanco'], d: 'Zapatillas limpias' },
    { cats: ['Chaquetas y abrigos', 'Camisas'], col: ['Vaquero', 'Verde oliva', 'Azul marino'], d: 'Sobrecamisa por si refresca', opc: true }],
    por: 'Relajado pero pensado: transmite que te has preparado sin pasarte.', truco: 'Gafas de sol en la mano o en el cuello de la camiseta, no en la cabeza.' },
  { id: 'ci-invierno', oc: 'Cita', t: 'Cita en invierno: capas oscuras', clima: ['Frío'], piezas: [
    { cats: ['Sudaderas y jerséis'], col: ['Negro', 'Azul marino', 'Burdeos', 'Gris'], d: 'Jersey de punto grueso' },
    { cats: ['Vaqueros', 'Pantalones'], col: ['Vaquero', 'Negro', 'Gris'], d: 'Vaquero oscuro' },
    { cats: ['Zapatos', 'Zapatillas'], col: ['Marrón', 'Negro'], d: 'Botín' },
    { cats: ['Chaquetas y abrigos'], col: ['Azul marino', 'Negro', 'Marrón', 'Gris'], d: 'Abrigo o chaquetón que llegue a la cadera' }],
    por: 'El abrigo con estructura da hombros y alarga la figura. Muy favorecedor para ti.', truco: 'El burdeos cerca de la cara es de tus mejores colores.' },

  // ---------- Noche ----------
  { id: 'no-disco', oc: 'Noche', t: 'Discoteca o bar de copas', clima: ['Entretiempo', 'Frío', 'Calor'], piezas: [
    { cats: ['Camisas', 'Camisetas'], col: ['Negro', 'Azul marino', 'Blanco', 'Estampado'], d: 'Camisa negra o camiseta de buen tejido' },
    { cats: ['Vaqueros', 'Pantalones'], col: ['Negro', 'Vaquero'], d: 'Vaquero negro o muy oscuro' },
    { cats: ['Zapatillas'], col: ['Blanco', 'Negro'], d: 'Zapatillas que aguanten pisotones' }],
    por: 'De noche se ve la silueta y el contraste, no el detalle. El negro te estiliza y te da presencia.', truco: 'En verano, camisa de manga corta abierta sobre camiseta blanca.' },
  { id: 'no-festival', oc: 'Noche', t: 'Festival o concierto', clima: ['Calor', 'Entretiempo'], piezas: [
    { cats: ['Camisetas', 'Camisas'], col: ['Negro', 'Blanco', 'Estampado', 'Verde oliva'], d: 'Camiseta o camisa de manga corta' },
    { cats: ['Vaqueros', 'Pantalón corto', 'Pantalones'], col: ['Vaquero', 'Negro', 'Beis'], d: 'Vaquero o corto cómodo' },
    { cats: ['Zapatillas'], col: ['Negro', 'Blanco', 'Gris'], d: 'Zapatillas cerradas y cómodas (mejor oscuras)' },
    { cats: ['Chaquetas y abrigos', 'Sudaderas y jerséis'], col: ['Negro', 'Vaquero', 'Verde oliva', 'Gris'], d: 'Una capa ligera para la madrugada', opc: true }],
    por: 'Cómodo, que no te importe manchar y que aguante horas de pie.', truco: 'Riñonera o bolsillo con cremallera para el móvil.' },

  // ---------- Finde ----------
  { id: 'fi-basico', oc: 'Finde', t: 'Finde sencillo', clima: ['Entretiempo', 'Calor', 'Frío'], piezas: [
    { cats: ['Camisetas', 'Sudaderas y jerséis'], col: ['Blanco', 'Gris', 'Azul marino', 'Negro', 'Verde oliva'], d: 'Camiseta o sudadera lisa' },
    { cats: ['Vaqueros', 'Pantalones'], col: ['Vaquero', 'Beis'], d: 'Vaquero recto' },
    { cats: ['Zapatillas'], col: ['Blanco', 'Gris'], d: 'Zapatillas' }],
    por: 'Lo de siempre, pero de tu talla y limpio: eso ya es ir mejor que la mayoría.', truco: 'Sudadera sin logos grandes: parece más cara.' },
  { id: 'fi-verano', oc: 'Finde', t: 'Finde de verano', clima: ['Calor'], piezas: [
    { cats: ['Camisas', 'Polos', 'Camisetas'], col: ['Blanco', 'Azul claro', 'Beis', 'Verde oliva'], d: 'Camisa de lino o manga corta' },
    { cats: ['Pantalón corto', 'Pantalones'], col: ['Beis', 'Azul marino', 'Vaquero'], d: 'Bermuda por encima de la rodilla o pantalón de lino' },
    { cats: ['Zapatillas', 'Zapatos'], col: ['Blanco', 'Marrón'], d: 'Zapatilla blanca o náutico' }],
    por: 'Tejidos que no se pegan al cuerpo: más frescos y más favorecedores.', truco: 'La bermuda, que no pase de la rodilla: acorta las piernas.' },
  { id: 'fi-familia', oc: 'Finde', t: 'Comida familiar', clima: ['Entretiempo', 'Frío', 'Calor'], piezas: [
    { cats: ['Camisas', 'Polos', 'Sudaderas y jerséis'], col: ['Azul claro', 'Azul marino', 'Blanco', 'Verde oliva'], d: 'Camisa o polo' },
    { cats: ['Pantalones', 'Vaqueros'], col: ['Beis', 'Vaquero', 'Azul marino'], d: 'Chino o vaquero' },
    { cats: ['Zapatillas', 'Zapatos'], col: ['Blanco', 'Marrón'], d: 'Zapatilla limpia' }],
    por: 'Cuidado sin esfuerzo.', truco: 'Una prenda de punto en los hombros si va a refrescar.' },

  // ---------- Evento ----------
  { id: 'ev-boda', oc: 'Evento', t: 'Boda', clima: ['Entretiempo', 'Frío', 'Calor'], piezas: [
    { cats: ['Chaquetas y abrigos'], col: ['Azul marino', 'Gris'], d: 'Traje azul marino o gris medio' },
    { cats: ['Camisas'], col: ['Blanco', 'Azul claro'], d: 'Camisa blanca o azul muy claro' },
    { cats: ['Pantalones'], col: ['Azul marino', 'Gris'], d: 'Pantalón del traje' },
    { cats: ['Zapatos'], col: ['Marrón', 'Negro'], d: 'Zapato de piel (marrón de día, negro de noche)' }],
    por: 'El azul marino favorece a casi todos y con tu pelo oscuro queda muy bien.', truco: 'Lleva el traje a arreglar: mangas y bajos bien ajustados cambian por completo cómo te queda.' },
  { id: 'ev-entrevista', oc: 'Evento', t: 'Entrevista de trabajo', clima: ['Entretiempo', 'Frío', 'Calor'], piezas: [
    { cats: ['Camisas'], col: ['Blanco', 'Azul claro'], d: 'Camisa lisa planchada' },
    { cats: ['Pantalones'], col: ['Azul marino', 'Gris'], d: 'Chino o pantalón de vestir oscuro' },
    { cats: ['Zapatos'], col: ['Marrón', 'Negro'], d: 'Zapato limpio' },
    { cats: ['Chaquetas y abrigos'], col: ['Azul marino', 'Gris'], d: 'Americana si el sitio es formal', opc: true }],
    por: 'Sobrio y cuidado: que hablen de ti, no de tu ropa.', truco: 'Pruébatelo entero el día antes.' },
  { id: 'ev-cumple', oc: 'Evento', t: 'Cumpleaños o cena con amigos', clima: ['Entretiempo', 'Frío', 'Calor'], piezas: [
    { cats: ['Camisetas', 'Camisas', 'Sudaderas y jerséis'], col: ['Negro', 'Azul marino', 'Burdeos', 'Blanco'], d: 'Prenda lisa oscura de buen tejido' },
    { cats: ['Vaqueros'], col: ['Vaquero', 'Negro'], d: 'Vaquero oscuro' },
    { cats: ['Zapatillas', 'Zapatos'], col: ['Blanco', 'Negro', 'Marrón'], d: 'Zapatillas limpias' }],
    por: 'Vas a salir en fotos: oscuro arriba te estiliza en todas.', truco: 'En las fotos, cámara a la altura de los ojos o un poco por encima, nunca desde abajo.' },

  // ---------- Deporte ----------
  { id: 'de-gym', oc: 'Deporte', t: 'Gimnasio', clima: ['Entretiempo', 'Frío', 'Calor'], piezas: [
    { cats: ['Deporte', 'Camisetas'], col: ['Negro', 'Gris', 'Azul marino'], d: 'Camiseta técnica oscura' },
    { cats: ['Deporte', 'Pantalón corto'], col: ['Negro', 'Gris', 'Azul marino'], d: 'Pantalón corto o jogger' },
    { cats: ['Zapatillas'], col: ['Negro', 'Blanco', 'Gris'], d: 'Zapatillas de deporte' }],
    por: 'Oscuro y técnico: no marca el sudor y te sientes más cómodo.', truco: 'Camiseta técnica de tu talla, no XL: las anchas te hacen más ancho.' },
  { id: 'de-andar', oc: 'Deporte', t: 'Caminar o salir a correr', clima: ['Entretiempo', 'Calor', 'Frío'], piezas: [
    { cats: ['Deporte', 'Camisetas', 'Sudaderas y jerséis'], col: ['Negro', 'Gris', 'Azul marino', 'Verde oliva'], d: 'Camiseta técnica o sudadera ligera' },
    { cats: ['Deporte', 'Pantalones', 'Pantalón corto'], col: ['Negro', 'Gris'], d: 'Jogger o corto' },
    { cats: ['Zapatillas'], col: ['Negro', 'Gris', 'Blanco'], d: 'Zapatillas cómodas' }],
    por: 'Cómodo y discreto.', truco: '' }
];

// ¿Qué prenda de tu armario encaja con una pieza? La de mejor color y menos puesta.
function encajaPieza(pz, prendas, usadas) {
  const l = prendas.filter(p => pz.cats.includes(p.cat) && !usadas.has(p.id) && !p.estado);
  const exacta = l.filter(p => pz.col.includes(p.color)).sort((a, b) => pz.col.indexOf(a.color) - pz.col.indexOf(b.color));
  return exacta[0] || null;
}
function cruzarOutfit(o, prendas) {
  const usadas = new Set(), res = o.piezas.map(pz => { const p = encajaPieza(pz, prendas, usadas); if (p) usadas.add(p.id); return { pz, p }; });
  const falta = res.filter(r => !r.p && !r.pz.opc);
  return { res, falta, completo: !falta.length };
}
// Reordena los colores de cada pieza según tu paleta: primero los que más te favorecen.
function personalizar(o, pal) {
  if (!pal) return o;
  const rank = c => pal.si.includes(c) ? 0 : pal.no.includes(c) ? 2 : 1;
  return Object.assign({}, o, { piezas: o.piezas.map(pz => Object.assign({}, pz, { col: pz.col.slice().sort((a, b) => rank(a) - rank(b)) })) });
}
