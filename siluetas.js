/* Estilo: dibujo de cada prenda cuando no tiene foto.
   Son «planos técnicos» como los de un catálogo de moda: la prenda vista de frente, con su línea,
   costuras, cintura, bolsillos y bajo, y el tejido sugerido (sarga del vaquero, canalé de la pana,
   rayas, lino). Lo que sabemos de la prenda (corte, cintura, bolsillos, bajo, largo) cambia el dibujo. */
'use strict';
let _sid = 0;
const esc2 = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Mezcla un color con blanco (t > 0) o con negro (t < 0).
function tono(hex, t) {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, k = Math.abs(t), m = t > 0 ? 255 : 0;
  const f = c => Math.round(c + (m - c) * k).toString(16).padStart(2, '0');
  return '#' + f(r) + f(g) + f(b);
}
const luz = hex => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };

// Color de la prenda, afinado con lo que dice la ficha («verde botella», «petróleo», «camel»…).
function colorDe(color, p) {
  const t = p ? [p.nombre, p.tejido].join(' ').toLowerCase() : '';
  if (/botella|petr[oó]leo/.test(t)) return '#24473A';
  if (/camel|tabaco/.test(t)) return '#A0703F';
  if (/caqui/.test(t) && color === 'Verde oliva') return '#8C875A';
  if (/crema|crudo|blanco roto/.test(t) && (color === 'Blanco' || color === 'Beis')) return '#EDE6D6';
  if (/lavado|gris carb[oó]n/.test(t) && color === 'Negro') return '#3A3A3D';
  if (/azul intenso/.test(t)) return '#2C4A86';
  if (/azul medio/.test(t)) return '#5C7FAE';
  const h = HEX[color];
  return h && h.startsWith('#') ? h : '#9AA3B2';
}

/* ---------- pantalones y bermudas ---------- */
function pantalon(cat, corte, t, corto, medioMuslo) {
  // Medidas de la mitad izquierda; la derecha es simétrica respecto a x = 100.
  const ancho = corte === 'Ancho' || corte === 'Cargo', ajustado = corte === 'Ajustado';
  const wt = 56, hipX = ancho ? 44 : ajustado ? 50 : 47, hipY = 70, cr = 98;
  const H = corto ? (medioMuslo ? 124 : 140) : 226;
  let oL = corto ? (ancho ? 40 : 43) : ancho ? 36 : ajustado ? 60 : 50, iL = corto ? 97 : ancho ? 97 : ajustado ? 94 : 95;
  const puno = /pu[nñ]o/.test(t) && !corto;
  if (puno) { oL = 62; iL = 93; }
  return { wt, hipX, hipY, cr, H, oL, iL, puno, r: x => 200 - x };
}
function pantalonSVG(cat, corte, p, f, linea, hilo) {
  const t = [p && p.cintura, p && p.bolsillos, p && p.tejido, p && p.bajo, p && p.largo, p && p.corte, p && p.nombre].join(' ').toLowerCase();
  const corto = cat === 'Pantalón corto', g = pantalon(cat, corte, t, corto, /medio muslo/.test(t));
  // Contorno: con puño, las piernas se estrechan en curva hasta el tobillo.
  if (g.puno) g.d = `M${g.wt} 14 L${g.r(g.wt)} 14 C${g.r(g.wt) + 6} 34 ${g.r(g.hipX)} ${g.hipY - 18} ${g.r(g.hipX)} ${g.hipY} Q${g.r(g.oL) + 10} ${(g.hipY + g.H) / 2} ${g.r(g.oL)} ${g.H} L${g.r(g.iL)} ${g.H} L102 ${g.cr} Q100 ${g.cr - 3} 98 ${g.cr} L${g.iL} ${g.H} L${g.oL} ${g.H} Q${g.oL - 10} ${(g.hipY + g.H) / 2} ${g.hipX} ${g.hipY} C${g.hipX} ${g.hipY - 18} ${g.wt - 6} 34 ${g.wt} 14 Z`;
  else g.d = `M${g.wt} 14 L${g.r(g.wt)} 14 C${g.r(g.wt) + 6} 34 ${g.r(g.hipX)} ${g.hipY - 18} ${g.r(g.hipX)} ${g.hipY} L${g.r(g.oL)} ${g.H} L${g.r(g.iL)} ${g.H} L102 ${g.cr} Q100 ${g.cr - 3} 98 ${g.cr} L${g.iL} ${g.H} L${g.oL} ${g.H} L${g.hipX} ${g.hipY} C${g.hipX} ${g.hipY - 18} ${g.wt - 6} 34 ${g.wt} 14 Z`;
  const vaquero = cat === 'Vaqueros' || /vaquero|denim/.test(t);
  const goma = /goma|cord[oó]n/.test(t) && !/sin goma/.test(t);
  const s = (dd, extra) => `<path d="${dd}" fill="none" stroke="${linea}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" ${extra || ''}/>`;
  const pesp = dd => `<path d="${dd}" fill="none" stroke="${vaquero ? hilo : linea}" stroke-width="1" stroke-dasharray="2.4 2" stroke-linecap="round" opacity="${vaquero ? .95 : .55}"/>`;
  let det = '';
  const yb = goma ? 34 : 30;
  // cinturilla
  det += s(`M${g.wt - 1.5} ${yb} L${g.r(g.wt) + 1.5} ${yb}`);
  if (goma) {
    for (let x = g.wt + 4; x < g.r(g.wt) - 2; x += 5) det += `<path d="M${x} 16.5 V${yb - 2.5}" stroke="${linea}" stroke-width=".8" opacity=".55"/>`;
    det += `<path d="M95 ${yb} Q92 ${yb + 14} 88 ${yb + 26} M105 ${yb} Q108 ${yb + 14} 113 ${yb + 25}" fill="none" stroke="${tono(f, luz(f) > .5 ? -.55 : .6)}" stroke-width="1.6" stroke-linecap="round"/>`;
    det += `<rect x="86" y="${yb + 25}" width="4" height="6" rx="1.2" fill="${linea}"/><rect x="111.5" y="${yb + 24}" width="4" height="6" rx="1.2" fill="${linea}"/>`;
  } else {
    for (const x of [g.wt + 6, 84, 116, g.r(g.wt) - 6]) det += `<rect x="${x - 2.2}" y="12.5" width="4.4" height="${yb - 9}" rx="1" fill="${f}" stroke="${linea}" stroke-width="1"/>`;
    det += `<circle cx="100" cy="${yb - 8}" r="2.6" fill="${vaquero ? '#B9A27A' : tono(f, luz(f) > .5 ? -.35 : .35)}" stroke="${linea}" stroke-width=".8"/>`;
    det += pesp(`M106 ${yb} V${yb + 34} Q106 ${yb + 44} 99 ${yb + 47}`) + s(`M100 ${yb} V${g.cr - 10}`, 'opacity=".7"');
  }
  // bolsillos delanteros
  if (vaquero) {
    det += s(`M${g.wt + 4} ${yb} Q${g.wt + 8} ${yb + 22} ${g.hipX + 2} ${yb + 24}`) + s(`M${g.r(g.wt) - 4} ${yb} Q${g.r(g.wt) - 8} ${yb + 22} ${g.r(g.hipX) - 2} ${yb + 24}`);
    det += pesp(`M${g.wt + 8} ${yb} Q${g.wt + 12} ${yb + 18} ${g.hipX + 2} ${yb + 20}`) + pesp(`M${g.r(g.wt) - 8} ${yb} Q${g.r(g.wt) - 12} ${yb + 18} ${g.r(g.hipX) - 2} ${yb + 20}`);
    det += s(`M${g.r(g.wt) - 26} ${yb} V${yb + 10} H${g.r(g.wt) - 12}`);
  } else {
    det += s(`M${g.wt + 10} ${yb} L${g.hipX + 3} ${yb + 30}`) + s(`M${g.r(g.wt) - 10} ${yb} L${g.r(g.hipX) - 3} ${yb + 30}`);
  }
  if (/pinzas/.test(t)) det += s(`M82 ${yb} L80 ${yb + 34}`, 'opacity=".75"') + s(`M118 ${yb} L120 ${yb + 34}`, 'opacity=".75"');
  // raya de la pierna en chinos y pantalones de vestir
  if (!corto && !vaquero && !goma && corte !== 'Cargo') {
    const mid = (g.oL + g.iL) / 2;
    det += s(`M${mid + 1} ${g.cr + 6} L${mid} ${g.H - 4}`, 'opacity=".35"') + s(`M${200 - mid - 1} ${g.cr + 6} L${200 - mid} ${g.H - 4}`, 'opacity=".35"');
  }
  // bolsillos cargo
  if (/cargo/.test(t) || corte === 'Cargo') {
    const y = corto ? 84 : 118, w = 24, hh = corto ? 26 : 34;
    for (const x of [g.oL + 3, 200 - g.oL - 3 - w]) det += `<rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="2" fill="${f}" stroke="${linea}" stroke-width="1.2"/>` + s(`M${x} ${y + 8} H${x + w}`) + pesp(`M${x + 2.5} ${y + 11} H${x + w - 2.5}`);
  }
  // bajo: vuelta, puño o pespunte
  if (/vuelta/.test(t) && !corto) det += s(`M${g.oL + .5} ${g.H - 11} L${g.iL - .5} ${g.H - 11}`) + s(`M${200 - g.oL - .5} ${g.H - 11} L${200 - g.iL + .5} ${g.H - 11}`);
  else if (g.puno) for (const [a, b] of [[g.oL, g.iL], [200 - g.iL, 200 - g.oL]]) { det += s(`M${a} ${g.H - 12} L${b} ${g.H - 12}`); for (let x = a + 3; x < b - 1; x += 4) det += `<path d="M${x} ${g.H - 11} V${g.H - 1}" stroke="${linea}" stroke-width=".7" opacity=".5"/>`; }
  else det += pesp(`M${g.oL + 1} ${g.H - 5} L${g.iL - 1} ${g.H - 5}`) + pesp(`M${200 - g.oL - 1} ${g.H - 5} L${200 - g.iL + 1} ${g.H - 5}`);
  // parche o bordado
  if (/bordado|elefante|un parche|parche rojo/.test(t)) det += `<rect x="${g.r(g.wt) - 30}" y="${yb + 30}" width="11" height="13" rx="3" fill="${/rojo/.test(t) ? '#C6463D' : '#7FA7C9'}" stroke="${linea}" stroke-width=".8"/>`;
  return { d: g.d, det, sombraY: g.H + 6, sombraW: corto ? 66 : 70 };
}

/* ---------- prendas de arriba, calzado y complementos ---------- */
const TOPS = {
  tee: 'M74 22 Q100 36 126 22 L160 34 L184 74 L158 88 L150 74 L151 214 Q100 220 49 214 L50 74 L42 88 L16 74 L40 34 Z',
  manga: 'M76 22 Q100 34 124 22 L158 32 L172 74 L184 186 L162 190 L150 98 L151 216 Q100 222 49 216 L50 98 L38 190 L16 186 L28 74 L42 32 Z',
  camisaCorta: 'M76 24 L88 18 L100 30 L112 18 L124 24 L158 34 L182 74 L156 88 L150 76 L151 214 Q100 220 49 214 L50 76 L44 88 L18 74 L42 34 Z',
  camisaLarga: 'M76 24 L88 18 L100 30 L112 18 L124 24 L158 34 L172 76 L182 188 L160 192 L150 100 L151 216 Q100 222 49 216 L50 100 L40 192 L18 188 L28 76 L42 34 Z'
};
function topSVG(cat, p, f, linea) {
  const t = [p && p.nombre, p && p.tejido].join(' ').toLowerCase();
  const s = (dd, extra) => `<path d="${dd}" fill="none" stroke="${linea}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" ${extra || ''}/>`;
  const pesp = dd => `<path d="${dd}" fill="none" stroke="${linea}" stroke-width="1" stroke-dasharray="2.4 2" opacity=".55"/>`;
  const boton = (x, y) => `<circle cx="${x}" cy="${y}" r="2.3" fill="${tono(f, luz(f) > .5 ? -.15 : .3)}" stroke="${linea}" stroke-width=".8"/>`;
  if (cat === 'Camisas') {
    const larga = !/manga corta|corta/.test(t);
    let det = s('M88 18 L84 34 L100 30 L116 34 L112 18') + s('M100 30 V214') + s('M95 30 V214', 'opacity=".5"');
    for (let y = 44; y < 210; y += 28) det += boton(97.5, y);
    det += `<path d="M112 70 H134 V94 Q123 98 112 94 Z" fill="none" stroke="${linea}" stroke-width="1.2"/>`;
    det += larga ? s('M162 176 L182 179') + s('M38 176 L18 179') : s('M152 82 L178 70', 'opacity=".5"') + s('M48 82 L22 70', 'opacity=".5"');
    det += pesp('M52 208 Q100 214 148 208');
    return { d: larga ? TOPS.camisaLarga : TOPS.camisaCorta, det };
  }
  if (cat === 'Polos') {
    let det = s('M76 22 L86 40 L100 30 L114 40 L124 22') + s('M100 30 V68') + s('M94 30 V68 H106 V30', 'opacity=".55"') + boton(100, 44) + boton(100, 58);
    det += s('M158 88 L182 76', 'opacity=".55"') + s('M42 88 L18 76', 'opacity=".55"') + pesp('M52 206 Q100 212 148 206');
    return { d: TOPS.tee, det };
  }
  if (cat === 'Sudaderas y jerséis') {
    const capucha = /capucha|hoodie/.test(t);
    let det = capucha ? s('M76 22 Q70 2 100 0 Q130 2 124 22') + s('M94 32 L92 54 M106 32 L108 54') : s('M76 22 Q100 40 124 22') + s('M80 26 Q100 44 120 26', 'opacity=".6"');
    for (const [a, b] of [[49, 151]]) { det += s(`M${a} 200 Q100 206 ${b} 200`); for (let x = a + 4; x < b - 2; x += 5) det += `<path d="M${x} ${201 + (x > 70 && x < 130 ? 3 : 1)} V${213}" stroke="${linea}" stroke-width=".7" opacity=".45"/>`; }
    det += s('M160 178 L183 181') + s('M40 178 L17 181');
    return { d: TOPS.manga, det };
  }
  if (cat === 'Chaquetas y abrigos') {
    let det = s('M100 30 V216') + s('M76 22 L90 64 L100 30 L110 64 L124 22') + boton(104, 92) + boton(104, 126) + boton(104, 160);
    det += `<path d="M58 140 H86 M114 140 H142" stroke="${linea}" stroke-width="1.3"/>` + s('M160 178 L183 181') + s('M40 178 L17 181');
    return { d: TOPS.manga, det };
  }
  // camisetas, deporte, casa
  let det = s('M74 22 Q100 36 126 22') + s('M79 25 Q100 40 121 25', 'opacity=".55"') + pesp('M157 84 L181 72') + pesp('M43 84 L19 72') + pesp('M52 206 Q100 212 148 206');
  if (cat === 'Deporte') det += s('M50 120 H150', 'opacity=".35"');
  return { d: TOPS.tee, det };
}
function calzadoSVG(cat, f, linea) {
  const claro = luz(f) > .5;
  if (cat === 'Zapatos') {
    const d = 'M24 160 C18 148 20 136 30 130 C42 124 58 126 70 128 C84 124 96 114 112 114 C128 114 140 120 152 124 C172 130 188 140 190 152 L190 160 Z';
    const det = `<path d="M20 160 H192 V168 Q192 172 186 172 H26 Q20 172 20 166 Z" fill="#2A2420"/><path d="M20 172 H56 V178 H24 Q20 178 20 174 Z" fill="#1E1A17"/>`
      + `<path d="M84 126 C96 138 124 138 140 124" fill="none" stroke="${linea}" stroke-width="1.3"/><path d="M98 120 L108 130 M110 118 L120 128 M122 118 L130 126" stroke="${linea}" stroke-width="1.2" stroke-linecap="round"/>`
      + `<path d="M150 126 C164 132 176 140 184 150" fill="none" stroke="${linea}" stroke-width="1" stroke-dasharray="2.4 2" opacity=".6"/>`;
    return { d, det, sombraY: 180, sombraW: 86 };
  }
  const d = 'M24 160 C18 146 18 132 24 124 C30 118 40 116 50 118 C60 120 66 126 74 124 C82 122 88 104 96 100 C104 98 110 104 118 110 L150 120 C170 124 184 132 188 146 L188 160 Z';
  const det = `<path d="M18 158 H190 Q194 172 182 174 H26 Q16 172 18 158 Z" fill="#F4F2EC" stroke="${linea}" stroke-width="1.1"/><path d="M20 166 H188" stroke="${linea}" stroke-width=".8" opacity=".45"/>`
    + `<path d="M40 150 C72 136 112 134 152 142" fill="none" stroke="${claro ? linea : '#F4F2EC'}" stroke-width="2.2" stroke-linecap="round" opacity=".9"/>`
    + `<path d="M100 104 L94 112 M108 108 L102 116 M116 112 L110 120 M124 115 L118 123 M132 117 L126 125" stroke="${claro ? linea : '#F4F2EC'}" stroke-width="1.8" stroke-linecap="round"/>`
    + `<path d="M150 120 C162 128 172 138 186 150" fill="none" stroke="${linea}" stroke-width="1.1" stroke-dasharray="2.4 2" opacity=".6"/><path d="M26 126 C30 138 30 150 28 158" fill="none" stroke="${linea}" stroke-width="1.1" opacity=".55"/>`;
  return { d, det, sombraY: 178, sombraW: 86 };
}
function accesorioSVG(f, linea) {
  return { d: 'M40 96 H160 A14 14 0 0 1 160 124 H40 A14 14 0 0 1 40 96 Z', det: `<rect x="138" y="100" width="20" height="20" rx="3" fill="none" stroke="#B9A27A" stroke-width="3"/><path d="M60 110 H128" stroke="${linea}" stroke-width="1" stroke-dasharray="2.4 2" opacity=".6"/>`, sombraY: 132, sombraW: 70 };
}

/* ---------- tejidos ---------- */
function textura(id, t, cat, f) {
  const osc = luz(f) < .35, c = osc ? '#FFFFFF' : '#000000';
  if (/rayas/.test(t)) {
    const r = /gris oscuro|azul marino|negr/.test(t) && !osc ? '#3D4250' : osc ? '#D9DDE6' : '#3D4250';
    return `<pattern id="${id}" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="none"/><rect x="3" width="1" height="7" fill="${r}" opacity=".55"/></pattern>`;
  }
  if (cat === 'Vaqueros' || /vaquero|denim/.test(t))
    return `<pattern id="${id}" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><rect width="4" height="2" fill="${c}" opacity="${osc ? .045 : .05}"/></pattern>`;
  if (/pana/.test(t))
    return `<pattern id="${id}" width="3.2" height="10" patternUnits="userSpaceOnUse"><rect width="1.2" height="10" fill="${c}" opacity="${osc ? .09 : .08}"/></pattern>`;
  if (/lino/.test(t))
    return `<pattern id="${id}" width="22" height="9" patternUnits="userSpaceOnUse"><path d="M1 2 H9 M13 6 H20 M5 8 H8" stroke="${c}" stroke-width=".7" opacity=".08"/></pattern>`;
  return '';
}

function prendaSVG(cat, color, corte, p) {
  const id = 'ps' + (++_sid), est = color === 'Estampado';
  const f = est ? '#9DB0CF' : colorDe(color, p);
  const L = luz(f), linea = L > .62 ? tono(f, -.55) : L > .3 ? tono(f, -.6) : tono(f, .42);
  const hilo = '#D99A45';
  const t = p ? [p.cintura, p.bolsillos, p.tejido, p.bajo, p.largo, p.nombre].join(' ').toLowerCase() : '';
  let g;
  if (['Pantalones', 'Vaqueros', 'Pantalón corto'].includes(cat)) g = pantalonSVG(cat, corte, p, f, linea, hilo);
  else if (cat === 'Zapatillas' || cat === 'Zapatos') g = calzadoSVG(cat, f, linea);
  else if (cat === 'Accesorios') g = accesorioSVG(f, linea);
  else g = Object.assign({ sombraY: 226, sombraW: 74 }, topSVG(cat, p, f, linea));
  const tex = textura('tx' + id, t, cat, f);
  const estampado = est ? `<pattern id="es${id}" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><rect width="16" height="16" fill="#DCE3EE"/><rect width="7" height="16" fill="#6F8DBE"/></pattern>` : '';
  const defs = `<defs><linearGradient id="vol${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>
    <radialGradient id="so${id}"><stop offset="0" stop-color="#000" stop-opacity=".2"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>${tex}${estampado}</defs>`;
  const sombra = `<ellipse cx="100" cy="${g.sombraY}" rx="${g.sombraW}" ry="6" fill="url(#so${id})"/>`;
  const cuerpo = `<path d="${g.d}" fill="${est ? `url(#es${id})` : f}"/>${tex ? `<path d="${g.d}" fill="url(#tx${id})"/>` : ''}<path d="${g.d}" fill="url(#vol${id})"/><path d="${g.d}" fill="none" stroke="${linea}" stroke-width="1.5" stroke-linejoin="round"/>`;
  const vb = cat === 'Pantalón corto' ? (/medio muslo/.test(t) ? '18 4 164 138' : '14 4 172 154')
    : ['Pantalones', 'Vaqueros'].includes(cat) ? '12 4 176 236'
    : cat === 'Zapatillas' || cat === 'Zapatos' ? '8 86 188 104' : cat === 'Accesorios' ? '16 70 168 80' : '6 -6 188 238';
  return `<svg class="sil" viewBox="${vb}" aria-hidden="true">${defs}${sombra}${cuerpo}${g.det}</svg>`;
}
