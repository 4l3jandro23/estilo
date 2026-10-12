/* Estilo: tu armario con fotos, qué ponerte según el tiempo y la ocasión, conjuntos, historial, compras y consejos para ti.
   Se guarda en el dispositivo y, si lo vinculas, se sincroniza cifrado entre tus dispositivos. */
'use strict';

const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const diaKey = (d = new Date()) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const hoyKey = () => diaKey();
const KEY = 'estiloDatos';
const VERSION = 16;
const BASE = { prendas: [], conjuntos: [], compras: [], perfil: {}, rutina: {}, historial: [], rutinaPasos: null, semanaOc: null };

let D = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } })();
D = Object.assign({}, BASE, D);
if (D.perfil.gafas === 'Sí') D.perfil.gafas = 'Sí, siempre';
// Las veces que te pusiste algo antes del historial se guardan aparte para no perderlas.
D.prendas.forEach(p => { if (p.usos && !p.usos0) { p.usos0 = p.usos; } delete p.usos; });

const save = () => {
  let old = null; try { old = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { return toast('No se ha podido guardar: el dispositivo no tiene espacio.'); }
  ES.touch(old, D);
};

const ui = { vf: '', outSeg: 'ideas', ideaOc: '', tab: 'hoy', cat: '', orden: 'recientes', filtro: '', q: '', ocasion: 'Diario', looks: [], lookI: 0, lock: [], conjOc: '' };

// ---------- fotos en IndexedDB ----------
const FOTOS = {};
const idb = new Promise((ok, ko) => { const r = indexedDB.open('estilo', 1); r.onupgradeneeded = () => r.result.createObjectStore('fotos'); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
const fotoTx = (modo, fn) => idb.then(db => new Promise((ok, ko) => { const t = db.transaction('fotos', modo), s = t.objectStore('fotos'), r = fn(s); t.oncomplete = () => ok(r && r.result); t.onerror = () => ko(t.error); }));
const fotoPut = (id, url) => fotoTx('readwrite', s => s.put(url, id)).then(() => { FOTOS[id] = url; });
const fotoDel = id => fotoTx('readwrite', s => s.delete(id)).then(() => { delete FOTOS[id]; });
const fotosCargar = () => idb.then(db => new Promise(ok => { const t = db.transaction('fotos'), r = t.objectStore('fotos').openCursor(); r.onsuccess = () => { const c = r.result; if (c) { FOTOS[c.key] = c.value; c.continue(); } else ok(); }; r.onerror = () => ok(); })).catch(() => {});

function escalar(src, m, q) {
  return new Promise((ok, ko) => {
    const img = new Image();
    img.onload = () => { const k = Math.min(1, m / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', q)); };
    img.onerror = () => ko(new Error('foto'));
    img.src = src;
  });
}
async function comprimir(file) { const url = URL.createObjectURL(file); try { return await escalar(url, 900, .8); } finally { URL.revokeObjectURL(url); } }
const reducir = url => escalar(url, 600, .72).catch(() => url);

// ---------- color automático (gratis, en el dispositivo) ----------
function colorDominante(url) {
  return new Promise(ok => {
    const img = new Image();
    img.onload = () => {
      const n = 48, c = document.createElement('canvas'); c.width = n; c.height = n;
      const g = c.getContext('2d'), w = img.width, h = img.height;
      g.drawImage(img, w * .3, h * .3, w * .4, h * .4, 0, 0, n, n); // solo el centro: ahí suele estar la prenda
      const px = g.getImageData(0, 0, n, n).data, cuenta = {};
      const ref = COLORES.filter(x => x !== 'Estampado').map(x => [x, HEX[x].match(/\w\w/g).map(v => parseInt(v, 16))]);
      for (let i = 0; i < px.length; i += 4) {
        let mejor = null, d = 1e9;
        for (const [nom, q] of ref) { const e = (px[i] - q[0]) ** 2 * .3 + (px[i + 1] - q[1]) ** 2 * .59 + (px[i + 2] - q[2]) ** 2 * .11; if (e < d) { d = e; mejor = nom; } }
        cuenta[mejor] = (cuenta[mejor] || 0) + 1;
      }
      const orden = Object.entries(cuenta).sort((a, b) => b[1] - a[1]);
      // Si ningún color llega a un tercio del centro y el segundo pesa mucho, probablemente es estampado.
      ok(orden[0][1] < n * n / 3 && orden[1] && orden[1][1] > n * n / 5 ? 'Estampado' : orden[0][0]);
    };
    img.onerror = () => ok('');
    img.src = url;
  });
}

// ---------- IA opcional: Claude analiza la foto con tu propia clave ----------
const IA_KEY = 'estiloIA';
const iaCfg = () => { try { return JSON.parse(localStorage.getItem(IA_KEY)) || {}; } catch (e) { return {}; } };
const iaActiva = () => { const c = iaCfg(); return !!(c.on && c.key); };
async function analizarIA(url) {
  const { key } = iaCfg();
  const schema = { type: 'object', additionalProperties: false, required: ['nombre', 'cat', 'color', 'temp', 'consejo'], properties: {
    nombre: { type: 'string', description: 'Nombre corto de la prenda en español de España: tipo, color y material o detalle si se ve. Ej.: «Sobrecamisa de pana marrón».' },
    cat: { type: 'string', enum: CATS }, color: { type: 'string', enum: COLORES }, temp: { type: 'string', enum: TEMPS },
    consejo: { type: 'string', description: 'Una frase en español de España sobre con qué combinarla o cómo llevarla.' } } };
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true', 'anthropic-beta': 'server-side-fallback-2026-07-01' },
    body: JSON.stringify({
      model: 'claude-opus-5-5', max_tokens: 4000, fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema } },
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: url.split(',')[1] } },
        { type: 'text', text: 'Es una foto de una prenda de ropa de hombre para un armario digital. Describe la prenda principal (la más visible). Elige la categoría, el color principal y cuándo se lleva («Calor», «Frío» o «Todo el año») de las listas permitidas.' }
      ] }]
    })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(r.status === 401 ? 'La clave no es válida.' : r.status === 429 ? 'Demasiadas peticiones seguidas. Espera un poco.' : /credit/i.test(JSON.stringify(j)) ? 'Tu cuenta de la API no tiene saldo.' : 'No se ha podido analizar (error ' + r.status + ').');
  if (j.stop_reason === 'refusal') throw new Error('La IA no ha querido analizar esta foto.');
  const t = (j.content || []).find(b => b.type === 'text');
  if (!t) throw new Error('La IA no ha devuelto nada.');
  return JSON.parse(t.text);
}
async function llamarIA(content, schema, effort) {
  const { key } = iaCfg();
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true', 'anthropic-beta': 'server-side-fallback-2026-07-01' },
    body: JSON.stringify({ model: 'claude-opus-5-5', max_tokens: 8000, fallbacks: 'default', output_config: { effort, format: { type: 'json_schema', schema } }, messages: [{ role: 'user', content }] })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(r.status === 401 ? 'La clave no es válida.' : r.status === 429 ? 'Demasiadas peticiones seguidas. Espera un poco.' : /credit/i.test(JSON.stringify(j)) ? 'Tu cuenta de la API no tiene saldo.' : 'No se ha podido analizar (error ' + r.status + ').');
  if (j.stop_reason === 'refusal') throw new Error('La IA no ha querido analizar esta foto.');
  const t = (j.content || []).find(b => b.type === 'text');
  if (!t) throw new Error('La IA no ha devuelto nada.');
  return JSON.parse(t.text);
}

/* «¿Lo compro?» con foto: la prenda de la tienda o de internet + tu perfil + tu armario → veredicto. */
const VER_COMPRA = ['Sí, cómpralo', 'Puede valer', 'Mejor no'];
async function analizarCompra(url, precio, nota) {
  const schema = { type: 'object', additionalProperties: false, required: ['veredicto', 'que', 'cat', 'color', 'resumen', 'aFavor', 'enContra', 'combinaCon', 'conjuntos', 'precio', 'talla', 'alternativa'], properties: {
    veredicto: { type: 'string', enum: VER_COMPRA },
    que: { type: 'string', description: 'Nombre corto de la prenda: tipo, color y detalle. Ej.: «Chino recto azul marino».' },
    cat: { type: 'string', enum: CATS }, color: { type: 'string', enum: COLORES },
    resumen: { type: 'string', description: 'Una o dos frases directas con el porqué del veredicto.' },
    aFavor: { type: 'array', items: { type: 'string' }, description: 'Puntos a favor (color, corte, lo que aporta a su armario…).' },
    enContra: { type: 'array', items: { type: 'string' }, description: 'Puntos en contra o dudas. Vacío si no hay.' },
    combinaCon: { type: 'array', items: { type: 'string' }, description: 'Nombres EXACTOS de prendas de su armario con las que combina, copiados de la lista.' },
    conjuntos: { type: 'array', items: { type: 'string' }, description: 'Hasta 3 conjuntos concretos con prendas suyas.' },
    precio: { type: 'string', description: 'Opinión sobre el precio si se conoce o se ve en la foto; si no, cadena vacía.' },
    talla: { type: 'string', description: 'Qué mirar al probárselo (talla, largo, ajuste) según su cuerpo.' },
    alternativa: { type: 'string', description: 'Si es «Mejor no» o «Puede valer», qué buscar en su lugar; si no, cadena vacía.' } } };
  const perfil = PERFIL_CAMPOS.filter(c => D.perfil[c.k] != null && D.perfil[c.k] !== '').map(c => `${c.t}: ${[].concat(D.perfil[c.k]).join(', ')}`).join('; ');
  const pal = paleta(D.perfil);
  const armario = D.prendas.map(p => `- ${p.nombre || catSing(p.cat)} (${p.cat}${p.color ? ', ' + p.color : ''}${p.corte ? ', ' + p.corte : ''}${p.veredicto && p.veredicto !== 'Quédatela' ? ', ' + p.veredicto : ''})`).join('\n');
  const lista = D.compras.filter(c => !c.hecho).map(c => '- ' + c.que).join('\n');
  const texto = `Soy un hombre y quiero saber si me compro la prenda de la foto (es de una tienda o de internet). Responde en español de España, con sinceridad y tono amable, sin hablar de peso ni de dietas.
Mi perfil: ${perfil || 'sin rellenar'}.
${pal ? `Colores que me favorecen: ${pal.si.join(', ')}. Colores que me favorecen menos cerca de la cara: ${pal.no.join(', ') || 'ninguno'}.` : ''}
Mi armario ahora mismo:
${armario || '(vacío)'}
Lo que ya tengo apuntado para comprar:
${lista || '(nada)'}
${precio ? `Precio: ${precio} €.` : 'No sé el precio (míralo en la foto si aparece).'}${D.perfil.presupuesto ? ` Mi presupuesto al mes: ${D.perfil.presupuesto}.` : ''}
${nota ? `Nota mía: ${nota}` : ''}
Ten en cuenta si me favorece (color, corte, mi cuerpo y mi cara), si se parece a algo que ya tengo, con cuántas cosas mías combina y si cubre algo que me falta. Regla: si no salen 3 conjuntos con lo que ya tengo, mejor no.`;
  return llamarIA([{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: url.split(',')[1] } }, { type: 'text', text: texto }], schema, 'medium');
}

// ---------- el tiempo en Barcelona (Open-Meteo, sin cuenta) ----------
const TIEMPO_KEY = 'estiloTiempo';
const WMO = c => c === 0 ? ['Despejado', '☀️'] : c <= 2 ? ['Algunas nubes', '🌤️'] : c === 3 ? ['Nublado', '☁️'] : c <= 48 ? ['Niebla', '🌫️'] : c <= 67 || (c >= 80 && c <= 82) ? ['Lluvia', '🌧️'] : c <= 77 || c === 85 || c === 86 ? ['Nieve', '❄️'] : ['Tormenta', '⛈️'];
let TIEMPO = (() => { try { const t = JSON.parse(localStorage.getItem(TIEMPO_KEY)); return t && t.v === 2 && t.dia === hoyKey() ? t : null; } catch (e) { return null; } })();
const FRANJAS = [['Mañana', 8, 13], ['Tarde', 14, 19], ['Noche', 20, 23]];
async function cargarTiempo() {
  if (TIEMPO && Date.now() - TIEMPO.at < 3600e3) return;
  try {
    const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=41.39&longitude=2.17&current=temperature_2m,weather_code&hourly=temperature_2m,apparent_temperature,precipitation_probability,weather_code,uv_index,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,uv_index_max,wind_speed_10m_max&timezone=Europe%2FMadrid&forecast_days=2');
    const j = await r.json(), h = j.hourly;
    const dias = j.daily.time.map((fecha, d) => {
      const horas = h.time.map((t, k) => ({ f: t, hora: +t.slice(11, 13), t: h.temperature_2m[k], s: h.apparent_temperature[k], ll: h.precipitation_probability[k] || 0, c: h.weather_code[k], uv: h.uv_index[k] || 0, v: h.wind_speed_10m[k] || 0 })).filter(x => x.f.startsWith(fecha));
      const franjas = FRANJAS.map(([n, a, b]) => { const l = horas.filter(x => x.hora >= a && x.hora <= b); if (!l.length) return null;
        return { n, min: Math.round(Math.min(...l.map(x => x.t))), max: Math.round(Math.max(...l.map(x => x.t))), sens: Math.round(Math.min(...l.map(x => x.s))), lluvia: Math.max(...l.map(x => x.ll)), code: Math.max(...l.map(x => x.c)), uv: Math.round(Math.max(...l.map(x => x.uv))), viento: Math.round(Math.max(...l.map(x => x.v))) }; }).filter(Boolean);
      return { fecha, max: Math.round(j.daily.temperature_2m_max[d]), min: Math.round(j.daily.temperature_2m_min[d]), lluvia: j.daily.precipitation_probability_max[d] || 0, code: j.daily.weather_code[d], uv: Math.round(j.daily.uv_index_max[d] || 0), viento: Math.round(j.daily.wind_speed_10m_max[d] || 0), franjas };
    });
    const hoy = dias[0];
    TIEMPO = { v: 2, at: Date.now(), dia: hoyKey(), t: Math.round(j.current.temperature_2m), max: hoy.max, min: hoy.min, lluvia: hoy.lluvia, code: hoy.code, dias };
    localStorage.setItem(TIEMPO_KEY, JSON.stringify(TIEMPO));
    ui.looks = []; if (ui.tab === 'hoy') render();
  } catch (e) {}
}
// Qué llevar encima según el tiempo de todo el día (de 8 a 23 h, que es cuando estás fuera).
function queLlevar(d) {
  if (!d) return [];
  const l = [], fr = d.franjas, frio = Math.min(...fr.map(f => f.sens)), lluviosa = fr.filter(f => f.lluvia >= 40), sol = fr.filter(f => f.n !== 'Noche' && f.code <= 2);
  const cuando = l2 => l2.map(f => f.n.toLowerCase()).join(' y ');
  if (lluviosa.length) l.push(['☂️', 'Paraguas', `${Math.max(...lluviosa.map(f => f.lluvia))} % de lluvia por la ${cuando(lluviosa)}`]);
  else if (fr.some(f => f.lluvia >= 25)) l.push(['🌂', 'Paraguas plegable, por si acaso', `hasta ${Math.max(...fr.map(f => f.lluvia))} % de lluvia`]);
  if (lluviosa.some(f => f.lluvia >= 50)) l.push(['👟', 'Calzado cerrado que aguante el agua', 'nada de ante, lona ni zapatillas blancas de tela']);
  if (d.uv >= 3 && sol.length) l.push(['🕶️', 'Gafas de sol', `sol por la ${cuando(sol)}`]);
  if (d.uv >= 6 || (d.max >= 27 && sol.length)) l.push(['🧢', 'Gorra', d.uv >= 6 ? `índice UV ${d.uv}, alto` : 'mucho sol y calor']);
  if (d.uv >= 3) l.push(['🧴', 'Protector solar', `índice UV ${d.uv}${d.uv >= 6 ? ': ponte también en orejas y cuello' : ''}`]);
  if (frio <= 6) l.push(['🧥', 'Abrigo de invierno', `sensación de ${frio}° en algún momento`]);
  else if (frio <= 11) l.push(['🧥', 'Abrigo o chaquetón', `sensación de ${frio}° ${fr.find(f => f.sens === frio).n === 'Noche' ? 'por la noche' : 'por la mañana'}`]);
  else if (frio <= 17) { const f = fr.find(x => x.sens === frio); l.push(['🧥', `Chaqueta o sobrecamisa para la ${f.n.toLowerCase()}`, `bajará a ${frio}° de sensación`]); }
  if (frio <= 8) l.push(['🧣', 'Bufanda', 'hace frío de verdad']);
  if (d.max - d.min >= 8) l.push(['🧅', 'Ve por capas', `de ${d.min}° a ${d.max}° en el día`]);
  if (d.viento >= 35) l.push(['💨', 'Algo que corte el viento', `rachas de ${d.viento} km/h${d.viento >= 45 ? '; el paraguas sufrirá' : ''}`]);
  if (d.max >= 29) l.push(['💧', 'Botella de agua y ropa fresca', `máxima de ${d.max}°: lino, algodón fino y colores claros`]);
  return l;
}
function tiempoHTML() {
  if (!TIEMPO || !TIEMPO.dias) return '';
  const tarde = new Date().getHours() >= 21, idx = ui.diaT != null ? ui.diaT : tarde ? 1 : 0, d = TIEMPO.dias[idx];
  if (!d) return '';
  const ll = queLlevar(d);
  return `<section class="card tiempo"><div class="row-h"><h2>${WMO(d.code)[1]} ${idx ? 'Mañana' : 'Hoy'}</h2><div class="seg mini-seg"><button class="${idx === 0 ? 'on' : ''}" data-diat="0">Hoy</button><button class="${idx === 1 ? 'on' : ''}" data-diat="1">${(d => d.charAt(0).toUpperCase() + d.slice(1))(new Date(Date.now() + 864e5).toLocaleDateString('es-ES', { weekday: 'long' }))}</button></div></div>
    <p class="mini-t" style="margin-top:0">${WMO(d.code)[0]} · ${d.min}–${d.max}°${d.lluvia >= 20 ? ` · ${d.lluvia} % de lluvia` : ''}${d.uv ? ` · UV ${d.uv}` : ''}</p>
    <div class="franjas">${d.franjas.map(f => `<div class="franja"><small>${f.n}</small><span class="ic">${WMO(f.code)[1]}</span><b>${f.min === f.max ? f.max : `${f.min}–${f.max}`}°</b><small>${f.lluvia >= 20 ? `💧 ${f.lluvia} %` : f.sens < f.min - 1 ? `sensación ${f.sens}°` : WMO(f.code)[0]}</small></div>`).join('')}</div>
    ${ll.length ? `<p class="mini">Llévate</p><div class="llevar">${ll.map(([i, t, por]) => `<div class="lleva"><span>${i}</span><span><b>${esc(t)}</b><small>${esc(por)}</small></span></div>`).join('')}</div>` : '<p class="mini-t">Día tranquilo: no hace falta nada especial.</p>'}
  </section>`;
}
function clima() {
  if (TIEMPO) return TIEMPO.max >= 25 ? 'Calor' : TIEMPO.max <= 15 ? 'Frío' : 'Entretiempo';
  const m = new Date().getMonth() + 1; return m >= 6 && m <= 9 ? 'Calor' : (m >= 11 || m <= 3) ? 'Frío' : 'Entretiempo';
}
function consejoTiempo() {
  if (!TIEMPO) return '';
  const l = [];
  if (TIEMPO.lluvia >= 50) l.push('lleva chaqueta y evita el ante y las zapatillas de tela');
  else if (TIEMPO.lluvia >= 30) l.push('puede llover: mejor algo que aguante el agua');
  if (TIEMPO.max - TIEMPO.min >= 8) l.push('cambia bastante de la mañana a la tarde: ve por capas');
  if (TIEMPO.max >= 28) l.push('tejidos frescos (lino, algodón fino) y colores claros');
  if (TIEMPO.max <= 12) l.push('abrigo y una capa de punto');
  return l.length ? l[0][0].toUpperCase() + l.join('; ').slice(1) + '.' : '';
}

// ---------- utilidades de interfaz ----------
function toast(t, accion) {
  document.querySelectorAll('.toast').forEach(x => x.remove());
  const d = document.createElement('div'); d.className = 'toast'; d.innerHTML = `<span>${esc(t)}</span>${accion ? `<button>${esc(accion[0])}</button>` : ''}`;
  if (accion) d.querySelector('button').onclick = () => { d.remove(); accion[1](); };
  document.body.appendChild(d); setTimeout(() => d.remove(), accion ? 5000 : 2800);
}
function sheet(html) {
  const v = document.createElement('div'); v.className = 'veil'; v.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
  document.body.appendChild(v); document.body.style.overflow = 'hidden';
  const close = () => { v.remove(); if (!document.querySelector('.veil')) document.body.style.overflow = ''; };
  v.addEventListener('click', e => { if (e.target === v || e.target.closest('[data-close]')) close(); });
  v.close = close; return v;
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') { const v = [...document.querySelectorAll('.veil')].pop(); if (v) v.close(); } });
const swatch = c => `<span class="sw" style="background:${HEX[c] || '#ccc'}"></span>`;
const thumb = p => FOTOS[p.id] ? `<img src="${FOTOS[p.id]}" alt="" loading="lazy">` : `<span class="nofoto">${prendaSVG(p.cat, p.color, p.corte)}</span>`;
const prenda = id => D.prendas.find(p => p.id === id);
// Nombre automático con concordancia: «camiseta blanca», «zapatillas negras», «vaqueros azul marino».
const SING = { Camisetas: ['Camiseta', 'f'], Camisas: ['Camisa', 'f'], Polos: ['Polo', 'm'], 'Sudaderas y jerséis': ['Jersey', 'm'], 'Chaquetas y abrigos': ['Chaqueta', 'f'], Vaqueros: ['Vaqueros', 'mp'], Pantalones: ['Pantalón', 'm'], 'Pantalón corto': ['Pantalón corto', 'm'], Zapatillas: ['Zapatillas', 'fp'], Zapatos: ['Zapatos', 'mp'], Accesorios: ['Accesorio', 'm'], Deporte: ['Ropa de deporte', 'f'], Casa: ['Ropa de casa', 'f'] };
function adjColor(c, g) {
  if (!c) return '';
  const l = c.toLowerCase(), var_ = { blanco: 1, negro: 1, rojo: 1, amarillo: 1, morado: 1, estampado: 1, vaquero: 1 }[l];
  if (!var_) return /^(gris|marrón|verde|azul claro|beis|naranja|rosa)$/.test(l) && g.endsWith('p') ? { gris: 'grises', marrón: 'marrones', verde: 'verdes', 'azul claro': 'azul claro', beis: 'beis', naranja: 'naranjas', rosa: 'rosas' }[l] : l;
  const f = g[0] === 'f', pl = g.endsWith('p'); let r = f ? l.replace(/o$/, 'a') : l; if (pl) r += 's'; return r;
}
const catSing = cat => (SING[cat] || [cat || 'Prenda'])[0];
const nombre = p => p.nombre || (SING[p.cat] ? `${SING[p.cat][0]} ${p.cat === 'Vaqueros' && p.color === 'Vaquero' ? '' : adjColor(p.color, SING[p.cat][1])}`.trim() : 'Prenda');
const fmtDia = k => new Date(k + 'T12:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
const dias = k => Math.round((new Date(hoyKey() + 'T12:00') - new Date(k + 'T12:00')) / 864e5);
const haceDias = k => { const n = dias(k); return n === 0 ? 'hoy' : n === 1 ? 'ayer' : `hace ${n} días`; };
const eur = n => (Math.round(n * 100) / 100).toLocaleString('es-ES', { maximumFractionDigits: 2 }) + ' €';
const disponible = p => !p.estado;

// ---------- historial y estadísticas ----------
const usos = p => (p.usos0 || 0) + D.historial.filter(h => h.prendas.includes(p.id)).length;
const ultimo = p => { const h = D.historial.filter(x => x.prendas.includes(p.id)).map(x => x.dia).sort().pop(); return h || p.ultimo0 || null; };
const deHoy = () => D.historial.find(h => h.dia === hoyKey());
function ponerHoy(ids, ocasion) {
  const h = deHoy(), antes = h ? h.prendas.slice() : null;
  if (h) { h.prendas = [...new Set(ids)]; h.ocasion = ocasion || h.ocasion; h.fecha = new Date().toISOString(); }
  else D.historial.push({ id: uid('h'), dia: hoyKey(), fecha: new Date().toISOString(), prendas: [...new Set(ids)], ocasion: ocasion || 'Diario' });
  D.historial = D.historial.slice(-400); save(); render();
  toast('Apuntado: hoy llevas esto.', ['Deshacer', () => { const x = deHoy(); if (antes) x.prendas = antes; else D.historial = D.historial.filter(y => y !== x); save(); render(); }]);
}

// ---------- generador de conjuntos ----------
const valeClima = (p, t) => !p.temp || p.temp === 'Todo el año' || t === 'Entretiempo' || p.temp === t;
function generarLooks() {
  const t = clima(), oc = OCASION_CATS[ui.ocasion], lock = ui.lock.map(prenda).filter(Boolean);
  const base = D.prendas.filter(p => disponible(p) && valeClima(p, t) && !(t === 'Frío' && p.cat === 'Pantalón corto'));
  const parte = (k, cats) => { const l = base.filter(p => cats.includes(p.cat)); const pref = oc && oc[k] ? l.filter(p => oc[k].includes(p.cat)) : l; return pref.length ? pref : l; };
  const deporte = ui.ocasion === 'Deporte';
  const ar = parte('arriba', deporte ? PARTE.arriba.concat('Deporte') : PARTE.arriba), ab = parte('abajo', deporte ? PARTE.abajo.concat('Deporte') : PARTE.abajo), pi = parte('pies', PARTE.pies);
  const capa = t === 'Frío' || (t === 'Entretiempo' && TIEMPO && (TIEMPO.min <= 15 || TIEMPO.lluvia >= 40));
  const en = t === 'Calor' ? [] : base.filter(p => PARTE.encima.includes(p.cat));
  const fijo = k => lock.find(p => PARTE[k].includes(p.cat) || (p.cat === 'Deporte' && k !== 'pies' && k !== 'encima'));
  if (!(fijo('arriba') || ar.length) || !(fijo('abajo') || ab.length)) return [];
  const rnd = l => l[Math.floor(Math.random() * l.length)], vistos = new Set(), out = [];
  const pena = p => { const u = ultimo(p); if (!u) return 0; const d = dias(u); return d <= 1 ? 8 : d <= 3 ? 4 : d <= 6 ? 1.5 : 0; };
  for (let i = 0; i < 160; i++) {
    const l = [fijo('arriba') || rnd(ar), fijo('abajo') || rnd(ab)];
    if (fijo('pies') || pi.length) l.push(fijo('pies') || rnd(pi));
    if (fijo('encima') || (capa && en.length)) l.push(fijo('encima') || rnd(en));
    const k = l.map(p => p.id).sort().join(); if (vistos.has(k)) continue; vistos.add(k);
    const nota = notaConjunto(l);
    const score = nota.n * 10 + l.reduce((s, p) => s + (p.fav ? 2 : 0) - pena(p), 0) + Math.random() * 3;
    out.push({ ids: l.map(p => p.id), score, nota });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 12);
}

// ---------- vistas ----------
function heroHTML(titulo, sub) { return `<header class="hero"><p class="eyebrow">${sub}</p><h1>${titulo}</h1></header>`; }

function vHoy() {
  const p = D.perfil, h = deHoy(), d = new Date();
  if (!ui.looks.length || ui.looks.some(l => l.ids.some(id => !prenda(id)))) { ui.looks = generarLooks(); ui.lookI = 0; }
  const look = ui.looks[ui.lookI];
  const tiempo = TIEMPO ? `<span class="tchip">${WMO(TIEMPO.code)[1]} ${TIEMPO.t}° · ${TIEMPO.min}–${TIEMPO.max}°${TIEMPO.lluvia >= 20 ? ` · ${TIEMPO.lluvia}% lluvia` : ''}</span>` : '';
  const ct = consejoTiempo();
  const r = D.rutinaPasos || rutina(p), hecho = D.rutina[hoyKey()] || { m: [], n: [] };
  const tip = CONSEJOS_GENERALES[(d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate()) % CONSEJOS_GENERALES.length];
  const cesta = D.prendas.filter(x => x.estado === 'Para lavar');
  const semana = [...Array(7)].map((_, i) => { const k = diaKey(Date.now() - (6 - i) * 864e5); return [k, D.historial.find(x => x.dia === k)]; });
  const vacioPerfil = Object.keys(p).filter(k => k !== '_f').length < 3;
  return `${heroHTML('¿Qué me pongo?', `${d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} ${tiempo}`)}
    ${tiempoHTML()}
    ${vacioPerfil ? `<div class="card aviso"><h2>Hazla tuya</h2><p class="sub">Con tus datos (piel, cara, complexión…) los consejos y la paleta dejan de ser generales.</p><button class="pill on" data-go="yo">Ir a «Para mí»</button></div>` : ''}
    ${h ? `<section class="card puesto"><div class="row-h"><h2>Hoy llevas</h2><button class="pill sm" data-act="quitarhoy">Quitar</button></div><div class="look sm">${h.prendas.map(prenda).filter(Boolean).map(x => `<button class="lk" data-ficha="${x.id}">${thumb(x)}</button>`).join('')}</div></section>` : ''}
    <section class="card costura">
      <div class="row-h"><h2>${h ? 'Otra idea' : 'Tu conjunto para hoy'}</h2>${ui.looks.length > 1 ? `<small class="muted">${ui.lookI + 1} de ${ui.looks.length}</small>` : ''}</div>
      <div class="chips scroll tight">${OCASIONES.map(o => `<button class="pill sm ${ui.ocasion === o ? 'on' : ''}" data-oc="${o}">${o}</button>`).join('')}</div>
      ${look ? `<div class="look">${look.ids.map(prenda).filter(Boolean).map(x => `<button class="lk ${ui.lock.includes(x.id) ? 'fijo' : ''}" data-lock="${x.id}" aria-pressed="${ui.lock.includes(x.id)}">${thumb(x)}<small>${esc(nombre(x))}</small><i class="candado" aria-hidden="true">${ui.lock.includes(x.id) ? '🔒' : ''}</i></button>`).join('')}</div>
        <p class="nota n${look.nota.n}">${esc(look.nota.t)}</p>
        ${ct ? `<p class="mini-t">${esc(ct)}</p>` : ''}
        <p class="mini-t">Toca una prenda para fijarla y cambiar solo el resto.</p>
        <div class="row"><button class="btn" data-act="puesto">Me lo pongo</button><button class="pill" data-act="otro">Otra idea</button><button class="pill" data-act="guardarlook">Guardar</button></div>`
      : D.prendas.length ? `<p class="sub">No encuentro combinación con lo que tienes disponible${ui.ocasion !== 'Diario' ? ' para esta ocasión' : ''}. Hace falta al menos una prenda de arriba y una de abajo limpias y para este tiempo.</p>${cesta.length ? '<button class="pill" data-act="lavado">Ya he lavado la ropa</button>' : ''}`
      : `<p class="sub">Añade tu ropa al armario y te propongo conjuntos según el tiempo que hace y la ocasión.</p><button class="btn" data-act="nueva">＋ Añadir mi primera prenda</button>`}
    </section>
    ${(() => { const oc = ocDia(0), x = ideaPara(oc); return x ? `<p class="sec">Idea para hoy · ${oc.toLowerCase()}</p>${outfitHTML(x, true)}<button class="pill sm" data-go="conjuntos" style="margin:-4px 0 14px">Ver más outfits y tu semana</button>` : ''; })()}
    ${cesta.length ? `<section class="card cesta"><div class="row-h"><h2>🧺 Para lavar</h2><button class="pill sm" data-act="lavado">Ya está limpia</button></div><div class="look xs">${cesta.map(x => `<button class="lk" data-ficha="${x.id}">${thumb(x)}</button>`).join('')}</div><p class="mini-t">No te las propongo hasta que las marques como limpias.</p></section>` : ''}
    ${D.historial.length ? `<section class="card"><h2>Tu semana</h2><div class="semana">${semana.map(([k, x]) => `<div class="dia ${k === hoyKey() ? 'hoy' : ''}"><small>${fmtDia(k)}</small>${x ? `<span class="mini-look">${x.prendas.slice(0, 2).map(prenda).filter(Boolean).map(thumb).join('')}</span>` : '<span class="vacio-dia">·</span>'}</div>`).join('')}</div></section>` : ''}
    <section class="card"><div class="row-h"><h2>Rutina de hoy</h2><button class="pill sm" data-act="rutinaedit">Editar</button></div>
      <p class="mini">Mañana</p>${r.manana.map((x, i) => `<button class="chk ${hecho.m.includes(i) ? 'ok' : ''}" data-rut="m${i}"><span></span>${esc(x)}</button>`).join('')}
      <p class="mini">Noche</p>${r.noche.map((x, i) => `<button class="chk ${hecho.n.includes(i) ? 'ok' : ''}" data-rut="n${i}"><span></span>${esc(x)}</button>`).join('')}
    </section>
    ${(() => { const r = resumenPantalones(D.prendas); if (!r.total) return ''; const rc = recoPantalones(D.prendas, D.compras), nl = rc.compra.filter(x => !x.enLista).length; return `<button class="card pantres" data-go="armario"><b>👖 Tus pantalones</b><small>${r.g.bien.length} listos · ${r.g.arreglar.length} para arreglar · ${r.g.vender.length} para vender${nl ? ` · ${nl} ${nl === 1 ? 'recomendación' : 'recomendaciones'} de compra` : ''}</small></button>`; })()}
    <section class="card etiqueta"><small>Consejo del día</small><p>${esc(tip)}</p></section>`;
}

function listaArmario() {
  const q = ui.q.trim().toLowerCase();
  let l = D.prendas.filter(p => (!ui.cat || p.cat === ui.cat) && (!q || [nombre(p), p.cat, p.color, p.tienda, p.notas, p.corte, p.formalidad, p.veredicto].concat(CARACT.map(c => p[c[0]])).join(' ').toLowerCase().includes(q)));
  if (ui.vf) { const gr = GRUPOS_PANT.find(x => x[0] === ui.vf); l = l.filter(p => esPant(p) && (ui.vf === 'sin' ? !p.veredicto : gr && gr[3](p.veredicto || ''))); }
  if (ui.filtro === 'fav') l = l.filter(p => p.fav);
  if (ui.filtro === 'lavar') l = l.filter(p => p.estado === 'Para lavar');
  if (ui.filtro === 'olvidadas') l = l.filter(p => { const u = ultimo(p); return (u ? dias(u) : dias(p.fecha.slice(0, 10))) >= 60; });
  if (ui.filtro === 'donar') l = l.filter(p => p.estado === 'Para donar' || p.estado === 'Para arreglar');
  if (ui.filtro === 'revision') l = l.filter(p => p.veredicto && p.veredicto !== 'Quédatela').sort((a, b) => VEREDICTOS.findIndex(v => v[0] === b.veredicto) - VEREDICTOS.findIndex(v => v[0] === a.veredicto));
  const ord = { recientes: (a, b) => (b.fecha || '').localeCompare(a.fecha || ''), mas: (a, b) => usos(b) - usos(a), menos: (a, b) => usos(a) - usos(b), color: (a, b) => COLORES.indexOf(a.color) - COLORES.indexOf(b.color) || CATS.indexOf(a.cat) - CATS.indexOf(b.cat), tipo: (a, b) => CATS.indexOf(a.cat) - CATS.indexOf(b.cat) };
  return l.sort(ord[ui.orden]);
}
function vArmario() {
  const l = listaArmario(), n = D.prendas.length, cats = CATS.filter(c => D.prendas.some(p => p.cat === c));
  const valor = D.prendas.reduce((s, p) => s + (+p.precio || 0), 0), conPrecio = D.prendas.filter(p => +p.precio);
  const cpu = conPrecio.length ? conPrecio.reduce((s, p) => s + (+p.precio) / Math.max(1, usos(p)), 0) / conPrecio.length : 0;
  const olvidadas = D.prendas.filter(p => { const u = ultimo(p); return (u ? dias(u) : dias((p.fecha || '').slice(0, 10) || hoyKey())) >= 60; }).length;
  return `${heroHTML('Mi armario', n ? `${n} ${n === 1 ? 'prenda' : 'prendas'}` : 'Empieza por lo que más te pones')}
    <button class="btn full" data-act="nueva">＋ Añadir prenda</button>
    <label class="pill multi">📷 Subir varias fotos de golpe<input type="file" accept="image/*" multiple id="multi" hidden></label>
    ${n ? `<div class="stats"><div><b>${n}</b><small>prendas</small></div><div><b>${valor ? eur(valor) : '—'}</b><small>valor</small></div><div><b>${cpu ? eur(cpu) : '—'}</b><small>coste por puesta</small></div><button data-filtro="olvidadas" class="${ui.filtro === 'olvidadas' ? 'on' : ''}"><b>${olvidadas}</b><small>sin ponerte 2 meses</small></button></div>
      <input type="search" class="buscar" id="buscar" placeholder="Buscar: camisa, azul, Uniqlo…" value="${esc(ui.q)}" autocomplete="off">
      <div class="chips scroll"><button class="pill sm ${!ui.cat ? 'on' : ''}" data-cat="">Todo</button>${cats.map(c => `<button class="pill sm ${ui.cat === c ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)} <span class="cnt">${D.prendas.filter(p => p.cat === c).length}</span></button>`).join('')}</div>
      <div class="chips scroll"><span class="lbl">Ordenar</span>${[['recientes', 'Recientes'], ['mas', 'Más puestas'], ['menos', 'Menos puestas'], ['tipo', 'Tipo'], ['color', 'Color']].map(([k, t]) => `<button class="pill sm ${ui.orden === k ? 'on' : ''}" data-orden="${k}">${t}</button>`).join('')}<span class="lbl">Ver</span>${[['revision', '🔍 Revisión'], ['fav', '♥ Favoritas'], ['lavar', '🧺 Para lavar'], ['donar', 'Arreglar o donar']].map(([k, t]) => `<button class="pill sm ${ui.filtro === k ? 'on' : ''}" data-filtro="${k}">${t}</button>`).join('')}</div>
      ${pantalonesHTML()}
      ${ui.filtro === 'revision' ? resumenRevision() : ''}
      ${l.length ? `<div class="grid">${l.map(p => `<button class="prenda" data-ficha="${p.id}">${thumb(p)}${p.fav ? '<i class="fav">♥</i>' : ''}${p.veredicto && VER[p.veredicto] && p.veredicto !== 'Quédatela' ? `<i class="vbadge ${VER[p.veredicto][1]}" title="${esc(p.veredicto)}">${VER[p.veredicto][2]}</i>` : ''}${p.estado ? `<i class="badge">${p.estado === 'Para lavar' ? '🧺' : p.estado === 'Para arreglar' ? '🪡' : '📦'}</i>` : ''}<span class="pn"><b>${esc(nombre(p))}</b><small>${swatch(p.color)}${usos(p) ? `${usos(p)} ${usos(p) === 1 ? 'vez' : 'veces'}` : 'sin estrenar'}</small></span></button>`).join('')}</div>` : '<div class="vacio"><p>Nada con estos filtros.</p></div>'}`
    : `<div class="vacio grande"><div class="percha" aria-hidden="true"></div><p><b>Tu armario está vacío.</b></p><p>Haz una foto a cada prenda, colgada en una percha o extendida en la cama, con luz de día. La app detecta el color sola.</p><p class="mini-t">Empieza por lo que más te pones: con 8–10 prendas ya te propongo conjuntos.</p></div>`}`;
}

function añadirReco(x) {
  if (D.compras.some(c => !c.hecho && c.que === x.que)) return toast('Ya está en tu lista.');
  D.compras.push({ id: uid('b'), que: x.que, cat: x.cat, prio: x.prio, precio: '', donde: x.donde, link: '', por: x.por, claude: true, hecho: false, fecha: new Date().toISOString() });
  save(); render(); toast('Añadido a tu lista de compras.', ['Ver', () => ir('compras')]);
}
function pantalonesHTML() {
  const r = resumenPantalones(D.prendas); if (!r.total) return '';
  const rc = recoPantalones(D.prendas, D.compras), s = r.g;
  const lista = (l, campo) => l.map(p => `<button class="lrow-b" data-ficha="${p.id}"><b>${esc(nombre(p))}</b>${campo && p[campo] ? `<small>${esc(p[campo])}</small>` : ''}</button>`).join('');
  return `<section class="card pant"><div class="row-h"><h2>👖 Tus pantalones</h2><small class="muted">${r.total} en total</small></div>
    <div class="chips scroll">${GRUPOS_PANT.map(([k, t, i]) => s[k].length ? `<button class="pill sm ${ui.vf === k ? 'on' : ''}" data-vf="${k}">${i} ${t} <span class="cnt">${s[k].length}</span></button>` : '').join('')}${s.sin.length ? `<button class="pill sm ${ui.vf === 'sin' ? 'on' : ''}" data-vf="sin">Sin revisar <span class="cnt">${s.sin.length}</span></button>` : ''}</div>
    ${ui.vf ? '<p class="mini-t">Mostrando solo ese grupo. Toca otra vez el botón para ver todo.</p>' : ''}
    ${s.arreglar.length ? `<p class="mini">🪡 Para arreglar</p>${lista(s.arreglar, 'arreglo')}` : ''}
    ${s.vender.length ? `<p class="mini">💰 Para vender o regalar</p>${lista(s.vender, 'ajuste')}` : ''}
    ${rc.compra.length ? `<p class="mini">⭐ Te recomiendo comprar</p>${rc.compra.map((x, i) => `<div class="falta"><b>${esc(x.que)}</b><small>${esc(x.por)}</small><div class="row">${x.enLista ? '<span class="tag bien">Ya en tu lista</span>' : `<button class="pill sm on" data-reco="${i}">Añadir a mi lista</button>`}</div></div>`).join('')}` : ''}
    ${rc.avisos.map(t => `<p class="mini-t">💡 ${esc(t)}</p>`).join('')}</section>`;
}
function resumenRevision() {
  const con = D.prendas.filter(p => p.veredicto);
  if (!con.length) return '<section class="card etiqueta"><p>Cuando Claude revise tu ropa, aquí verás qué quedarte, qué arreglar, qué vender y qué donar.</p></section>';
  return `<section class="card"><h2>Revisión de tu armario</h2><div class="revis">${VEREDICTOS.map(([v, c, i]) => { const n = con.filter(p => p.veredicto === v).length; return n ? `<span class="tag ${c}">${i} ${v}: ${n}</span>` : ''; }).join('')}</div><p class="mini-t">Abajo, lo que no es «quédatela». Toca cada prenda para ver por qué.</p></section>`;
}

function vConjuntos(sinHero) {
  const l = D.conjuntos.filter(c => !ui.conjOc || c.ocasion === ui.conjOc).sort((a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0));
  return `${sinHero ? '' : heroHTML('Conjuntos', `${D.conjuntos.length} guardados`)}
    <button class="btn full" data-act="nuevoconj">＋ Crear conjunto</button>
    ${D.conjuntos.length ? `<div class="chips scroll"><button class="pill sm ${!ui.conjOc ? 'on' : ''}" data-conjoc="">Todos</button>${OCASIONES.filter(o => D.conjuntos.some(c => c.ocasion === o)).map(o => `<button class="pill sm ${ui.conjOc === o ? 'on' : ''}" data-conjoc="${o}">${o}</button>`).join('')}</div>
      ${l.map(c => { const ps = c.prendas.map(prenda).filter(Boolean), nota = notaConjunto(ps), lav = ps.some(p => p.estado === 'Para lavar'), veces = D.historial.filter(h => c.prendas.every(id => h.prendas.includes(id))).length + (c.usos || 0);
        return `<div class="card conj"><div class="row-h"><h2>${c.fav ? '♥ ' : ''}${esc(c.nombre)}</h2><span class="tag">${esc(c.ocasion)}</span></div><div class="look sm">${ps.map(x => `<button class="lk" data-ficha="${x.id}">${thumb(x)}</button>`).join('')}</div>
          <p class="nota n${nota.n}">${esc(nota.t)}</p>${c.nota ? `<p class="mini-t">${esc(c.nota)}</p>` : ''}
          <div class="row"><small class="muted">${veces ? `Puesto ${veces} ${veces === 1 ? 'vez' : 'veces'}` : 'Sin estrenar'}${lav ? ' · algo está para lavar' : ''}</small><span class="sp"></span><button class="pill sm" data-conjfav="${c.id}">${c.fav ? '♥' : '♡'}</button><button class="pill sm" data-conjedit="${c.id}">Editar</button><button class="pill sm on" data-conjpuesto="${c.id}">Me lo pongo</button></div></div>`; }).join('') || '<div class="vacio"><p>No hay conjuntos para esta ocasión.</p></div>'}`
    : `<div class="vacio grande"><p><b>Guarda los conjuntos que te gustan</b> para no pensar cada mañana: uno para el trabajo, uno para una cita, uno para salir.</p><p class="mini-t">También puedes guardar el que te propone «Hoy».</p></div>`}`;
}

// ---------- outfits pensados para ti ----------
const ocDia = off => { const w = new Date(Date.now() + off * 864e5).getDay(); return (D.semanaOc && D.semanaOc[w]) || SEMANA_OC[w]; };
function ideaPara(oc, off = 0) {
  const t = clima(), pal = paleta(D.perfil);
  let l = OUTFITS.filter(o => o.oc === oc); const lc = l.filter(o => o.clima.includes(t)); if (lc.length) l = lc;
  const sc = l.map(o => { const x = personalizar(o, pal); return { o: x, c: cruzarOutfit(x, D.prendas) }; });
  const comp = sc.filter(s => s.c.completo), pool = comp.length ? comp : sc;
  return pool.length ? pool[(Math.floor(Date.now() / 864e5) + off) % pool.length] : null;
}
function outfitPorId(id) { const o = OUTFITS.find(x => x.id === id); const x = personalizar(o, paleta(D.perfil)); return { o: x, c: cruzarOutfit(x, D.prendas) }; }
function outfitHTML({ o, c }, compacto) {
  const t = clima(), fuera = !o.clima.includes(t);
  return `<article class="card outfit ${c.completo ? 'completo' : ''}">
    <div class="row-h"><h2>${esc(o.t)}</h2><span class="tag ${c.completo ? 'bien' : ''}">${c.completo ? 'Lo tienes todo' : `Te ${c.falta.length === 1 ? 'falta 1' : `faltan ${c.falta.length}`}`}</span></div>
    ${fuera ? `<p class="mini-t">Pensado más bien para tiempo de ${o.clima.join(' o ').toLowerCase()}.</p>` : ''}
    <div class="piezas">${c.res.map(r => `<div class="pz">${r.p ? `<button class="lk" data-ficha="${r.p.id}">${thumb(r.p)}</button>` : `<span class="pz-vacio"><i style="background:${HEX[r.pz.col[0]]}"></i></span>`}<span class="pz-t"><b>${esc(r.pz.d)}</b><small>${r.p ? 'Tienes: ' + esc(nombre(r.p)) : `${r.pz.opc ? 'Opcional' : 'Te falta'} · ${r.pz.col.slice(0, 3).map(x => `${swatch(x)}${x.toLowerCase()}`).join(' ')}`}</small></span></div>`).join('')}</div>
    ${compacto ? '' : `<p class="por">${esc(o.por)}</p>${o.truco ? `<p class="mini-t">💡 ${esc(o.truco)}</p>` : ''}`}
    <div class="row">${c.completo ? `<button class="btn" data-oput="${o.id}">Me lo pongo</button><button class="pill" data-oguardar="${o.id}">Guardar</button>` : `<button class="pill on" data-ofalta="${o.id}">Añadir lo que falta a compras</button>${c.res.filter(r => r.p).length >= 2 ? `<button class="pill" data-oguardar="${o.id}">Guardar lo que tengo</button>` : ''}`}</div>
  </article>`;
}
function vOutfits() {
  const seg = `<div class="seg"><button class="${ui.outSeg === 'ideas' ? 'on' : ''}" data-seg="ideas">Ideas para ti</button><button class="${ui.outSeg === 'mios' ? 'on' : ''}" data-seg="mios">Mis conjuntos${D.conjuntos.length ? ` (${D.conjuntos.length})` : ''}</button></div>`;
  if (ui.outSeg === 'mios') return `${heroHTML('Outfits', 'Los que has guardado')}${seg}${vConjuntos(true)}`;
  const semana = [...Array(7)].map((_, i) => { const d = new Date(Date.now() + i * 864e5), oc = ocDia(i), id = ideaPara(oc, i); return { i, d, oc, id }; });
  const ocs = ui.ideaOc ? [ui.ideaOc] : OCASIONES_IDEAS;
  const pal = paleta(D.perfil), t = clima();
  return `${heroHTML('Outfits', `Pensados para ti · ${t.toLowerCase()}${TIEMPO ? ` (${TIEMPO.min}–${TIEMPO.max}°)` : ''}`)}${seg}
    <section class="card"><h2>Tu semana</h2><p class="mini-t" style="margin-top:0">Toca la ocasión de un día para cambiarla.</p>
      <div class="plan">${semana.map(s => `<div class="plan-d ${s.i === 0 ? 'hoy' : ''}"><small>${s.i === 0 ? 'Hoy' : s.d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}</small><button class="pill sm" data-ocdia="${s.d.getDay()}">${s.oc}</button>${s.id ? `<button class="plan-o" data-verout="${s.id.o.id}"><b>${esc(s.id.o.t)}</b><small>${s.id.c.completo ? '✓ lo tienes' : `faltan ${s.id.c.falta.length}`}</small></button>` : ''}</div>`).join('')}</div>
    </section>
    ${!pal ? '<section class="card aviso"><p class="sub" style="margin:0">Con tu tono de piel y tu pelo en «Para mí», los colores de cada outfit se ordenan según lo que más te favorece.</p></section>' : ''}
    <div class="chips scroll"><button class="pill sm ${!ui.ideaOc ? 'on' : ''}" data-ideaoc="">Todas</button>${OCASIONES_IDEAS.map(o => `<button class="pill sm ${ui.ideaOc === o ? 'on' : ''}" data-ideaoc="${o}">${o}</button>`).join('')}</div>
    ${ocs.map(oc => { const l = OUTFITS.filter(o => o.oc === oc).map(o => outfitPorId(o.id)).sort((a, b) => (b.o.clima.includes(t) - a.o.clima.includes(t)) || (b.c.completo - a.c.completo) || (a.c.falta.length - b.c.falta.length)); return `<p class="sec">${oc}</p>${l.map(x => outfitHTML(x)).join('')}`; }).join('')}`;
}

function faltan() {
  const est = D.perfil.estilo || [], l = BASICOS.concat(...est.map(e => BASICOS_ESTILO[e] || []));
  return l.map(b => ({ ...b, tengo: D.prendas.filter(p => p.cat === b.cat).length })).filter(b => b.tengo < b.min);
}
function presupuestoMes() { const m = { 'Menos de 30 €': 30, '30–80 €': 80, '80–150 €': 150, 'Más de 150 €': 250 }[D.perfil.presupuesto]; return m || 0; }
function vCompras() {
  const f = faltan(), pend = D.compras.filter(c => !c.hecho).sort((a, b) => a.prio - b.prio), hechas = D.compras.filter(c => c.hecho);
  const total = pend.reduce((s, c) => s + (+c.precio || 0), 0), mes = hoyKey().slice(0, 7);
  const gastado = hechas.filter(c => (c.cuando || '').startsWith(mes)).reduce((s, c) => s + (+c.precio || 0), 0), tope = presupuestoMes();
  return `${heroHTML('Compras', `${pend.length} pendientes${total ? ` · unos ${eur(total)}` : ''}`)}
    <button class="btn full" data-act="locompro">🤔 ¿Lo compro? Compruébalo antes</button>
    <div class="row" style="margin:-4px 0 14px"><button class="pill" data-guia="tiendas">🛍️ Dónde comprar</button><button class="pill" data-guia="vender">♻️ Vender o donar</button></div>
    ${tope ? `<section class="card"><div class="row-h"><h2>Este mes</h2><small class="muted">${eur(gastado)} de ${eur(tope)}</small></div><div class="barra"><span style="width:${Math.min(100, gastado / tope * 100)}%" class="${gastado > tope ? 'pasa' : ''}"></span></div><p class="mini-t">${gastado > tope ? 'Te has pasado del presupuesto que pusiste. Nada grave: el mes que viene, más tranquilo.' : 'Según el presupuesto que pusiste en «Para mí».'}</p></section>` : ''}
    ${(() => { const rc = recoPantalones(D.prendas, D.compras).compra.filter(x => !x.enLista); return rc.length ? `<section class="card pant"><h2>⭐ Te recomiendo comprar</h2><p class="sub">Según tus pantalones y lo que mejor te queda.</p>${rc.map(x => `<div class="falta"><b>${esc(x.que)}</b><small>${esc(x.por)}</small><div class="row"><span class="tag">${['', 'Urgente', 'Pronto', 'Cuando pueda'][x.prio]}</span><button class="pill sm on" data-reco2="${esc(x.que)}">Añadir a mi lista</button></div></div>`).join('')}</section>` : ''; })()}
    <section class="card"><h2>Mi lista</h2>
      ${pend.map(c => `<div class="lrow"><button class="chk" data-comp="${c.id}" aria-label="Marcar como comprado"><span></span></button><span class="b"><b>${c.claude ? '<i class="rec" title="Recomendado por Claude">★</i> ' : ''}${esc(c.que)}</b><small>${['', 'Urgente', 'Pronto', 'Cuando pueda'][c.prio] || ''}${c.precio ? ` · ${esc(c.precio)} €` : ''}${c.donde ? ` · ${esc(c.donde)}` : ''}</small>${c.por ? `<small class="por-c">${esc(c.por)}</small>` : ''}</span>${c.link ? `<a class="pill sm" href="${esc(c.link)}" target="_blank" rel="noopener noreferrer">Ver</a>` : ''}<button class="x" data-compdel="${c.id}" aria-label="Borrar">×</button></div>`).join('') || '<p class="sub">Vacía. Mira abajo lo que te falta.</p>'}
      <button class="pill" data-act="nuevacomp">＋ Añadir</button>
      ${hechas.length ? `<details class="sub-det"><summary>Comprado (${hechas.length})</summary>${hechas.slice(-15).reverse().map(c => `<div class="lrow hecha"><button class="chk ok" data-comp="${c.id}" aria-label="Desmarcar"><span></span></button><span class="b"><b>${esc(c.que)}</b>${c.precio ? `<small>${esc(c.precio)} €</small>` : ''}</span><button class="x" data-compdel="${c.id}" aria-label="Borrar">×</button></div>`).join('')}</details>` : ''}
    </section>
    ${D.prendas.length ? (f.length ? `<section class="card"><h2>Lo que te falta para un buen fondo de armario</h2><p class="sub">Comparado con lo que ya tienes${(D.perfil.estilo || []).length ? ' y tu estilo' : ''}.</p>${f.map((b, i) => `<div class="falta"><b>${esc(b.n)}</b><small>${esc(b.por)}</small><div class="row"><span class="tag">Tienes ${b.tengo} de ${b.min}</span><button class="pill sm" data-falta="${i}">Añadir a la lista</button></div></div>`).join('')}</section>` : '<section class="card etiqueta"><p>Tienes un fondo de armario completo. Ahora compra solo lo que combine con al menos tres cosas que ya tienes (usa «¿Lo compro?»).</p></section>')
      : '<section class="card etiqueta"><p>Cuando añadas tu ropa, aquí te diré qué te falta.</p></section>'}`;
}

function vYo() {
  const p = D.perfil, cs = consejos(p), pr = productos(p), pal = paleta(p);
  const relleno = Object.keys(p).filter(k => k !== '_f' && p[k] != null).length;
  const cuando = k => CAMBIANTES.includes(k) && p._f && p._f[k] ? ` <small class="cuando">desde ${new Date(p._f[k]).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</small>` : '';
  const campo = c => c.op ? `<div class="campo"><span>${esc(c.t)}${cuando(c.k)}</span>${c.ayuda ? `<small>${esc(c.ayuda)}</small>` : ''}<div class="chips">${c.op.map(o => { const on = c.multi ? (p[c.k] || []).includes(o) : p[c.k] === o; return `<button class="pill sm ${on ? 'on' : ''}" data-pf="${c.k}" data-v="${esc(o)}">${esc(o)}</button>`; }).join('')}</div></div>`
    : `<label class="campo"><span>${esc(c.t)}${cuando(c.k)}</span><input data-pfin="${c.k}" type="${c.tipo === 'num' ? 'number' : 'text'}" inputmode="${c.tipo === 'num' ? 'numeric' : 'text'}" value="${esc(p[c.k] || '')}" ${c.u ? `placeholder="${c.u}"` : ''} autocomplete="off"></label>`;
  const viejos = CAMBIANTES.filter(k => p[k] && p._f && p._f[k] && Date.now() - Date.parse(p._f[k]) > 90 * 864e5);
  const pegar = `<textarea id="pegar" rows="3" placeholder="ESTILO1 {…} o ESTILO2 {…}"></textarea><div class="row"><button class="pill on" data-act="pegar">Aplicar</button></div>`;
  return `${heroHTML('Para mí', `${relleno} de ${PERFIL_CAMPOS.length} datos · todo se adapta a ti`)}
    ${relleno < 6 ? `<section class="card aviso"><h2>Pegar datos de Claude</h2><p class="sub">Si Claude te ha dado un bloque (ESTILO1 para tus datos, ESTILO2 para tu ropa), pégalo aquí.</p>${pegar}</section>` : ''}
    ${viejos.length ? `<section class="card aviso"><h2>¿Sigue todo igual?</h2><p class="sub">Hace más de tres meses que pusiste: ${viejos.map(k => PERFIL_CAMPOS.find(c => c.k === k).t.toLowerCase()).join(', ')}. Si ha cambiado, actualízalo y los consejos se ajustan.</p><button class="pill" data-act="sigueigual">Sigue igual</button></section>` : ''}
    ${pal ? `<section class="card"><h2>Tu paleta</h2><p class="mini">Te favorecen</p><div class="paleta">${pal.si.map(c => `<span><i style="background:${HEX[c]}"></i>${c}</span>`).join('')}</div>${pal.no.length ? `<p class="mini">Mejor lejos de la cara</p><div class="paleta no">${pal.no.map(c => `<span><i style="background:${HEX[c]}"></i>${c}</span>`).join('')}</div>` : ''}</section>` : ''}
    ${cs.length ? `<p class="sec">Tus consejos</p>${cs.map(([t, l]) => `<details class="card blq"><summary>${esc(t)}</summary><ul>${l.map(x => `<li>${esc(x)}</li>`).join('')}</ul></details>`).join('')}
      <details class="card blq"><summary>Productos para ti</summary><ul>${pr.map(([t, x]) => `<li><b>${esc(t)}:</b> ${esc(x)}</li>`).join('')}</ul><p class="mini-t">Son ejemplos fáciles de encontrar en farmacias y droguerías. No hace falta comprarlo todo de golpe: empieza por el protector solar.</p></details>`
      : '<section class="card etiqueta"><p>Rellena al menos tono de piel, complexión y forma de cara para ver tus consejos y tu paleta.</p></section>'}
    <p class="sec">Guías</p>
    <div class="guias">${GUIAS.map(g => `<button class="guia" data-guia="${g.id}"><span>${g.i}</span><b>${esc(g.t)}</b></button>`).join('')}</div>
    <p class="sec">Tus datos y ajustes</p>
    <details class="card blq" ${ui.datos ? 'open' : ''}><summary>Mis datos</summary>${relleno >= 6 ? `<div class="campo"><span>Pegar datos de Claude</span>${pegar}</div>` : ''}${PERFIL_CAMPOS.map(campo).join('')}</details>
    ${syncHTML()}
    ${iaHTML()}
    <details class="card blq"><summary>Copia de seguridad</summary><p class="sub" style="margin-top:10px">Un archivo con todo (también las fotos) por si cambias de dispositivo o quieres guardarlo aparte.</p>
      <div class="row"><button class="pill" data-act="exportar">Descargar copia</button><label class="pill">Restaurar copia<input type="file" accept="application/json,.json" id="imp" hidden></label></div></details>
    <p class="pie">Estilo · versión ${VERSION} · tus datos se quedan en tus dispositivos${ES.status().on ? ' y cifrados en tu GitHub' : ''}.</p>`;
}

function hace(t) { if (!t) return 'nunca'; const s = (Date.now() - t) / 1000; return s < 60 ? 'hace un momento' : s < 3600 ? `hace ${Math.round(s / 60)} min` : s < 86400 ? `hace ${Math.round(s / 3600)} h` : new Date(t).toLocaleDateString('es-ES'); }
function syncHTML() {
  const st = ES.status(), otra = ES.fromOtra();
  return `<details class="card blq" id="syncbox" ${ui.syncOpen ? 'open' : ''}><summary>Verlo en el móvil y en el PC ${st.on ? `<span class="tag ${st.msg ? 'mal' : 'bien'}">${st.msg ? 'Error' : 'Activada'}</span>` : ''}</summary>
    ${st.on ? `<p class="sub" style="margin-top:10px">${st.busy ? 'Sincronizando…' : st.msg ? '⚠️ ' + esc(st.msg) : 'Sincronizado ' + hace(st.last) + '.'} Lo que cambies aquí aparece en tus otros dispositivos, y al revés. Las fotos viajan en versión reducida.</p>
        <div class="row"><button class="pill on" data-act="syncya">Sincronizar ahora</button><button class="pill" data-act="synccode">Copiar código para otro dispositivo</button><button class="pill" data-act="syncoff">Desconectar</button></div>`
      : `<p class="sub" style="margin-top:10px">Para tener tu armario en el móvil, el PC o donde quieras. Se guarda cifrado en tu GitHub, como Mi Espacio y Cimientos: GitHub solo ve un bloque ilegible.</p>
        ${otra ? '<div class="row"><button class="pill on" data-act="syncotra">Usar la misma conexión que Mi Espacio</button></div><p class="mini">O pega el código</p>' : ''}
        <label class="campo"><span>Código de vinculación (empieza por MD1.)</span><input id="synccode" autocomplete="off" placeholder="MD1.…"></label>
        <div class="row"><button class="pill ${otra ? '' : 'on'}" data-act="synclink">Vincular</button></div>
        <p class="mini-t">El código lo tienes en Mi Espacio (Más → Sincronizar y copias) o en Cimientos.</p>`}
  </details>`;
}
function iaHTML() {
  const c = iaCfg();
  return `<details class="card blq" ${ui.iaOpen ? 'open' : ''}><summary>Rellenar prendas con IA ${c.key ? `<span class="tag ${c.on ? 'bien' : ''}">${c.on ? 'Activada' : 'Apagada'}</span>` : ''}</summary>
    <p class="sub" style="margin-top:10px">Sin IA, la app ya detecta el color sola. Con IA, al hacer la foto se rellenan también el tipo, un nombre, la temporada y un consejo para combinarla.</p>
    <ul><li>Usa la API de Anthropic (Claude), que es de pago por uso y va aparte de la suscripción a Claude. La clave se crea en console.anthropic.com.</li><li>Tu clave se guarda solo en este dispositivo y no va en la copia de seguridad ni en la sincronización.</li><li>Cada foto se envía a Anthropic para analizarla.</li></ul>
    ${c.key ? `<p class="mini">Clave guardada (acaba en ${esc(c.key.slice(-4))})</p><div class="row"><button class="pill ${c.on ? 'on' : ''}" data-act="iaon">${c.on ? 'IA activada' : 'IA desactivada'}</button><button class="pill" data-act="iaborrar">Borrar clave</button></div>`
      : `<label class="campo"><span>Tu clave de la API</span><input id="iakey" type="password" autocomplete="off" placeholder="sk-ant-…"></label><div class="row"><button class="pill on" data-act="iaguardar">Guardar y activar</button></div>`}
  </details>`;
}

const VISTAS = { hoy: vHoy, armario: vArmario, conjuntos: vOutfits, compras: vCompras, yo: vYo };
function render() {
  const foco = document.activeElement && document.activeElement.id === 'buscar' ? document.activeElement.selectionStart : null;
  $('app').innerHTML = VISTAS[ui.tab]();
  document.querySelectorAll('#tabnav button').forEach(b => { const on = b.dataset.tab === ui.tab; b.classList.toggle('active', on); b.setAttribute('aria-current', on ? 'page' : 'false'); });
  if (foco != null && $('buscar')) { $('buscar').focus(); $('buscar').setSelectionRange(foco, foco); }
}
function ir(t) { ui.tab = t; render(); window.scrollTo(0, 0); }

// ---------- ficha de una prenda ----------
function combinaCon(p) {
  const partes = Object.entries(PARTE).filter(([, cats]) => !cats.includes(p.cat)).flatMap(([, c]) => c);
  return D.prendas.filter(x => x.id !== p.id && partes.includes(x.cat) && combinan(p.color, x.color) === 2 && disponible(x)).sort((a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0) || usos(b) - usos(a)).slice(0, 8);
}
const esAbajo = cat => PARTE.abajo.includes(cat);
const caractHTML = p => {
  const l = [['Corte', p.corte]].concat(CARACT.map(([k, t]) => [t, p[k]])).filter(([, v]) => v);
  return l.length ? `<section class="carac"><p class="mini" style="margin-top:0">Características</p><dl>${l.map(([t, v]) => `<div><dt>${esc(t)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>` : '';
};
function openFicha(id) {
  const v = sheet('');
  const paint = () => {
    const p = prenda(id); if (!p) return v.close();
    const u = usos(p), ul = ultimo(p), cc = combinaCon(p), enConj = D.conjuntos.filter(c => c.prendas.includes(p.id));
    v.querySelector('.sheet').innerHTML = `<div class="grab"></div>
      <div class="ficha-foto">${thumb(p)}<button class="favbtn ${p.fav ? 'on' : ''}" data-ffav aria-label="${p.fav ? 'Quitar de favoritas' : 'Marcar como favorita'}">${p.fav ? '♥' : '♡'}</button></div>
      <h2 class="ficha-t">${esc(nombre(p))}</h2>
      <div class="chips tight"><span class="tag">${esc(p.cat)}</span>${p.color ? `<span class="tag">${swatch(p.color)}${esc(p.color)}</span>` : ''}<span class="tag">${esc(p.temp || 'Todo el año')}</span>${p.talla ? `<span class="tag etiq">Talla ${esc(p.talla)}</span>` : ''}${p.tienda ? `<span class="tag">${esc(p.tienda)}</span>` : ''}${p.formalidad ? `<span class="tag">${esc(p.formalidad)}</span>` : ''}</div>
      <div class="stats sm"><div><b>${u}</b><small>${u === 1 ? 'vez' : 'veces'}</small></div><div><b>${ul ? haceDias(ul) : '—'}</b><small>última vez</small></div><div><b>${+p.precio ? eur(+p.precio / Math.max(1, u)) : '—'}</b><small>por puesta</small></div></div>
      ${p.veredicto || p.consejo ? `<section class="opinion"><p class="mini" style="margin-top:0">Mi opinión</p>${p.veredicto ? `<p class="veredicto-t ${(VER[p.veredicto] || [])[1] || ''}">${(VER[p.veredicto] || [])[2] || ''} ${esc(p.veredicto)}</p>` : ''}${p.consejo ? `<p>${esc(p.consejo)}</p>` : ''}${p.ocasiones ? `<p class="mini-t"><b>Cuándo:</b> ${esc(p.ocasiones)}</p>` : ''}${p.combinar ? `<p class="mini-t"><b>Con qué:</b> ${esc(p.combinar)}</p>` : ''}</section>` : ''}
      ${caractHTML(p)}
      ${p.notas ? `<p class="nota-p">${esc(p.notas)}</p>` : ''}
      <p class="mini">Qué hacer con ella</p><div class="chips tight">${VEREDICTOS.map(([v, c, i]) => `<button class="pill sm ${p.veredicto === v ? 'on' : ''}" data-fver="${esc(v)}">${i} ${esc(v)}</button>`).join('')}</div>
      <p class="mini">Estado</p><div class="chips tight">${['', 'Para lavar', 'Para arreglar', 'Para donar'].map(e => `<button class="pill sm ${(p.estado || '') === e ? 'on' : ''}" data-festado="${e}">${e || 'Lista para ponerse'}</button>`).join('')}</div>
      ${cc.length ? `<p class="mini">Combina con</p><div class="look xs">${cc.map(x => `<button class="lk" data-fotra="${x.id}" title="${esc(nombre(x))}">${thumb(x)}</button>`).join('')}</div>` : ''}
      ${enConj.length ? `<p class="mini-t">Está en ${enConj.length} ${enConj.length === 1 ? 'conjunto' : 'conjuntos'}: ${enConj.map(c => esc(c.nombre)).join(', ')}.</p>` : ''}
      <div class="acts"><button class="pill" data-fdup>Duplicar</button><button class="pill" data-fedit>Editar</button><span class="sp"></span><button class="btn" data-fhoy>Me la pongo</button></div>`;
  };
  paint();
  v.addEventListener('click', e => {
    const p = prenda(id); if (!p) return;
    if (e.target.closest('[data-ffav]')) { p.fav = !p.fav; save(); paint(); return render(); }
    const fv = e.target.closest('[data-fver]'); if (fv) { p.veredicto = p.veredicto === fv.dataset.fver ? undefined : fv.dataset.fver; save(); paint(); return render(); }
    const es = e.target.closest('[data-festado]'); if (es) { p.estado = es.dataset.festado || undefined; save(); ui.looks = []; paint(); return render(); }
    const o = e.target.closest('[data-fotra]'); if (o) { v.close(); return openFicha(o.dataset.fotra); }
    if (e.target.closest('[data-fedit]')) { v.close(); return openPrenda(id); }
    if (e.target.closest('[data-fdup]')) { const c = Object.assign({}, p, { id: uid('p'), fecha: new Date().toISOString(), usos0: 0, fv: undefined, nombre: nombre(p) + ' (2)' }); D.prendas.push(c); save(); v.close(); render(); toast('Duplicada sin foto. Ponle la suya.'); return openPrenda(c.id); }
    if (e.target.closest('[data-fhoy]')) { const h = deHoy(); v.close(); return ponerHoy((h ? h.prendas : []).filter(x => prenda(x) && prenda(x).cat !== p.cat).concat(p.id)); }
  });
}

// ---------- formularios ----------
function openPrenda(id, pre) {
  const p = id ? Object.assign({}, prenda(id)) : Object.assign({ cat: '', color: '', temp: 'Todo el año' }, pre || {});
  let foto = id ? FOTOS[id] : null, cat = p.cat, color = p.color, temp = p.temp || 'Todo el año', formalidad = p.formalidad || '';
  const v = sheet('');
  const keep = () => { for (const k of ['nombre', 'notas', 'talla', 'precio', 'tienda'].concat(CARACT.map(c => c[0]))) { const i = v.querySelector('#p_' + k); if (i) p[k] = i.value; } };
  const paint = () => {
    v.querySelector('.sheet').innerHTML = `<div class="grab"></div><h2>${id ? 'Editar prenda' : 'Nueva prenda'}</h2>
      <label class="foto">${foto ? `<img src="${foto}" alt="">` : '<span>📷 Hacer foto o elegir de la galería</span>'}<input type="file" accept="image/*" id="pf" hidden></label>
      ${foto ? '<p class="mini-t">Toca la foto para cambiarla.</p>' : ''}
      <div class="campo"><span>Tipo</span><div class="chips tight">${CATS.map(c => `<button class="pill sm ${cat === c ? 'on' : ''}" data-pc="${c}">${c}</button>`).join('')}</div></div>
      <div class="campo"><span>Color principal</span><div class="chips tight">${COLORES.map(c => `<button class="pill sm ${color === c ? 'on' : ''}" data-pcol="${c}">${swatch(c)}${c}</button>`).join('')}</div></div>
      <div class="campo"><span>Cuándo</span><div class="chips tight">${TEMPS.map(c => `<button class="pill sm ${temp === c ? 'on' : ''}" data-pt="${c}">${c}</button>`).join('')}</div></div>
      ${cat === 'Pantalones' || cat === 'Vaqueros' ? `<div class="campo"><span>Corte</span><div class="chips tight">${CORTES.map(c => `<button class="pill sm ${p.corte === c ? 'on' : ''}" data-pcorte="${c}">${c}</button>`).join('')}</div></div>` : ''}
      <label class="campo"><span>Nombre (opcional)</span><input id="p_nombre" value="${esc(p.nombre || '')}" placeholder="Camiseta blanca de Uniqlo" autocomplete="off"></label>
      <div class="dos"><label class="campo"><span>Talla</span><input id="p_talla" value="${esc(p.talla || '')}" placeholder="M, 42…" autocomplete="off"></label><label class="campo"><span>Precio (€)</span><input id="p_precio" type="number" inputmode="decimal" value="${esc(p.precio || '')}" autocomplete="off"></label></div>
      <label class="campo"><span>Tienda</span><input id="p_tienda" value="${esc(p.tienda || '')}" placeholder="Uniqlo" autocomplete="off"></label>
      <details class="sub-det" ${CARACT.some(c => p[c[0]]) ? 'open' : ''}><summary>Características (tejido, cintura, largo, cómo te queda…)</summary><div class="campo"><span>Cuándo se lleva</span><div class="chips tight">${FORMALIDAD.map(f => `<button class="pill sm ${formalidad === f ? 'on' : ''}" data-pform="${f}">${f}</button>`).join('')}</div></div>${CARACT.filter(c => !c[4] || esAbajo(cat)).map(([k, t, ej, max]) => `<label class="campo"><span>${t}</span><input id="p_${k}" maxlength="${max}" value="${esc(p[k] || '')}" placeholder="${esc(ej)}" autocomplete="off"></label>`).join('')}</details>
      <label class="campo"><span>Notas (cómo te queda, con qué la llevas…)</span><input id="p_notas" value="${esc(p.notas || '')}" autocomplete="off"></label>
      <div class="acts">${id ? '<button class="btn ghost" data-pdel>Borrar</button>' : '<button class="btn ghost" data-close>Cancelar</button>'}<span class="sp"></span><button class="btn" data-pok>Guardar</button></div>`;
  };
  paint();
  v.addEventListener('change', async e => {
    if (e.target.id !== 'pf' || !e.target.files[0]) return;
    keep();
    try { foto = await comprimir(e.target.files[0]); } catch (er) { return toast('No se ha podido leer la foto.'); }
    if (!color) { color = await colorDominante(foto); if (color) toast(`Color detectado: ${color.toLowerCase()}. Cámbialo si no es.`); }
    paint();
    if (!iaActiva()) return;
    const st = v.querySelector('.foto'); st.classList.add('ia'); st.insertAdjacentHTML('beforeend', '<span class="iatag">Analizando con IA…</span>');
    try {
      const a = await analizarIA(foto);
      if (!v.isConnected) return;
      keep(); p.nombre = a.nombre || p.nombre; if (CATS.includes(a.cat)) cat = a.cat; if (COLORES.includes(a.color)) color = a.color; if (TEMPS.includes(a.temp)) temp = a.temp;
      if (a.consejo && !p.notas) p.notas = a.consejo;
      paint(); toast('Rellenado con IA. Revisa y guarda.');
    } catch (er) { if (v.isConnected) { paint(); toast(er.message || 'No se ha podido analizar.'); } }
  });
  v.addEventListener('click', async e => {
    const pfo = e.target.closest('[data-pform]'); if (pfo) { keep(); formalidad = formalidad === pfo.dataset.pform ? '' : pfo.dataset.pform; return paint(); }
    const pco = e.target.closest('[data-pcorte]'); if (pco) { keep(); p.corte = p.corte === pco.dataset.pcorte ? '' : pco.dataset.pcorte; return paint(); }
    const b = e.target.closest('[data-pc],[data-pcol],[data-pt]');
    if (b) { keep(); if (b.dataset.pc) cat = b.dataset.pc; if (b.dataset.pcol) color = b.dataset.pcol; if (b.dataset.pt) temp = b.dataset.pt; return paint(); }
    if (e.target.closest('[data-pdel]')) {
      if (!confirm('¿Borrar esta prenda? También sale de los conjuntos.')) return;
      D.prendas = D.prendas.filter(x => x.id !== id); D.conjuntos.forEach(c => { c.prendas = c.prendas.filter(x => x !== id); }); D.conjuntos = D.conjuntos.filter(c => c.prendas.length > 1);
      save(); fotoDel(id).catch(() => {}); v.close(); ui.looks = []; ui.lock = ui.lock.filter(x => x !== id); render(); return;
    }
    if (!e.target.closest('[data-pok]')) return;
    if (!cat) return toast('Elige el tipo de prenda.');
    keep();
    const orig = id ? prenda(id) : {};
    const o = Object.assign({}, orig, { id: id || uid('p'), nombre: (p.nombre || '').trim(), cat, color, temp, corte: (cat === 'Pantalones' || cat === 'Vaqueros') ? p.corte || '' : '', notas: (p.notas || '').trim(), talla: (p.talla || '').trim(), precio: p.precio ? String(+p.precio) : '', tienda: (p.tienda || '').trim(), ...Object.fromEntries(CARACT.map(([k]) => [k, (p[k] || '').trim()])), formalidad,  fecha: orig.fecha || new Date().toISOString() });
    if (foto && foto !== FOTOS[o.id]) { try { await fotoPut(o.id, foto); o.fv = Date.now(); ES.fotoLocal(o.id, o.fv); } catch (er) { toast('No se ha podido guardar la foto: puede que el dispositivo esté sin espacio.'); } }
    D.prendas = id ? D.prendas.map(x => x.id === id ? o : x) : D.prendas.concat(o); save(); v.close(); ui.looks = []; render();
    if (id) toast('Guardada'); else toast('Añadida al armario', ['Añadir otra', () => openPrenda()]);
  });
}

function openConjunto(pre, editId) {
  if (D.prendas.length < 2) return toast('Añade antes algunas prendas al armario.');
  const c0 = editId ? D.conjuntos.find(c => c.id === editId) : null;
  let sel = c0 ? c0.prendas.slice() : pre ? pre.slice() : [], oc = c0 ? c0.ocasion : ui.ocasion || 'Diario', cat = '';
  const v = sheet('');
  const paint = () => {
    const g = k => v.querySelector(k) ? v.querySelector(k).value : null;
    const nom = g('#cn') ?? (c0 ? c0.nombre : ''), not = g('#cno') ?? (c0 ? c0.nota || '' : '');
    const ps = sel.map(prenda).filter(Boolean), nota = ps.length > 1 ? notaConjunto(ps) : null;
    const cats = CATS.filter(c => D.prendas.some(p => p.cat === c));
    v.querySelector('.sheet').innerHTML = `<div class="grab"></div><h2>${c0 ? 'Editar conjunto' : 'Nuevo conjunto'}</h2><p class="sub">Toca las prendas que lo forman.</p>
      ${ps.length ? `<div class="look xs">${ps.map(x => `<button class="lk" data-sel="${x.id}">${thumb(x)}</button>`).join('')}</div>${nota ? `<p class="nota n${nota.n}">${esc(nota.t)}</p>` : ''}` : ''}
      <div class="chips scroll"><button class="pill sm ${!cat ? 'on' : ''}" data-ccat="">Todo</button>${cats.map(c => `<button class="pill sm ${cat === c ? 'on' : ''}" data-ccat="${c}">${c}</button>`).join('')}</div>
      <div class="grid pick">${D.prendas.filter(p => !cat || p.cat === cat).map(p => `<button class="prenda ${sel.includes(p.id) ? 'sel' : ''}" data-sel="${p.id}">${thumb(p)}<span class="pn"><b>${esc(nombre(p))}</b></span></button>`).join('')}</div>
      <label class="campo"><span>Nombre</span><input id="cn" value="${esc(nom)}" placeholder="Cita tranquila" autocomplete="off"></label>
      <div class="campo"><span>Para</span><div class="chips tight">${OCASIONES.map(o => `<button class="pill sm ${oc === o ? 'on' : ''}" data-oc2="${o}">${o}</button>`).join('')}</div></div>
      <label class="campo"><span>Nota (opcional)</span><input id="cno" value="${esc(not)}" placeholder="Con la colonia nueva" autocomplete="off"></label>
      <div class="acts">${c0 ? '<button class="btn ghost" data-cdel>Borrar</button>' : '<button class="btn ghost" data-close>Cancelar</button>'}<span class="sp"></span><button class="btn" data-cok>Guardar (${sel.length})</button></div>`;
  };
  paint();
  v.addEventListener('click', e => {
    const s = e.target.closest('[data-sel]'); if (s) { const i = s.dataset.sel; sel = sel.includes(i) ? sel.filter(x => x !== i) : sel.concat(i); return paint(); }
    const o = e.target.closest('[data-oc2]'); if (o) { oc = o.dataset.oc2; return paint(); }
    const cc = e.target.closest('[data-ccat]'); if (cc) { cat = cc.dataset.ccat; return paint(); }
    if (e.target.closest('[data-cdel]')) { if (!confirm('¿Borrar este conjunto? Las prendas no se borran.')) return; D.conjuntos = D.conjuntos.filter(c => c !== c0); save(); v.close(); return render(); }
    if (!e.target.closest('[data-cok]')) return;
    if (sel.length < 2) return toast('Elige al menos dos prendas.');
    const datos = { nombre: v.querySelector('#cn').value.trim() || oc, prendas: sel, ocasion: oc, nota: v.querySelector('#cno').value.trim() };
    if (c0) Object.assign(c0, datos); else D.conjuntos.push(Object.assign({ id: uid('c'), fecha: new Date().toISOString() }, datos));
    save(); v.close(); if (c0) render(); else { ir('conjuntos'); } toast(c0 ? 'Conjunto guardado' : 'Conjunto guardado en Conjuntos');
  });
}

function openCompra(pre) {
  let prio = 2, cat = pre && pre.cat || '';
  const v = sheet('');
  const paint = () => {
    const g = (k, d) => v.querySelector(k) ? v.querySelector(k).value : d;
    const que = g('#cq', pre && pre.n || ''), pr = g('#cp', pre && pre.precio || ''), dn = g('#cd', ''), ln = g('#cl', '');
    v.querySelector('.sheet').innerHTML = `<div class="grab"></div><h2>Añadir a la lista</h2>
      <label class="campo"><span>Qué</span><input id="cq" value="${esc(que)}" placeholder="Vaqueros azul oscuro rectos" autocomplete="off"></label>
      <div class="campo"><span>Tipo (para añadirlo al armario cuando lo compres)</span><div class="chips tight">${CATS.map(c => `<button class="pill sm ${cat === c ? 'on' : ''}" data-ccat="${c}">${c}</button>`).join('')}</div></div>
      <div class="campo"><span>Prioridad</span><div class="chips tight">${['Urgente', 'Pronto', 'Cuando pueda'].map((x, i) => `<button class="pill sm ${prio === i + 1 ? 'on' : ''}" data-prio="${i + 1}">${x}</button>`).join('')}</div></div>
      <div class="dos"><label class="campo"><span>Precio aprox. (€)</span><input id="cp" type="number" inputmode="decimal" value="${esc(pr)}" autocomplete="off"></label><label class="campo"><span>Dónde</span><input id="cd" value="${esc(dn)}" placeholder="Uniqlo" autocomplete="off"></label></div>
      <label class="campo"><span>Enlace (opcional)</span><input id="cl" type="url" value="${esc(ln)}" placeholder="https://…" autocomplete="off"></label>
      <div class="acts"><button class="btn ghost" data-close>Cancelar</button><span class="sp"></span><button class="btn" data-cmok>Añadir</button></div>`;
  };
  paint();
  v.addEventListener('click', e => {
    const p = e.target.closest('[data-prio]'); if (p) { prio = +p.dataset.prio; return paint(); }
    const c = e.target.closest('[data-ccat]'); if (c) { cat = cat === c.dataset.ccat ? '' : c.dataset.ccat; return paint(); }
    if (!e.target.closest('[data-cmok]')) return;
    const que = v.querySelector('#cq').value.trim(); if (!que) return v.querySelector('#cq').focus();
    const link = v.querySelector('#cl').value.trim();
    D.compras.push(Object.assign({ id: uid('b'), que, cat, prio, precio: v.querySelector('#cp').value, donde: v.querySelector('#cd').value.trim(), link: /^https?:\/\//.test(link) ? link : '', hecho: false, fecha: new Date().toISOString() }, pre && pre.por ? { por: pre.por, claude: true } : {})); save(); v.close(); render();
  });
}

function openLoCompro() {
  let cat = '', color = '', foto = '', ia = null, cargando = false, err = '';
  const v = sheet('');
  const fotoHTML = () => {
    const g = k => v.querySelector(k) ? v.querySelector(k).value : '';
    const pr = g('#lc_precio'), nt = g('#lc_nota');
    let r = '';
    if (cargando) r = '<p class="mini-t">Mirando la prenda con tu perfil y tu armario… tarda unos segundos.</p>';
    else if (err) r = `<p class="mini-t">⚠️ ${esc(err)}</p>`;
    else if (ia) {
      const cls = ia.veredicto === VER_COMPRA[0] ? 'bien' : ia.veredicto === VER_COMPRA[1] ? 'medio' : 'mal';
      const mias = (ia.combinaCon || []).map(n => D.prendas.find(p => (p.nombre || '').toLowerCase() === String(n).toLowerCase())).filter(Boolean);
      const li = l => (l || []).filter(Boolean).map(x => `<li>${esc(x)}</li>`).join('');
      r = `<div class="veredicto ${cls}"><b>${esc(ia.veredicto)}</b></div><p><b>${esc(ia.que)}</b> · ${esc(ia.resumen)}</p>
        ${(ia.aFavor || []).length ? `<p class="mini">A favor</p><ul>${li(ia.aFavor)}</ul>` : ''}
        ${(ia.enContra || []).length ? `<p class="mini">En contra</p><ul>${li(ia.enContra)}</ul>` : ''}
        ${mias.length ? `<p class="mini">Combina con lo tuyo (${mias.length})</p><div class="look xs">${mias.slice(0, 10).map(x => `<span class="lk">${thumb(x)}</span>`).join('')}</div>` : ''}
        ${(ia.conjuntos || []).length ? `<p class="mini">Conjuntos</p><ul>${li(ia.conjuntos)}</ul>` : ''}
        ${ia.precio ? `<p class="mini-t"><b>Precio:</b> ${esc(ia.precio)}</p>` : ''}${ia.talla ? `<p class="mini-t"><b>Al probártelo:</b> ${esc(ia.talla)}</p>` : ''}${ia.alternativa ? `<p class="mini-t"><b>Mejor busca:</b> ${esc(ia.alternativa)}</p>` : ''}
        <div class="row"><button class="pill on" data-lciadd>Añadir a la lista</button><button class="pill" data-lcotra>Otra foto</button></div>`;
    }
    return `<section class="opinion"><p class="mini" style="margin-top:0">📷 Con una foto de la tienda o de internet</p>
      ${foto ? `<img class="lcfoto" src="${foto}" alt="">` : ''}
      ${!foto ? `<label class="btn full">Hacer foto o elegir captura<input type="file" accept="image/*" data-lcfile hidden></label>` : ''}
      ${foto && !ia && !cargando ? `<div class="dos"><label class="campo"><span>Precio (€, si lo sabes)</span><input id="lc_precio" type="number" inputmode="decimal" value="${esc(pr)}" autocomplete="off"></label><label class="campo"><span>Nota (opcional)</span><input id="lc_nota" value="${esc(nt)}" placeholder="Para el trabajo, en rebajas…" autocomplete="off"></label></div>
        <div class="row"><button class="pill on" data-lcia>${iaActiva() ? '¿Me lo recomiendas?' : 'Ver qué color es'}</button><button class="pill" data-lcotra>Quitar foto</button></div>
        ${iaActiva() ? '' : '<p class="mini-t">Para que te diga si te lo recomiendo con la foto, activa la IA en Para mí → «Rellenar prendas con IA». Sin ella solo detecto el color y tú eliges el tipo abajo.</p>'}` : ''}
      ${r}</section>`;
  };
  const paint = () => {
    let res = '';
    if (cat && color) {
      const partes = Object.entries(PARTE).filter(([, cats]) => !cats.includes(cat)).flatMap(([, c]) => c);
      const comb = D.prendas.filter(x => partes.includes(x.cat) && combinan(color, x.color) === 2), igual = D.prendas.filter(x => x.cat === cat && x.color === color), pal = paleta(D.perfil);
      const enPal = pal && pal.si.includes(color), fueraPal = pal && pal.no.includes(color) && PARTE.arriba.includes(cat);
      const puntos = (comb.length >= 3 ? 2 : comb.length ? 1 : 0) + (igual.length ? -1 : 1) + (enPal ? 1 : 0) - (fueraPal ? 2 : 0);
      const ver = puntos >= 3 ? ['Sí, adelante', 'bien'] : puntos >= 1 ? ['Puede valer', 'medio'] : ['Mejor no', 'mal'];
      res = `<div class="veredicto ${ver[1]}"><b>${ver[0]}</b></div><ul>
        <li>${comb.length ? `Combina con <b>${comb.length}</b> ${comb.length === 1 ? 'prenda' : 'prendas'} que ya tienes.` : 'No combina con nada de lo que tienes ahora: tendrías que comprar más cosas para ponértelo.'}</li>
        <li>${igual.length ? `Ya tienes ${igual.length} ${cat.toLowerCase()} de color ${color.toLowerCase()}. ¿Seguro que necesitas otra?` : 'No tienes nada igual: aporta algo nuevo.'}</li>
        ${pal ? `<li>${enPal ? 'Es de los colores que más te favorecen.' : fueraPal ? 'Es un color que te favorece poco cerca de la cara.' : 'Es un color neutro para ti: ni suma ni resta.'}</li>` : ''}
        <li>Regla de oro: si no se te ocurren tres conjuntos con lo que ya tienes, no lo compres.</li></ul>
        ${comb.length ? `<div class="look xs">${comb.slice(0, 8).map(x => `<span class="lk">${thumb(x)}</span>`).join('')}</div>` : ''}
        <div class="row"><button class="pill on" data-lcadd>Añadir a la lista</button></div>`;
    }
    v.querySelector('.sheet').innerHTML = `<div class="grab"></div><h2>¿Lo compro?</h2><p class="sub">Pásame una foto o dime qué es y te digo si encaja contigo y con tu armario.</p>
      ${fotoHTML()}
      <p class="mini">O a mano</p>
      <div class="campo"><span>Tipo</span><div class="chips tight">${CATS.map(c => `<button class="pill sm ${cat === c ? 'on' : ''}" data-lcat="${c}">${c}</button>`).join('')}</div></div>
      <div class="campo"><span>Color</span><div class="chips tight">${COLORES.map(c => `<button class="pill sm ${color === c ? 'on' : ''}" data-lcol="${c}">${swatch(c)}${c}</button>`).join('')}</div></div>
      ${res}
      <div class="acts"><button class="btn ghost" data-close>Cerrar</button></div>`;
  };
  paint();
  v.addEventListener('click', e => {
    const a = e.target.closest('[data-lcat]'); if (a) { cat = a.dataset.lcat; return paint(); }
    const b = e.target.closest('[data-lcol]'); if (b) { color = b.dataset.lcol; return paint(); }
    if (e.target.closest('[data-lcadd]')) { v.close(); openCompra({ n: `${catSing(cat)} ${adjColor(color, (SING[cat] || ['', 'm'])[1])}`, cat }); }
    if (e.target.closest('[data-lcotra]')) { foto = ''; ia = null; err = ''; return paint(); }
    if (e.target.closest('[data-lciadd]')) { const pr = precioIA; v.close(); return openCompra({ n: ia.que, cat: ia.cat, precio: pr, por: ia.resumen }); }
    if (e.target.closest('[data-lcia]')) {
      precioIA = v.querySelector('#lc_precio').value; const nota = v.querySelector('#lc_nota').value.trim();
      if (!iaActiva()) { colorDominante(foto).then(c => { if (c) color = c; paint(); toast(c ? `Parece ${c.toLowerCase()}. Elige el tipo abajo.` : 'No he sabido ver el color.'); }); return; }
      cargando = true; err = ''; paint();
      analizarCompra(foto, precioIA, nota).then(x => { ia = x; if (CATS.includes(x.cat)) cat = x.cat; if (COLORES.includes(x.color)) color = x.color; }).catch(er => { err = er.message || 'No se ha podido analizar.'; }).finally(() => { cargando = false; paint(); });
    }
  });
  let precioIA = '';
  v.addEventListener('change', async e => {
    if (!e.target.matches('[data-lcfile]')) return; const f = e.target.files[0]; if (!f) return;
    try { foto = await comprimir(f); ia = null; err = ''; paint(); } catch (er) { toast('No he podido abrir esa foto.'); }
  });
}

function openGuia(id) {
  const g = GUIAS.find(x => x.id === id);
  sheet(`<p class="eyebrow">${g.i} Guía</p><h2>${esc(g.t)}</h2><ul class="lista-guia">${g.l.map(x => `<li>${esc(x)}</li>`).join('')}</ul><div class="acts"><span class="sp"></span><button class="btn" data-close>Entendido</button></div>`);
}

function openRutina() {
  const r = D.rutinaPasos ? JSON.parse(JSON.stringify(D.rutinaPasos)) : rutina(D.perfil);
  const v = sheet('');
  const paint = () => {
    const bloque = (k, t) => `<p class="mini">${t}</p>${r[k].map((x, i) => `<div class="lrow"><span class="b">${esc(x)}</span><button class="x" data-rdel="${k}:${i}" aria-label="Quitar">×</button></div>`).join('')}<div class="dos"><input id="r_${k}" placeholder="Añadir paso…" autocomplete="off"><button class="pill" data-radd="${k}">Añadir</button></div>`;
    v.querySelector('.sheet').innerHTML = `<div class="grab"></div><h2>Tu rutina</h2><p class="sub">Pon los pasos que de verdad haces. Mejor tres que hagas siempre que diez que no.</p>${bloque('manana', 'Mañana')}${bloque('noche', 'Noche')}
      <div class="acts"><button class="btn ghost" data-rreset>Volver a la sugerida</button><span class="sp"></span><button class="btn" data-rok>Guardar</button></div>`;
  };
  paint();
  v.addEventListener('click', e => {
    const d = e.target.closest('[data-rdel]'); if (d) { const [k, i] = d.dataset.rdel.split(':'); r[k].splice(+i, 1); return paint(); }
    const a = e.target.closest('[data-radd]'); if (a) { const k = a.dataset.radd, t = v.querySelector('#r_' + k).value.trim(); if (t) { r[k].push(t); paint(); v.querySelector('#r_' + k).focus(); } return; }
    if (e.target.closest('[data-rreset]')) { D.rutinaPasos = null; save(); v.close(); return render(); }
    if (e.target.closest('[data-rok]')) { D.rutinaPasos = r; save(); v.close(); render(); }
  });
  v.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id && e.target.id.startsWith('r_')) { e.preventDefault(); v.querySelector(`[data-radd="${e.target.id.slice(2)}"]`).click(); } });
}

// Lo que se pega desde el chat. Si no se puede leer tal cual, se prueba arreglando lo que a veces cambia el móvil
// al copiar: comillas tipográficas “ ” en vez de rectas y espacios invisibles.
function leerBloque(tipo) {
  const raw = $('pegar').value.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\u00A0/g, ' ');
  const re = tipo === 'ESTILO1' ? /ESTILO1\s*(\{[\s\S]*\})/ : /ESTILO2\s*(\{[\s\S]*\})/;
  for (const t of [raw, raw.replace(/[\u201C\u201D\u201E\u2033]/g, '"')]) { const m = t.match(re); if (!m) continue; try { return JSON.parse(m[1]); } catch (e) {} }
  return null;
}
function marcaFecha(k) { if (!CAMBIANTES.includes(k)) return; D.perfil._f = Object.assign({}, D.perfil._f); if (D.perfil[k] == null) delete D.perfil._f[k]; else D.perfil._f[k] = new Date().toISOString(); }

// ---------- eventos ----------
document.getElementById('tabnav').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) ir(b.dataset.tab); });
$('app').addEventListener('input', e => { if (e.target.id === 'buscar') { ui.q = e.target.value; render(); } });
const clickApp = e => {
  const t = e.target;
  const go = t.closest('[data-go]'); if (go) return ir(go.dataset.go);
  const c = t.closest('[data-cat]'); if (c) { ui.cat = c.dataset.cat; return render(); }
  const or = t.closest('[data-orden]'); if (or) { ui.orden = or.dataset.orden; return render(); }
  const fi = t.closest('[data-filtro]'); if (fi) { ui.filtro = ui.filtro === fi.dataset.filtro ? '' : fi.dataset.filtro; return render(); }
  const fc = t.closest('[data-ficha]'); if (fc) return openFicha(fc.dataset.ficha);
  const lk = t.closest('[data-lock]'); if (lk) { const i = lk.dataset.lock, fija = !ui.lock.includes(i); ui.lock = fija ? ui.lock.concat(i) : ui.lock.filter(x => x !== i); if (fija) { const actual = ui.looks[ui.lookI]; ui.looks = generarLooks(); if (actual) ui.looks.unshift(actual); ui.lookI = 0; toast('Fijada. Pulsa «Otra idea» para cambiar el resto.'); } return render(); }
  const oc = t.closest('[data-oc]'); if (oc) { ui.ocasion = oc.dataset.oc; ui.lock = []; ui.looks = []; return render(); }
  const gu = t.closest('[data-guia]'); if (gu) return openGuia(gu.dataset.guia);
  const ru = t.closest('[data-rut]'); if (ru) { const k = hoyKey(), r = D.rutina[k] = D.rutina[k] || { m: [], n: [] }, l = r[ru.dataset.rut[0]], i = +ru.dataset.rut.slice(1); if (l.includes(i)) l.splice(l.indexOf(i), 1); else l.push(i); Object.keys(D.rutina).sort().slice(0, -30).forEach(x => delete D.rutina[x]); save(); return render(); }
  const dt = t.closest('[data-diat]'); if (dt) { ui.diaT = +dt.dataset.diat; return render(); }
  const sg = t.closest('[data-seg]'); if (sg) { ui.outSeg = sg.dataset.seg; return render(); }
  const io = t.closest('[data-ideaoc]'); if (io) { ui.ideaOc = io.dataset.ideaoc; return render(); }
  const od = t.closest('[data-ocdia]'); if (od) { const w = +od.dataset.ocdia, act = (D.semanaOc && D.semanaOc[w]) || SEMANA_OC[w], sig = OCASIONES_IDEAS[(OCASIONES_IDEAS.indexOf(act) + 1) % OCASIONES_IDEAS.length]; D.semanaOc = Object.assign({}, D.semanaOc, { [w]: sig }); save(); return render(); }
  const vo = t.closest('[data-verout]'); if (vo) { const x = outfitPorId(vo.dataset.verout); const v = sheet(outfitHTML(x).replace('<article class="card outfit', '<article class="outfit')); v.addEventListener('click', clickApp); return; }
  const op = t.closest('[data-oput]'); if (op) { const x = outfitPorId(op.dataset.oput); [...document.querySelectorAll('.veil')].forEach(v => v.close()); return ponerHoy(x.c.res.filter(r => r.p).map(r => r.p.id), x.o.oc); }
  const og = t.closest('[data-oguardar]'); if (og) { const x = outfitPorId(og.dataset.oguardar); [...document.querySelectorAll('.veil')].forEach(v => v.close()); return openConjunto(x.c.res.filter(r => r.p).map(r => r.p.id)); }
  const of = t.closest('[data-ofalta]'); if (of) {
    const x = outfitPorId(of.dataset.ofalta); let n = 0;
    for (const r of x.c.falta) { const cat = r.pz.cats[0], que = `${catSing(cat)} ${adjColor(r.pz.col[0], (SING[cat] || ['', 'm'])[1])}`.trim(); if (D.compras.some(c => !c.hecho && c.que === que)) continue; D.compras.push({ id: uid('b'), que, cat, prio: 2, precio: '', donde: '', link: '', hecho: false, fecha: new Date().toISOString(), nota: x.o.t }); n++; }
    save(); [...document.querySelectorAll('.veil')].forEach(v => v.close()); render(); return toast(n ? `${n} ${n === 1 ? 'cosa añadida' : 'cosas añadidas'} a Compras.` : 'Ya lo tenías en la lista.', n ? ['Ver', () => ir('compras')] : null);
  }
  const coc = t.closest('[data-conjoc]'); if (coc) { ui.conjOc = coc.dataset.conjoc; return render(); }
  const cp = t.closest('[data-conjpuesto]'); if (cp) { const cj = D.conjuntos.find(x => x.id === cp.dataset.conjpuesto); return ponerHoy(cj.prendas, cj.ocasion); }
  const cf = t.closest('[data-conjfav]'); if (cf) { const cj = D.conjuntos.find(x => x.id === cf.dataset.conjfav); cj.fav = !cj.fav; save(); return render(); }
  const ce = t.closest('[data-conjedit]'); if (ce) return openConjunto(null, ce.dataset.conjedit);
  const vf = t.closest('[data-vf]'); if (vf) { ui.vf = ui.vf === vf.dataset.vf ? '' : vf.dataset.vf; return render(); }
  const rc1 = t.closest('[data-reco]'); if (rc1) { const x = recoPantalones(D.prendas, D.compras).compra[+rc1.dataset.reco]; if (x) añadirReco(x); return; }
  const rc2 = t.closest('[data-reco2]'); if (rc2) { const x = recoPantalones(D.prendas, D.compras).compra.find(y => y.que === rc2.dataset.reco2); if (x) añadirReco(x); return; }
  const fa = t.closest('[data-falta]'); if (fa) { const b = faltan()[+fa.dataset.falta]; return openCompra({ n: b.n, cat: b.cat }); }
  const co = t.closest('[data-comp]'); if (co) {
    const x = D.compras.find(y => y.id === co.dataset.comp); x.hecho = !x.hecho; x.cuando = x.hecho ? new Date().toISOString() : undefined; save(); render();
    if (x.hecho) toast('Comprado.', ['Añadir al armario', () => openPrenda(null, { nombre: x.que, cat: x.cat || '', precio: x.precio || '', tienda: x.donde || '' })]);
    return;
  }
  const cdl = t.closest('[data-compdel]'); if (cdl) { const x = D.compras.find(y => y.id === cdl.dataset.compdel); D.compras = D.compras.filter(y => y !== x); save(); render(); return toast('Borrado.', ['Deshacer', () => { D.compras.push(x); save(); render(); }]); }
  const pf = t.closest('[data-pf]'); if (pf) { const k = pf.dataset.pf, v = pf.dataset.v, campo = PERFIL_CAMPOS.find(x => x.k === k); if (campo.multi) { const l = D.perfil[k] || []; D.perfil[k] = l.includes(v) ? l.filter(x => x !== v) : l.concat(v); } else D.perfil[k] = D.perfil[k] === v ? undefined : v; marcaFecha(k); save(); ui.datos = true; const y = window.scrollY; render(); window.scrollTo(0, y); return; }
  const a = t.closest('[data-act]'); if (!a) return;
  const act = a.dataset.act;
  if (act === 'nueva') return openPrenda();
  if (act === 'nuevoconj') return openConjunto();
  if (act === 'nuevacomp') return openCompra();
  if (act === 'locompro') return openLoCompro();
  if (act === 'rutinaedit') return openRutina();
  if (act === 'otro') { if (!ui.looks.length) return; ui.lookI = (ui.lookI + 1) % ui.looks.length; return render(); }
  if (act === 'puesto') { const l = ui.looks[ui.lookI]; if (l) { ponerHoy(l.ids, ui.ocasion); ui.lock = []; } return; }
  if (act === 'guardarlook') { const l = ui.looks[ui.lookI]; return l && openConjunto(l.ids); }
  if (act === 'quitarhoy') { const h = deHoy(); D.historial = D.historial.filter(x => x !== h); save(); render(); return toast('Quitado.', ['Deshacer', () => { D.historial.push(h); save(); render(); }]); }
  if (act === 'lavado') { const l = D.prendas.filter(p => p.estado === 'Para lavar'); l.forEach(p => { p.estado = undefined; }); save(); ui.looks = []; render(); return toast(`${l.length} ${l.length === 1 ? 'prenda lista' : 'prendas listas'} para ponerse.`); }
  if (act === 'exportar') return exportar();
  if (act === 'sigueigual') { D.perfil._f = Object.assign({}, D.perfil._f); CAMBIANTES.forEach(k => { if (D.perfil[k]) D.perfil._f[k] = new Date().toISOString(); }); save(); return render(); }
  if (act === 'pegar' && /ESTILO2/.test($('pegar').value)) {
    let o = leerBloque('ESTILO2');
    if (o && !o.prendas && Array.isArray(o.compras)) o.prendas = [];
    if (!o || !Array.isArray(o.prendas)) return toast('No lo reconozco. Copia el bloque entero, desde ESTILO2 hasta la última llave.');
    let n = 0, dup = 0, mal = 0;
    const txt = (v, m) => String(v || '').slice(0, m);
    for (const x of o.prendas) {
      if (!x || !CATS.includes(x.cat) || (x.color && !COLORES.includes(x.color))) { mal++; continue; }
      const nom = txt(x.nombre, 60), extra = { corte: CORTES.includes(x.corte) ? x.corte : '', veredicto: VER[x.veredicto] ? x.veredicto : undefined, consejo: txt(x.consejo, 500), ocasiones: txt(x.ocasiones, 200), combinar: txt(x.combinar, 200), ref: txt(x.ref, 30) };
      for (const [k, , , max] of CARACT) if (x[k]) extra[k] = txt(x[k], max);
      if (FORMALIDAD.includes(x.formalidad)) extra.formalidad = x.formalidad;
      const ya = D.prendas.find(p => p.cat === x.cat && (p.nombre || '') === nom);
      if (ya) {
        // Al actualizar también se ponen color, temporada, tienda y talla si vienen en el bloque.
        if (x.color) ya.color = x.color; if (TEMPS.includes(x.temp)) ya.temp = x.temp; if (x.tienda) ya.tienda = txt(x.tienda, 30); if (x.talla) ya.talla = txt(x.talla, 12);
        Object.assign(ya, extra); dup++; continue;
      }
      D.prendas.push(Object.assign({ id: uid('p'), nombre: nom, cat: x.cat, color: x.color || '', temp: TEMPS.includes(x.temp) ? x.temp : 'Todo el año', talla: txt(x.talla, 12), tienda: txt(x.tienda, 30), precio: '', notas: txt(x.notas, 120), fecha: new Date().toISOString(), usos0: 0 }, extra)); n++;
    }
    // Compras recomendadas: entran en tu lista con el porqué; si ya estaban (mismo nombre), se actualizan.
    let nc = 0, nu = 0;
    for (const x of (Array.isArray(o.compras) ? o.compras : [])) {
      if (!x || !x.que) continue;
      const datos = { que: txt(x.que, 80), cat: CATS.includes(x.cat) ? x.cat : '', prio: [1, 2, 3].includes(+x.prio) ? +x.prio : 2, precio: x.precio ? String(x.precio).slice(0, 12) : '', donde: txt(x.donde, 60), por: txt(x.por, 400), link: /^https?:\/\//.test(x.link || '') ? txt(x.link, 300) : '', claude: true };
      const ya = D.compras.find(c => c.que === datos.que);
      if (ya) { Object.assign(ya, datos); nu++; } else { D.compras.push(Object.assign({ id: uid('b'), hecho: false, fecha: new Date().toISOString() }, datos)); nc++; }
    }
    save(); ui.looks = []; render();
    const partes = [];
    if (n || dup || o.prendas.length) partes.push(`${n} ${n === 1 ? 'prenda añadida' : 'prendas añadidas'}${dup ? ` · ${dup} actualizadas` : ''}${mal ? ` · ${mal} no válidas` : ''}`);
    if (Array.isArray(o.compras)) partes.push(`${nc} ${nc === 1 ? 'compra recomendada' : 'compras recomendadas'} en tu lista${nu ? ` · ${nu} actualizadas` : ''}`);
    return toast(partes.join(' · ') + '.', Array.isArray(o.compras) ? ['Ver', () => ir('compras')] : null);
  }
  if (act === 'pegar') {
    const o = leerBloque('ESTILO1');
    if (!o) return toast('No lo reconozco. Copia el bloque entero, desde ESTILO1 hasta la última llave.');
    let n = 0;
    for (const c of PERFIL_CAMPOS) {
      if (!(c.k in o)) continue; const v = o[c.k];
      const ok = c.op ? (c.multi ? Array.isArray(v) && v.every(x => c.op.includes(x)) : c.op.includes(v)) : (c.tipo === 'num' ? +v > 0 : typeof v === 'string');
      if (ok) { D.perfil[c.k] = c.tipo === 'num' ? String(+v) : v; marcaFecha(c.k); n++; }
    }
    save(); ui.datos = true; render(); return toast(n ? `${n} ${n === 1 ? 'dato aplicado' : 'datos aplicados'}` : 'No había datos válidos en el bloque.');
  }
  if (act === 'syncya') { ui.syncOpen = true; return ES.sync(); }
  if (act === 'synccode') { try { navigator.clipboard.writeText(ES.code()); toast('Código copiado. Pégalo en Estilo en tu otro dispositivo.'); } catch (er) {} return; }
  if (act === 'syncoff') { if (!confirm('¿Desconectar la sincronización en este dispositivo? Tus datos se quedan aquí.')) return; ES.off(); ui.syncOpen = true; return render(); }
  if (act === 'syncotra' || act === 'synclink') {
    const o = act === 'syncotra' ? ES.fromOtra() : ES.parseCode($('synccode').value);
    if (!o) return toast('Ese código no es válido. Cópialo entero, empieza por MD1.');
    ui.syncOpen = true; a.disabled = true; a.textContent = 'Conectando…';
    ES.link(o).then(() => { render(); toast('Conectado. Tu armario ya se sincroniza.'); }).catch(er => { render(); toast(er.message); });
    return;
  }
  if (act === 'iaguardar') { const k = $('iakey').value.trim(); if (!/^sk-ant-/.test(k)) return toast('Eso no parece una clave de la API (empieza por sk-ant-).'); localStorage.setItem(IA_KEY, JSON.stringify({ key: k, on: true })); ui.iaOpen = true; render(); return toast('IA activada'); }
  if (act === 'iaon') { const c2 = iaCfg(); c2.on = !c2.on; localStorage.setItem(IA_KEY, JSON.stringify(c2)); ui.iaOpen = true; return render(); }
  if (act === 'iaborrar') { if (!confirm('¿Borrar tu clave de este dispositivo?')) return; localStorage.removeItem(IA_KEY); ui.iaOpen = true; return render(); }
};
$('app').addEventListener('click', clickApp);
$('app').addEventListener('change', e => {
  const i = e.target.closest('[data-pfin]'); if (i) { D.perfil[i.dataset.pfin] = i.value.trim() || undefined; marcaFecha(i.dataset.pfin); save(); if (CAMBIANTES.includes(i.dataset.pfin)) { const y = window.scrollY; ui.datos = true; render(); window.scrollTo(0, y); } return; }
  if (e.target.id === 'imp' && e.target.files[0]) importar(e.target.files[0]);
  if (e.target.id === 'multi' && e.target.files.length) { const fs = [...e.target.files]; e.target.value = ''; subirVarias(fs); }
});
$('app').addEventListener('toggle', e => { const d = e.target; if (d.id === 'syncbox') ui.syncOpen = d.open; }, true);

// ---------- varias fotos de golpe ----------
async function subirVarias(files) {
  const cola = []; toast(`Preparando ${files.length} ${files.length === 1 ? 'foto' : 'fotos'}…`);
  for (const f of files.slice(0, 40)) { try { const foto = await comprimir(f); cola.push({ foto, color: await colorDominante(foto) }); } catch (e) {} }
  if (!cola.length) return toast('No he podido leer las fotos.');
  if (iaActiva()) {
    for (let i = 0; i < cola.length; i++) { try { const a = await analizarIA(cola[i].foto); Object.assign(cola[i], { nombre: a.nombre, cat: CATS.includes(a.cat) ? a.cat : '', color: COLORES.includes(a.color) ? a.color : cola[i].color, temp: TEMPS.includes(a.temp) ? a.temp : 'Todo el año', notas: a.consejo }); } catch (e) { toast(e.message); break; } }
  }
  clasificar(cola);
}
function clasificar(cola) {
  let i = 0, n = 0; const v = sheet('');
  const sig = () => { i++; paint(); };
  const guardar = async x => {
    const o = { id: uid('p'), nombre: x.nombre || '', cat: x.cat, color: x.color || '', temp: x.temp || 'Todo el año', notas: x.notas || '', talla: '', precio: '', tienda: '', fecha: new Date().toISOString(), usos0: 0 };
    try { await fotoPut(o.id, x.foto); o.fv = Date.now(); ES.fotoLocal(o.id, o.fv); } catch (e) {}
    D.prendas.push(o); n++;
  };
  const paint = () => {
    if (i >= cola.length) { save(); ui.looks = []; v.close(); render(); return toast(`${n} ${n === 1 ? 'prenda añadida' : 'prendas añadidas'} al armario.`); }
    const x = cola[i];
    v.querySelector('.sheet').innerHTML = `<div class="grab"></div><p class="eyebrow">Foto ${i + 1} de ${cola.length}</p><h2>¿Qué prenda es?</h2>
      <div class="ficha-foto"><img src="${x.foto}" alt=""></div>
      ${x.nombre ? `<p class="nota n2" style="text-align:center">La IA dice: ${esc(x.nombre)}</p>` : ''}
      <p class="mini">Tipo</p><div class="chips tight">${CATS.map(c => `<button class="pill sm ${x.cat === c ? 'on' : ''}" data-cls="${c}">${c}</button>`).join('')}</div>
      <p class="mini">Color ${x.color ? `<span class="muted">(detectado)</span>` : ''}</p><div class="chips tight">${COLORES.map(c => `<button class="pill sm ${x.color === c ? 'on' : ''}" data-clscol="${c}">${swatch(c)}${c}</button>`).join('')}</div>
      <div class="acts"><button class="btn ghost" data-clsskip>Saltar esta</button><span class="sp"></span><button class="btn" data-clsok>${i + 1 === cola.length ? 'Terminar' : 'Siguiente'}</button></div>`;
  };
  paint();
  v.addEventListener('click', async e => {
    const x = cola[i]; if (!x) return;
    const c = e.target.closest('[data-cls]'); if (c) { x.cat = c.dataset.cls; return paint(); }
    const k = e.target.closest('[data-clscol]'); if (k) { x.color = k.dataset.clscol; return paint(); }
    if (e.target.closest('[data-clsskip]')) return sig();
    if (e.target.closest('[data-clsok]')) { if (!x.cat) return toast('Elige el tipo de prenda o pulsa «Saltar esta».'); await guardar(x); sig(); }
  });
}

// ---------- copia de seguridad ----------
function exportar() {
  const blob = new Blob([JSON.stringify({ app: 'estilo', v: 2, fecha: new Date().toISOString(), datos: D, fotos: FOTOS })], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `estilo-copia-${hoyKey()}.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
async function importar(f) {
  try {
    const j = JSON.parse(await f.text()); if (j.app !== 'estilo' || !j.datos) throw new Error('formato');
    if (!confirm('Esto sustituye lo que tienes ahora en la app por la copia. ¿Seguir?')) return;
    D = Object.assign({}, BASE, j.datos); D.prendas.forEach(p => { if (p.usos && !p.usos0) p.usos0 = p.usos; delete p.usos; });
    for (const [k, v] of Object.entries(j.fotos || {})) await fotoPut(k, v);
    const ahora = Date.now(); D.prendas.forEach(p => { if (FOTOS[p.id]) { p.fv = ahora; ES.fotoLocal(p.id, ahora); } }); save();
    ui.looks = []; render(); toast('Copia restaurada');
  } catch (e) { toast('Ese archivo no es una copia de Estilo.'); }
}

// ---------- arranque ----------
ES.init({
  get: () => D,
  set: d => { D = Object.assign({}, BASE, D, d); D.perfil = D.perfil || {}; D.rutina = D.rutina || {}; D.historial = D.historial || []; try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} },
  fotoGet: id => FOTOS[id], fotoPut, fotoDel: id => fotoDel(id).catch(() => {}), reducir
});
ES.onChange = s => {
  if (s === 'changed') { ui.looks = []; if (!document.querySelector('.veil')) render(); return; }
  if (ui.tab === 'yo' && !document.querySelector('.veil')) { const y = window.scrollY; render(); window.scrollTo(0, y); }
};
fotosCargar().then(() => {
  // Prendas con foto de antes de la sincronización: se les pone versión para que viajen.
  let cambia = false; const ahora = Date.now();
  D.prendas.forEach(p => { if (FOTOS[p.id] && !p.fv) { p.fv = ahora; ES.fotoLocal(p.id, ahora); cambia = true; } });
  if (cambia) save();
  render(); ES.sync();
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { ES.sync(); cargarTiempo(); } });
render();
cargarTiempo();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(() => {});
