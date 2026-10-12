/* Dibujo de cada prenda cuando no tiene foto: la silueta del tipo, pintada de su color. */
'use strict';
const TEE = 'M30 14 L10 28 L20 46 L30 40 V104 H70 V40 L80 46 L90 28 L70 14 C65 22 35 22 30 14 Z';
const LARGA = 'M32 14 L8 40 L14 102 L28 100 L30 54 V104 H70 V54 L72 100 L86 102 L92 40 L68 14 C62 22 38 22 32 14 Z';
const PANT = 'M30 10 H70 L75 112 H54 L50 44 L46 112 H25 Z';
const ZAP = 'M8 76 C8 60 22 54 30 58 L44 70 C56 74 70 70 82 76 C92 80 95 90 91 95 H10 C8 95 8 86 8 76 Z';
const SIL = {
  Camisetas: [TEE], Deporte: [TEE, 'M30 60 H70'], Casa: [TEE],
  Camisas: [TEE, 'M30 14 L50 36 L70 14', 'M50 36 V104', '#b:50:50:3', '#b:50:68:3', '#b:50:86:3'],
  Polos: [TEE, 'M38 15 L50 30 L62 15', 'M50 30 V58', '#b:50:40:2.4', '#b:50:52:2.4'],
  'Sudaderas y jerséis': [LARGA, 'M30 96 H70', 'M38 15 C44 24 56 24 62 15'],
  'Chaquetas y abrigos': [LARGA, 'M50 22 V104', 'M50 22 L38 44 L50 54', 'M50 22 L62 44 L50 54', '#b:50:72:2.4'],
  Vaqueros: [PANT, 'M30 22 H70', 'M36 28 Q40 36 44 28', 'M64 28 Q60 36 56 28'],
  Pantalones: [PANT, 'M30 22 H70', 'M50 22 V44'],
  'Pantalón corto': ['M30 24 H70 L77 76 H54 L50 54 L46 76 H23 Z', 'M30 34 H70'],
  Zapatillas: [ZAP, 'M8 88 H91', 'M38 62 L46 56 M46 68 L54 62 M54 72 L62 66'],
  Zapatos: [ZAP, 'M8 88 H91', 'M72 76 L74 95'],
  Accesorios: ['#r:8:52:84:16:8', '#r:44:49:14:22:3']
};
let _sid = 0;
const PANT_CORTE = { Ancho: 'M27 10 H73 L84 112 H57 L50 46 L43 112 H16 Z', Ajustado: 'M32 10 H68 L65 112 H53 L50 44 L47 112 H35 Z' };
const esc2 = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function prendaSVG(cat, color, corte, p) {
  let defs = SIL[cat] || SIL.Camisetas;
  if ((cat === 'Pantalones' || cat === 'Vaqueros') && corte) {
    defs = defs.slice(); if (PANT_CORTE[corte]) defs[0] = PANT_CORTE[corte];
    if (corte === 'Cargo') { defs[0] = PANT_CORTE.Ancho; defs.push('#r:20:58:14:16:2', '#r:66:58:14:16:2'); }
  }
  const fill = (HEX[color] || '#9AA3B2'), est = color === 'Estampado', id = 'ps' + (++_sid);
  const oscuro = ['Negro', 'Azul marino', 'Burdeos', 'Marrón', 'Verde oliva'].includes(color), linea = oscuro ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.28)';
  let f = est ? `url(#${id})` : fill.startsWith('linear') ? '#C73A33' : fill, body = '', det = '';
  let etiqueta = '';
  if (p && ['Pantalones', 'Vaqueros', 'Pantalón corto'].includes(cat)) {
    // Con lo que sabemos de la prenda: cintura, bolsillos, bajo, rayas, detalles y tienda, para distinguir unos de otros.
    const t = [p.cintura, p.bolsillos, p.tejido, p.bajo, p.largo, p.corte].join(' ').toLowerCase(), corto = cat === 'Pantalón corto';
    defs = defs.slice();
    if (corto) { const y = /medio muslo/.test(t) ? 66 : 80; defs[0] = `M30 24 H70 L77 ${y} H54 L50 ${y - 22} L46 ${y} H23 Z`; }
    if (/goma|cord[oó]n/.test(t)) defs.push('M30 20 H70', 'M50 20 Q46 30 43 34', 'M50 20 Q54 30 57 34');
    else if (/bot[oó]n|bragueta/.test(t) && !corto) defs.push('#b:50:17:2.2');
    if (/pinzas/.test(t) && !corto) defs.push('M40 22 V38', 'M60 22 V38');
    if (/cargo/.test(t) && corte !== 'Cargo' && !corto) defs.push('#r:20:58:14:16:2', '#r:66:58:14:16:2');
    if (/vuelta|pu[nñ]o/.test(t) && !corto) defs.push('M27 100 H47', 'M53 100 H73');
    if (/rayas/.test(t)) defs.push(...(corto ? ['M40 28 V72', 'M60 28 V72'] : ['M38 26 V108', 'M62 26 V108']));
    if (/parche|bordado|elefante/.test(t)) defs.push('#b:62:40:3.4');
    const tienda = (p.tienda || '').split(/[ (]/)[0].slice(0, 9);
    if (tienda) etiqueta = `<text x="50" y="${corto ? 52 : 80}" text-anchor="middle" font-size="${corto ? (tienda.length > 7 ? 9 : 11) : (tienda.length > 7 ? 7.6 : 9.5)}" font-weight="800" fill="${oscuro ? '#fff' : '#161C27'}" stroke="${oscuro ? 'rgba(0,0,0,.4)' : 'rgba(255,255,255,.6)'}" stroke-width=".7" paint-order="stroke">${esc2(tienda)}</text>`;
  }
  defs.forEach((d, i) => {
    if (d.startsWith('#b:')) { const [, x, y, r] = d.split(':'); det += `<circle cx="${x}" cy="${y}" r="${r}" fill="${linea}"/>`; }
    else if (d.startsWith('#r:')) { const [, x, y, w, h, r] = d.split(':'); body += i === 0 ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${f}" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/>` : `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="none" stroke="${linea}" stroke-width="2.5"/>`; }
    else if (i === 0) body += `<path d="${d}" fill="${f}" stroke="rgba(0,0,0,.3)" stroke-width="1.2" stroke-linejoin="round"/><path d="${d}" fill="url(#sh${id})" stroke="none"/>`;
    // En los vaqueros, las costuras son el pespunte ámbar de siempre.
    else det += cat === 'Vaqueros' ? `<path d="${d}" fill="none" stroke="#E39A3A" stroke-width="1.5" stroke-dasharray="2.6 2.2" stroke-linecap="round" stroke-linejoin="round"/>` : `<path d="${d}" fill="none" stroke="${linea}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  });
  const luz = `<linearGradient id="sh${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".24"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>`;
  const pat = `<defs>${luz}${est ? `<pattern id="${id}" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><rect width="14" height="14" fill="#DCE3EE"/><rect width="6" height="14" fill="#6F8DBE"/></pattern>` : ''}</defs>`;
  return `<svg class="sil" viewBox="${cat === 'Pantalón corto' ? '10 12 80 76' : '0 0 100 120'}" aria-hidden="true">${pat}${body}${det}${etiqueta}</svg>`;
}
