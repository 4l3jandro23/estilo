/* Estilo: resumen de tus pantalones, qué arreglar, qué vender y qué te recomiendo comprar.
   Todo se calcula con lo que hay en tu armario: si cambias un veredicto o una prenda, cambia el resumen. */
'use strict';

const ABAJO_LARGO = ['Pantalones', 'Vaqueros'];
const esPant = p => ABAJO_LARGO.includes(p.cat) || p.cat === 'Pantalón corto';
const buena = p => /^Quédatela/.test(p.veredicto || '');
const AZULES = ['Azul marino', 'Vaquero', 'Azul claro'];

/* Grupos de veredicto para el resumen: [clave, título, icono, filtro de veredictos] */
const GRUPOS_PANT = [
  ['bien', 'Para ponerte', '✅', v => /^Quédatela$/.test(v)],
  ['arreglar', 'Para arreglar', '🪡', v => /arréglala/.test(v)],
  ['casa', 'Casa o deporte', '🏠', v => /casa o deporte/i.test(v)],
  ['revisar', 'Por decidir', '🔍', v => /^Revisar/.test(v)],
  ['vender', 'Vender o regalar', '💰', v => /^(Vender|Donar|Tirar)/.test(v)]
];

function resumenPantalones(prendas) {
  const l = prendas.filter(esPant), g = {};
  for (const [k, , , f] of GRUPOS_PANT) g[k] = l.filter(p => f(p.veredicto || ''));
  g.sin = l.filter(p => !p.veredicto);
  return { total: l.length, largos: l.filter(p => ABAJO_LARGO.includes(p.cat)).length, g };
}

/* Recomendaciones de compra y avisos, con el porqué. */
function recoPantalones(prendas, compras) {
  const largos = prendas.filter(p => ABAJO_LARGO.includes(p.cat)), cortos = prendas.filter(p => p.cat === 'Pantalón corto');
  const enLista = que => compras.some(c => !c.hecho && c.que === que);
  const compra = [], avisos = [];
  if (!largos.length) return { compra, avisos };
  const apretados = largos.filter(p => /no (te )?cierra|quedan abiertos|muy estrecho|muy ajustado/i.test([p.ajuste, p.cintura].join(' '))).length;

  if (!largos.some(p => p.cat === 'Vaqueros' && p.corte === 'Recto' && AZULES.includes(p.color) && buena(p))) {
    const que = 'Vaquero azul oscuro de corte recto';
    compra.push({ que, cat: 'Vaqueros', prio: 1, donde: 'Uniqlo, Zara o Mango', enLista: enLista(que),
      por: `Te falta un vaquero azul que te cierre sin esfuerzo y no apriete la pierna${apretados ? ` (hoy tienes ${apretados} que no te cierran del todo)` : ''}. Busca corte recto, cintura media-alta y una talla que cierre cómoda, con el botón de abajo también.` });
  }
  if (!largos.some(p => p.cat === 'Pantalones' && p.color === 'Gris' && buena(p))) {
    const que = 'Pantalón de pinzas gris, cintura ajustable y pierna cónica';
    compra.push({ que, cat: 'Pantalones', prio: 2, donde: 'Uniqlo, Zara o Mango', enLista: enLista(que),
      por: 'No tienes ningún pantalón gris y es el color que más te falta para invierno. Los que mejor te quedan tienen pinzas, tiro alto y cintura ajustable (cordón o goma por dentro). Pierna recta o cónica, largo justo al tobillo, gris medio o carbón.' });
  }
  if (!largos.some(p => p.cat === 'Pantalones' && p.color === 'Azul marino' && buena(p))) {
    const que = 'Chino azul marino de corte recto, cintura media-alta';
    compra.push({ que, cat: 'Pantalones', prio: 2, donde: 'Uniqlo, Zara o Mango', enLista: enLista(que),
      por: 'El azul marino es de tus mejores colores y ahora mismo no tienes ningún pantalón largo azul marino listo para ponerte. Mejor con botón y bragueta (no solo goma) para que cubra la tripa y no se baje.' });
  }
  if (cortos.filter(buena).length >= 4) avisos.push(`No compres más bermudas: ya tienes ${cortos.filter(buena).length} buenas.`);
  const s = resumenPantalones(prendas).g;
  if (s.arreglar.length >= 2) avisos.push(`Llévalos juntos al sastre: ${s.arreglar.length} pantalones solo necesitan un arreglo pequeño y sale más barato todo a la vez.`);
  if (s.vender.length >= 2) avisos.push(`Tienes ${s.vender.length} pantalones para vender o regalar. Ponlos en una caja aparte y súbelos a Vinted o Wallapop: con lo que saques te ayudas a pagar los que te faltan.`);
  return { compra, avisos };
}

/* Formalidad: para saber cuándo ponerte cada prenda. */
const FORMALIDAD = ['Deportivo', 'Casual', 'Arreglado', 'Formal'];
