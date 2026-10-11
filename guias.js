/* Estilo: paleta personal, reglas para combinar colores, guías por ocasión, ajuste, cuidado de la ropa y barbería. */
'use strict';

/* Qué colores te favorecen y cuáles menos, según tu piel y tu pelo. */
function paleta(p) {
  const c = contraste(p), clara = ['Muy clara', 'Clara'].includes(p.piel), oscura = ['Morena', 'Oscura'].includes(p.piel);
  if (!p.piel) return null;
  const si = new Set(['Azul marino', 'Blanco', 'Gris', 'Vaquero']), no = new Set();
  if (c === 'alto') { si.add('Negro'); si.add('Burdeos'); si.add('Verde'); no.add('Beis'); no.add('Amarillo'); }
  if (c === 'bajo') { si.add('Beis'); si.add('Marrón'); si.add('Verde oliva'); no.add('Negro'); }
  if (c === 'medio') { si.add('Verde oliva'); si.add('Burdeos'); si.add('Azul claro'); }
  if (clara) { si.add('Burdeos'); no.add('Naranja'); no.add('Amarillo'); }
  if (oscura || p.piel === 'Media') { si.add('Verde oliva'); si.add('Marrón'); si.add('Burdeos'); no.add('Beis'); }
  if (['Verdes', 'Azules', 'Grises'].includes(p.ojos)) si.add(p.ojos === 'Verdes' ? 'Verde' : 'Azul claro');
  if (p.ojos === 'Marrones') si.add('Marrón');
  for (const x of si) no.delete(x);
  return { si: [...si], no: [...no] };
}

/* ¿Combinan dos colores? 2 = sí, 1 = con cuidado, 0 = mejor no. */
const RIESGO = [['Negro', 'Azul marino'], ['Negro', 'Marrón'], ['Vaquero', 'Vaquero'], ['Rojo', 'Rosa'], ['Naranja', 'Rojo'], ['Morado', 'Amarillo']];
function combinan(a, b) {
  if (!a || !b) return 2;
  if (RIESGO.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) return 1;
  if (NEUTROS.includes(a) || NEUTROS.includes(b)) return 2;
  if (a === b) return 1;
  return 0;
}
function notaConjunto(prendas) {
  const cols = prendas.map(p => p.color).filter(Boolean), fuertes = cols.filter(c => !NEUTROS.includes(c));
  let peor = 2; for (let i = 0; i < cols.length; i++) for (let j = i + 1; j < cols.length; j++) peor = Math.min(peor, combinan(cols[i], cols[j]));
  if (fuertes.length > 1 || peor === 0) return { n: 0, t: 'Demasiados colores fuertes juntos. Cambia uno por un neutro.' };
  if (peor === 1) return { n: 1, t: cols.filter(c => c === 'Vaquero').length > 1 ? 'Doble vaquero: funciona solo si son tonos bastante distintos.' : 'Combinación arriesgada: puede funcionar, pero mira cómo queda en el espejo.' };
  return { n: 2, t: fuertes.length ? `Bien: un color con fuerza (${fuertes[0].toLowerCase()}) y lo demás neutro.` : 'Bien: todo neutros, no falla.' };
}

/* Qué categorías pegan con cada ocasión. */
const OCASION_CATS = {
  Diario: null,
  Trabajo: { arriba: ['Camisas', 'Polos', 'Sudaderas y jerséis', 'Camisetas'], abajo: ['Pantalones', 'Vaqueros'] },
  Cita: { arriba: ['Camisas', 'Polos', 'Sudaderas y jerséis', 'Camisetas'], abajo: ['Vaqueros', 'Pantalones'] },
  Fiesta: { arriba: ['Camisas', 'Camisetas', 'Polos'], abajo: ['Vaqueros', 'Pantalones'] },
  Deporte: { arriba: ['Deporte', 'Camisetas', 'Sudaderas y jerséis'], abajo: ['Deporte', 'Pantalón corto'] }
};

const GUIAS = [
  { id: 'cita', t: 'Qué ponerte en una cita', i: '🍷', l: [
    'Un nivel por encima de lo que llevarías un día normal, sin parecer disfrazado. Si el sitio es un bar, camisa o polo con vaqueros oscuros y zapatillas limpias.',
    'Ropa que ya hayas probado y en la que estés cómodo. Estrenar algo que no sabes cómo te queda añade nervios.',
    'Lo que más se nota de cerca: pelo recién arreglado, barba perfilada, uñas, olor (dos toques de colonia) y ropa sin arrugas.',
    'Para una cita de día (paseo, café): camiseta lisa o polo, chino o vaquero y una sobrecamisa por si refresca.',
    'Evita logos grandes, camisetas con mensajes y ropa de deporte (salvo que el plan sea deporte).'
  ] },
  { id: 'trabajo', t: 'Para el trabajo, sin ir de traje', i: '💼', l: [
    'Fórmula fácil: camisa oxford o polo de punto + chino o vaquero oscuro + zapatilla de piel o zapato sencillo.',
    'En invierno, un jersey fino sobre la camisa (con el cuello por fuera) queda muy bien y abriga.',
    'Ten dos o tres conjuntos «de uniforme» guardados en Conjuntos para no pensar cada mañana.'
  ] },
  { id: 'fiesta', t: 'Para salir de noche o a un festival', i: '🎶', l: [
    'Noche: camisa (de manga corta en verano) o camiseta de buen tejido, vaqueros oscuros y zapatillas que aguanten pisotones.',
    'Festival: ropa que no te importe manchar, una capa ligera para cuando baja la temperatura, calzado cómodo y cerrado. Riñonera o bolsillos con cremallera para el móvil.',
    'Por la noche se ve menos el detalle y más la silueta: prendas que te queden bien de talla y algo de contraste.'
  ] },
  { id: 'boda', t: 'Boda o evento formal', i: '🤵', l: [
    'Si pone «formal», traje azul marino o gris medio: es el más versátil y favorece a casi todos.',
    'Si no tienes traje, una americana azul marino con pantalón gris y camisa blanca resuelve casi cualquier evento.',
    'El traje se ajusta: mangas que dejen ver un dedo de camisa y bajos sin arrugas. Un arreglo de sastre cuesta poco y cambia muchísimo.'
  ] },
  { id: 'entrevista', t: 'Entrevista de trabajo', i: '🗂️', l: [
    'Vístete como la gente que ya trabaja allí, un punto más arreglado.',
    'Colores sobrios (azul marino, gris, blanco). Nada nuevo sin probar antes.',
    'Lo que más resta: arrugas, zapatos sucios y ropa grande.'
  ] },
  { id: 'ajuste', t: 'Cómo debe quedarte la ropa', i: '📏', l: [
    'Camiseta: la costura del hombro en tu hombro; las mangas a mitad del bíceps; el largo, por debajo del cinturón sin pasar de la mitad de la bragueta.',
    'Camisa: puedes meter dos dedos en el cuello abrochado; los botones del pecho no tiran; las mangas llegan a la muñeca.',
    'Pantalón: sin bolsas en el culo ni tela sobrante en los muslos; el bajo toca el zapato con poca o ninguna arruga.',
    'Chaqueta: puedes cruzar los brazos sin que tire en la espalda; las mangas no tapan la mano.',
    'Si dudas entre dos tallas: en camisetas y camisas, la que se ajusta en hombros; en pantalones, la que te queda bien de cintura y luego arreglas el largo.'
  ] },
  { id: 'cuidado', t: 'Cuidar la ropa para que dure y se vea nueva', i: '🧺', l: [
    'Lava a 30 °C y del revés las prendas oscuras y estampadas: pierden menos color.',
    'Los vaqueros, poco y del revés. No hace falta lavarlos cada vez.',
    'Los jerséis de punto, doblados, nunca colgados (se deforman).',
    'Camisas: tiéndelas en percha nada más sacarlas y casi no necesitarás plancha.',
    'Zapatillas blancas: un cepillo con agua y jabón cada semana o dos. Se nota muchísimo.',
    'Las bolitas de los jerséis se quitan con un quitapelusas eléctrico (unos 10 €).'
  ] },
  { id: 'barberia', t: 'Qué pedir en la barbería', i: '💈', l: [
    'Lleva una foto de un corte que te guste en alguien con un pelo parecido al tuyo.',
    'Di cuánto tiempo quieres dedicarle por la mañana: «Algo que pueda peinar en dos minutos».',
    'Pide que te enseñen cómo peinarlo y qué producto usar. Es gratis y lo cambia todo.',
    'Con pelo ondulado: pide que no te lo quiten todo arriba y que lo texturicen para que la onda se vea.',
    'Repite cada 4–5 semanas. Apunta en el móvil qué te hicieron cuando te gusta cómo queda.'
  ] },
  { id: 'fotos', t: 'Salir bien en fotos', i: '📸', l: [
    'Luz de frente o de lado, nunca de arriba (marca ojeras) ni a contraluz.',
    'La cámara a la altura de los ojos o un poco por encima.',
    'Gira un poco el cuerpo y no la cara: queda más natural que de frente total.',
    'Adelanta un poco la barbilla y bájala ligeramente: define la mandíbula.',
    'Sonrisa de verdad: piensa en algo que te haga gracia justo antes.'
  ] }
];
