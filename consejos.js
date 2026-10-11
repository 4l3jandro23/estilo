/* Datos y reglas de Estilo: perfil, categorías y consejos que se adaptan a cómo eres. */
'use strict';

const CATS = ['Camisetas', 'Camisas', 'Polos', 'Sudaderas y jerséis', 'Chaquetas y abrigos', 'Vaqueros', 'Pantalones', 'Pantalón corto', 'Zapatillas', 'Zapatos', 'Accesorios', 'Deporte', 'Casa'];
const PARTE = { arriba: ['Camisetas', 'Camisas', 'Polos', 'Sudaderas y jerséis'], abajo: ['Vaqueros', 'Pantalones', 'Pantalón corto'], pies: ['Zapatillas', 'Zapatos'], encima: ['Chaquetas y abrigos'] };
const COLORES = ['Blanco', 'Negro', 'Gris', 'Azul marino', 'Azul claro', 'Vaquero', 'Beis', 'Marrón', 'Verde oliva', 'Verde', 'Burdeos', 'Rojo', 'Amarillo', 'Naranja', 'Rosa', 'Morado', 'Estampado'];
const HEX = { 'Blanco': '#F7F7F5', 'Negro': '#1C1C1E', 'Gris': '#8E9196', 'Azul marino': '#1F2D4D', 'Azul claro': '#9DB8DA', 'Vaquero': '#4C6A92', 'Beis': '#D8C7A8', 'Marrón': '#6E4B32', 'Verde oliva': '#6B6E3C', 'Verde': '#3F8A57', 'Burdeos': '#6E1F2E', 'Rojo': '#C73A33', 'Amarillo': '#E8C547', 'Naranja': '#E07B39', 'Rosa': '#E3A3B5', 'Morado': '#6C4C8E', 'Estampado': 'linear-gradient(135deg,#C73A33 0 33%,#E8C547 33% 66%,#3F8A57 66%)' };
const NEUTROS = ['Blanco', 'Negro', 'Gris', 'Azul marino', 'Azul claro', 'Vaquero', 'Beis', 'Marrón', 'Verde oliva'];
const TEMPS = ['Todo el año', 'Calor', 'Frío'];
const OCASIONES = ['Diario', 'Trabajo', 'Cita', 'Fiesta', 'Deporte'];

const PERFIL_CAMPOS = [
  { k: 'altura', t: 'Altura', tipo: 'num', u: 'cm' },
  { k: 'peso', t: 'Peso aproximado', tipo: 'num', u: 'kg' },
  { k: 'complexion', t: 'Complexión', op: ['Delgado', 'Normal', 'Fuerte o ancho', 'Con algo de tripa'] },
  { k: 'piel', t: 'Tono de piel', op: ['Muy clara', 'Clara', 'Media', 'Morena', 'Oscura'] },
  { k: 'pelo', t: 'Color de pelo', op: ['Negro', 'Castaño oscuro', 'Castaño claro', 'Rubio', 'Pelirrojo', 'Con canas'] },
  { k: 'ojos', t: 'Color de ojos', op: ['Marrones', 'Verdes', 'Azules', 'Grises'] },
  { k: 'pelotipo', t: 'Tipo de pelo', op: ['Liso', 'Ondulado', 'Rizado'] },
  { k: 'entradas', t: 'Entradas o poco pelo arriba', op: ['No', 'Algo', 'Bastantes'] },
  { k: 'cara', t: 'Forma de la cara', op: ['Ovalada', 'Redonda', 'Cuadrada', 'Alargada', 'No lo sé'], ayuda: 'Mírate al espejo con el pelo hacia atrás. Redonda: casi igual de ancha que de larga y sin ángulos. Cuadrada: mandíbula marcada. Alargada: bastante más larga que ancha. Ovalada: algo más larga que ancha, sin ángulos marcados.' },
  { k: 'barba', t: 'Barba', op: ['Afeitado', 'De pocos días', 'Corta', 'Larga', 'Me sale poca o a calvas'] },
  { k: 'gafas', t: 'Gafas', op: ['No', 'Sí'] },
  { k: 'tipopiel', t: 'Tu piel', op: ['Normal', 'Grasa (brilla)', 'Seca (tirante)', 'Mixta (brilla en la frente y nariz)', 'Sensible (se irrita)'] },
  { k: 'granos', t: 'Granos o rojeces', op: ['No', 'A veces', 'A menudo'] },
  { k: 'presupuesto', t: 'Presupuesto al mes para ropa y cuidado', op: ['Menos de 30 €', '30–80 €', '80–150 €', 'Más de 150 €'] },
  { k: 'estilo', t: 'Estilo que te gusta', op: ['Sencillo y limpio', 'Deportivo', 'Más arreglado', 'Urbano', 'No lo sé'], multi: true },
  { k: 'tiendas', t: 'Tiendas donde sueles comprar', tipo: 'text' },
  { k: 'preocupa', t: 'Lo que más te preocupa de tu aspecto', tipo: 'text' }
];

/* Fondo de armario: lo que conviene tener según tu estilo. min = cuántas prendas de esa categoría. */
const BASICOS = [
  { n: 'Camisetas lisas de tu talla (blanca, negra, azul marino y gris)', cat: 'Camisetas', min: 4, por: 'Son la base de todo. Lisas combinan con cualquier cosa.' },
  { n: 'Una camisa lisa (blanca o azul claro) y una de cuadros u oxford', cat: 'Camisas', min: 2, por: 'Para citas, cenas y cuando quieres ir un poco más arreglado sin parecer de boda.' },
  { n: 'Un jersey o sudadera lisa de color neutro', cat: 'Sudaderas y jerséis', min: 2, por: 'Para el entretiempo y encima de una camisa.' },
  { n: 'Una chaqueta para el entretiempo (vaquera, sobrecamisa o bomber) y un abrigo', cat: 'Chaquetas y abrigos', min: 2, por: 'Una buena chaqueta sube cualquier conjunto sencillo.' },
  { n: 'Vaqueros rectos o ajustados (sin rotos), azul oscuro y uno más', cat: 'Vaqueros', min: 2, por: 'El azul oscuro es el más versátil y el que más estiliza.' },
  { n: 'Un pantalón chino (beis o azul marino)', cat: 'Pantalones', min: 1, por: 'Para cuando quieres algo distinto a vaqueros.' },
  { n: 'Zapatillas blancas o neutras limpias', cat: 'Zapatillas', min: 2, por: 'Las zapatillas limpias dicen mucho. Las sucias, también.' },
  { n: 'Unos zapatos o botines', cat: 'Zapatos', min: 1, por: 'Para ocasiones en las que las zapatillas no pegan.' },
  { n: 'Un cinturón marrón o negro y un reloj sencillo', cat: 'Accesorios', min: 1, por: 'Pequeños detalles que hacen que el conjunto parezca pensado.' }
];
const BASICOS_ESTILO = {
  'Deportivo': [{ n: 'Un chándal o jogger de buena calidad, sin logos grandes', cat: 'Deporte', min: 1, por: 'Deportivo pero cuidado, no de estar por casa.' }],
  'Más arreglado': [{ n: 'Una americana desestructurada (azul marino o gris)', cat: 'Chaquetas y abrigos', min: 3, por: 'Con camiseta o camisa, te arregla al instante sin traje.' }],
  'Urbano': [{ n: 'Una sobrecamisa o chaqueta de corte amplio y unas zapatillas con personalidad', cat: 'Chaquetas y abrigos', min: 3, por: 'El estilo urbano juega con volúmenes, pero siempre con la talla bien elegida.' }]
};

function contraste(p) {
  const pielClara = ['Muy clara', 'Clara'].includes(p.piel), pelOsc = ['Negro', 'Castaño oscuro'].includes(p.pelo);
  const pielOsc = ['Morena', 'Oscura'].includes(p.piel), pelClaro = ['Rubio', 'Castaño claro', 'Pelirrojo'].includes(p.pelo);
  if (pielClara && pelOsc) return 'alto';
  if ((pielClara && pelClaro) || (pielOsc && pelOsc)) return 'bajo';
  return 'medio';
}

/* Devuelve [[título, [consejos]]] adaptados al perfil. */
function consejos(p) {
  const out = [], alt = +p.altura || 0, est = p.estilo || [];
  if (!p.piel && !p.complexion && !p.cara) return out;

  // Colores
  const col = [];
  const c = contraste(p);
  if (c === 'alto') col.push('Tienes contraste alto (piel clara y pelo oscuro): te quedan muy bien las combinaciones contrastadas, como azul marino con blanco o negro con blanco.', 'Evita ir todo en tonos pálidos y lavados: te apagan.');
  if (c === 'bajo') col.push('Tienes contraste bajo entre piel y pelo: te favorecen los conjuntos con poco contraste (tonos de la misma familia, como gris y azul marino, o beis y marrón).', 'El blanco y negro fuerte puede «comerte» la cara.');
  if (c === 'medio') col.push('Tienes contraste medio: te van bien casi todos los neutros. Combina uno claro con uno oscuro (por ejemplo, camiseta clara con vaquero oscuro).');
  if (['Morena', 'Oscura', 'Media'].includes(p.piel)) col.push('Con tu tono de piel lucen mucho el blanco, el verde oliva, el burdeos y los tonos tierra. Evita prendas beis muy parecidas a tu piel junto a la cara.');
  if (['Muy clara', 'Clara'].includes(p.piel)) col.push('Con piel clara te favorecen el azul marino, el gris, el verde botella y el burdeos. El amarillo y el naranja pálidos cerca de la cara suelen apagarte.');
  if (['Verdes', 'Azules', 'Grises'].includes(p.ojos)) col.push(`Tus ojos ${p.ojos.toLowerCase()} destacan con una prenda de un tono parecido cerca de la cara (camiseta o jersey).`);
  col.push('Regla fácil: máximo un color llamativo por conjunto. Lo demás, neutros.');
  out.push(['Los colores que más te favorecen', col]);

  // Cuerpo y cortes de ropa
  const cu = [];
  if (p.complexion === 'Delgado') cu.push('Las capas te dan volumen: camiseta + camisa abierta, o camisa + jersey.', 'Prendas ajustadas a tu talla, no grandes: lo ancho hace que parezcas más delgado.', 'Tejidos con algo de cuerpo (punto grueso, sudadera gruesa, sobrecamisa) mejor que los finos.', 'Colores claros arriba ensanchan los hombros.');
  if (p.complexion === 'Fuerte o ancho') cu.push('Cuello en V o camisas abiertas un botón: alargan el torso.', 'Talla correcta en hombros, ni apretada ni ancha.', 'Pantalones rectos (no muy ajustados) para equilibrar con la parte de arriba.');
  if (p.complexion === 'Con algo de tripa') cu.push('Colores oscuros arriba y prendas lisas: estilizan.', 'Camisas por fuera, con el largo justo por debajo del cinturón.', 'Chaquetas o sobrecamisas abiertas crean una línea vertical que alarga.', 'Evita camisetas muy ceñidas a la tripa y las demasiado anchas (suman volumen). Lo ideal: que caigan rectas.', 'Pantalón de tiro medio, ni muy bajo ni muy alto.');
  if (p.complexion === 'Normal') cu.push('Tienes margen para casi todo: lo que importa es la talla. Camisetas que se ajusten en los hombros y pantalones que no hagan bolsas.');
  if (alt && alt < 172) cu.push('Para tu altura: conjuntos de colores parecidos (por ejemplo, todo oscuro) alargan la figura.', 'Pantalones que acaben en el tobillo sin arrugas acumuladas y camisetas que no pasen de la mitad de la bragueta.', 'Evita contrastes fuertes entre arriba y abajo: «cortan» la figura.');
  if (alt && alt > 186) cu.push('Para tu altura: puedes jugar con capas y con contraste entre arriba y abajo.', 'Busca tallas «largas» (tall) en camisas y pantalones: evitan que se te queden cortos.');
  cu.push('La talla correcta vale más que la marca. Un arreglo de bajos en una costurera (unos 8–12 €) hace que unos vaqueros baratos parezcan buenos.');
  out.push(['Tu cuerpo: qué ropa y qué cortes', cu]);

  // Pelo
  const pe = [];
  const caraPelo = { 'Redonda': 'Cara redonda: busca volumen arriba y lados cortos (por ejemplo, un degradado con algo de largo arriba). Evita el flequillo recto y el pelo pegado.', 'Cuadrada': 'Cara cuadrada: te queda bien casi cualquier corte. Un clásico corto con textura arriba resalta tu mandíbula.', 'Alargada': 'Cara alargada: no subas mucho el volumen arriba y no te rapes demasiado los lados. Un poco de flequillo acorta la cara.', 'Ovalada': 'Cara ovalada: es la más versátil. Elige el corte por tu tipo de pelo y tu estilo.' };
  if (caraPelo[p.cara]) pe.push(caraPelo[p.cara]);
  if (p.entradas === 'Algo' || p.entradas === 'Bastantes') pe.push('Con entradas: mejor corto y con textura (despeinado controlado) que largo. No lo peines hacia atrás ni intentes taparlas con mechones largos: se nota más.', p.entradas === 'Bastantes' ? 'Si te preocupa mucho, consulta con un dermatólogo: hay tratamientos que frenan la caída si se empiezan pronto. Y raparse con la barba bien cuidada queda muy bien a mucha gente.' : 'Si notas que avanzan, consulta con un dermatólogo pronto: los tratamientos funcionan mejor cuanto antes.');
  if (p.pelotipo === 'Rizado' || p.pelotipo === 'Ondulado') pe.push('Pelo rizado u ondulado: déjate algo de largo arriba para que se vea la forma. Champú suave, acondicionador siempre y una crema de rizos o espuma. Sécalo con la toalla a toquecitos, sin frotar.');
  if (p.pelotipo === 'Liso') pe.push('Pelo liso: los productos mate con textura (cera mate o polvos texturizantes) le dan volumen sin que parezca mojado.');
  pe.push('Qué decir en la barbería: «Quiero algo fácil de peinar que me favorezca. ¿Qué me recomiendas para mi cara?». Y vuelve cada 4–5 semanas: el corte reciente es lo que más se nota.');
  out.push(['Tu pelo', pe]);

  // Barba
  const ba = [];
  if (p.barba === 'Me sale poca o a calvas') ba.push('Si la barba te sale poco poblada, te quedará mejor afeitado o una barba de pocos días (2–4 mm) que una barba larga a calvas.');
  else if (p.barba && p.barba !== 'Afeitado') ba.push({ 'Redonda': 'Para cara redonda: algo más de largo en la barbilla y los lados más cortos. Alarga la cara.', 'Alargada': 'Para cara alargada: más volumen en los lados y corta en la barbilla.', 'Cuadrada': 'Para cara cuadrada: una barba corta y uniforme marca la mandíbula.', 'Ovalada': 'Para cara ovalada: casi cualquier barba te va. Mantenla con la línea limpia.' }[p.cara] || 'Mantén la barba con forma: líneas limpias en el cuello y las mejillas.', 'La línea del cuello: afeita por debajo de un dedo por encima de la nuez. Es lo que más diferencia una barba cuidada de una descuidada.', 'Una recortadora con peine es la mejor inversión. Y un aceite de barba si te pica o está áspera.');
  if (p.barba === 'Afeitado') ba.push('Afeitado: hazlo después de la ducha (el pelo está más blando) y a favor del pelo si se te irrita. Una crema hidratante sin alcohol después.');
  if (ba.length) out.push(['Tu barba', ba]);

  // Gafas
  if (p.gafas === 'Sí') out.push(['Tus gafas', [{ 'Redonda': 'Cara redonda: monturas rectangulares o cuadradas, que dan ángulos.', 'Cuadrada': 'Cara cuadrada: monturas redondeadas u ovaladas, que suavizan.', 'Alargada': 'Cara alargada: monturas con altura (más altas que estrechas), que acortan.', 'Ovalada': 'Cara ovalada: casi cualquier montura te va. Busca que el ancho sea igual al de tu cara.' }[p.cara] || 'Elige monturas de forma contraria a tu cara: si es redondeada, monturas rectas; si es angulosa, redondeadas.', 'La parte de arriba de la montura debería seguir más o menos la línea de las cejas.', 'Unas gafas que te gusten cambian la cara más que cualquier otra cosa. Merece la pena gastar algo más ahí.']]);

  // Piel
  const pi = [], tp = p.tipopiel || '';
  if (tp.startsWith('Grasa')) pi.push('Piel grasa: limpiador en gel por la mañana y por la noche, e hidratante ligera sin aceites (que ponga «oil free» o «no comedogénico»). Aunque brille, necesita hidratación.');
  if (tp.startsWith('Seca')) pi.push('Piel seca: limpiador cremoso suave y una hidratante más rica por la noche. Evita el agua muy caliente en la cara.');
  if (tp.startsWith('Mixta')) pi.push('Piel mixta: limpiador en gel suave e hidratante ligera. Si te brilla la zona T, un papel matificante para salir de noche funciona.');
  if (tp.startsWith('Sensible')) pi.push('Piel sensible: productos sin perfume y con pocos ingredientes. Prueba cada producto nuevo en una zona pequeña unos días.');
  if (tp.startsWith('Normal')) pi.push('Piel normal: limpiador suave, hidratante y protector solar. Con eso basta.');
  if (p.granos === 'A veces' || p.granos === 'A menudo') pi.push('Para los granos, busca productos con niacinamida o ácido salicílico, y no los revientes (dejan marca).', p.granos === 'A menudo' ? 'Si te salen a menudo, ve al dermatólogo: hay tratamientos que funcionan mucho mejor que cualquier crema de farmacia. Es un cambio enorme en poco tiempo.' : 'Si no mejoran en dos meses, consulta con el dermatólogo.');
  pi.push('Protector solar facial todos los días, también en invierno: es lo que más cuida la piel a largo plazo.', 'Labios: bálsamo labial. Labios agrietados se notan mucho de cerca.');
  out.push(['Tu piel', pi]);

  // Tiendas
  const ti = { 'Menos de 30 €': 'Con tu presupuesto: básicos en Uniqlo (en rebajas), Decathlon, Primark o Lefties. Mejor pocas prendas lisas que muchas con estampados.', '30–80 €': 'Con tu presupuesto: Uniqlo para básicos de calidad, y Zara, Pull&Bear, H&M o Springfield para alguna prenda con más estilo. Aprovecha rebajas para chaquetas.', '80–150 €': 'Con tu presupuesto: Uniqlo para básicos, Levi\'s para vaqueros, y Massimo Dutti, COS o Arket en rebajas para prendas que duren.', 'Más de 150 €': 'Con tu presupuesto: prioriza calidad en lo que más se ve y más usas (chaqueta, zapatos, vaqueros). Massimo Dutti, COS, Arket o marcas de calidad media.' }[p.presupuesto];
  if (ti) out.push(['Dónde comprar', [ti, 'Antes de comprar algo, piensa con qué tres cosas de tu armario lo combinarías. Si no se te ocurren, no lo compres.']]);

  // Estilo
  const es = [];
  if (est.includes('Sencillo y limpio') || est.includes('No lo sé')) es.push('Estilo sencillo y limpio: prendas lisas, colores neutros y buena talla. Es el estilo que menos falla y el que mejor funciona en citas.');
  if (est.includes('Deportivo')) es.push('Estilo deportivo: zapatillas limpias, joggers o vaqueros, sudaderas lisas. El truco es que parezca elegido, no de estar en casa.');
  if (est.includes('Más arreglado')) es.push('Estilo arreglado: camisa, chino y zapato o zapatilla de piel. Una americana sin corbata sobre camiseta es el comodín.');
  if (est.includes('Urbano')) es.push('Estilo urbano: sobrecamisas, pantalones amplios pero con talla correcta, zapatillas con personalidad. Cuida que el conjunto no tenga demasiados logos.');
  if (es.length) out.push(['Tu estilo', es]);

  return out;
}

/* Productos de cuidado según tu piel. Son ejemplos fáciles de encontrar en España, no los únicos. */
function productos(p) {
  const tp = p.tipopiel || '', l = [];
  const lim = tp.startsWith('Grasa') || tp.startsWith('Mixta') ? 'Limpiador en gel para piel grasa o mixta (por ejemplo, CeraVe Gel Limpiador Espumoso o La Roche-Posay Effaclar Gel). Unos 10–15 €.' : tp.startsWith('Sensible') ? 'Limpiador muy suave sin perfume (por ejemplo, Bioderma Sensibio o el agua micelar de la misma gama). Unos 10–15 €.' : 'Limpiador suave (por ejemplo, CeraVe Limpiador Hidratante). Unos 10–15 €.';
  const hid = tp.startsWith('Grasa') || tp.startsWith('Mixta') ? 'Hidratante ligera sin aceites (por ejemplo, la loción facial de CeraVe o una hidratante «oil free»). Unos 12–18 €.' : tp.startsWith('Seca') ? 'Hidratante rica (por ejemplo, CeraVe Crema Hidratante). Unos 12–18 €.' : 'Hidratante sencilla para tu tipo de piel. Unos 10–18 €.';
  l.push(['Limpiador facial', lim], ['Hidratante', hid], ['Protector solar facial', 'Fluido y ligero, SPF 50 (por ejemplo, ISDIN Fusion Water o La Roche-Posay Anthelios). Unos 15–25 €.']);
  if (p.granos === 'A veces' || p.granos === 'A menudo') l.push(['Para los granos', 'Un sérum de niacinamida o un tratamiento con ácido salicílico para las zonas con granos. Unos 8–20 €. Si van a más, dermatólogo.']);
  if (p.pelotipo === 'Rizado' || p.pelotipo === 'Ondulado') l.push(['Pelo', 'Acondicionador y una crema de rizos o espuma. Unos 6–15 €.']);
  else l.push(['Pelo', 'Cera mate o polvos texturizantes. Un poquito en las manos, repartido. Unos 6–15 €.']);
  if (p.barba && !['Afeitado'].includes(p.barba)) l.push(['Barba', 'Recortadora con peines de varias medidas (una tipo Philips OneBlade o una recortadora de barba básica). Unos 25–50 €. Y aceite de barba si te pica.']);
  l.push(['Desodorante y colonia', 'Desodorante sin alcohol si se te irrita. Colonia: dos toques (cuello y muñeca), no más. Prueba en tienda, en tu piel, antes de comprar.'], ['Labios', 'Bálsamo labial sin color. Unos 3–5 €.']);
  return l;
}

/* Rutina diaria según tu piel y barba. */
function rutina(p) {
  const m = ['Lavar la cara con el limpiador', 'Hidratante', 'Protector solar', 'Peinarte con tu producto', 'Desodorante'];
  const n = ['Lavar la cara con el limpiador', 'Hidratante', 'Bálsamo labial'];
  if (p.granos === 'A veces' || p.granos === 'A menudo') n.splice(1, 0, 'Tratamiento para granos (solo en las zonas)');
  return { manana: m, noche: n };
}

const CONSEJOS_GENERALES = [
  'La talla correcta vale más que la marca.',
  'Zapatillas limpias. Es de lo primero que se ve.',
  'Corte de pelo cada 4–5 semanas: lo reciente se nota.',
  'Máximo un color llamativo por conjunto.',
  'Antes de comprar algo, piensa con qué tres cosas de tu armario lo combinarías.',
  'Camisetas: la costura del hombro, en tu hombro. Ni más arriba ni más abajo.',
  'Las mangas de camiseta, a mitad del bíceps.',
  'Pantalones: sin bolsas en el culo ni arrugas amontonadas en el tobillo.',
  'Protector solar todos los días, también en invierno.',
  'Una buena chaqueta convierte un conjunto sencillo en uno pensado.',
  'Plancha o cuelga la ropa: una camisa arrugada resta más que una barata.',
  'Postura: hombros abajo y atrás. Es gratis y lo cambia todo.',
  'Dormir bien se nota en la cara más que cualquier crema.',
  'Las uñas cortas y limpias se notan más de lo que crees.',
  'La colonia, dos toques. Si se huele desde lejos, es demasiado.',
  'Si una prenda no te la pones en un año, regálala o dónala.'
];
