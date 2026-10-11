/* Estilo: armario con fotos, conjuntos, compras y consejos según tu perfil. Todo se guarda en este móvil. */
'use strict';

const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const hoyKey = () => new Date().toISOString().slice(0, 10);
const KEY = 'estiloDatos';

let D = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } })();
D = Object.assign({ prendas: [], conjuntos: [], compras: [], perfil: {}, rutina: {} }, D);
if (D.perfil.gafas === 'Sí') D.perfil.gafas = 'Sí, siempre';
const save = () => {
  let old = null; try { old = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { return toast('No se ha podido guardar: el móvil no tiene espacio.'); }
  ES.touch(old, D);
};

const ui = { tab: 'hoy', cat: '', look: null, sel: [] };

// ---------- fotos en IndexedDB ----------
const FOTOS = {};
const idb = new Promise((ok, ko) => { const r = indexedDB.open('estilo', 1); r.onupgradeneeded = () => r.result.createObjectStore('fotos'); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
const fotoTx = (modo, fn) => idb.then(db => new Promise((ok, ko) => { const t = db.transaction('fotos', modo), s = t.objectStore('fotos'), r = fn(s); t.oncomplete = () => ok(r && r.result); t.onerror = () => ko(t.error); }));
const fotoPut = (id, url) => fotoTx('readwrite', s => s.put(url, id)).then(() => { FOTOS[id] = url; });
const fotoDel = id => fotoTx('readwrite', s => s.delete(id)).then(() => { delete FOTOS[id]; });
const fotosCargar = () => idb.then(db => new Promise(ok => { const t = db.transaction('fotos'), r = t.objectStore('fotos').openCursor(); r.onsuccess = () => { const c = r.result; if (c) { FOTOS[c.key] = c.value; c.continue(); } else ok(); }; r.onerror = () => ok(); })).catch(() => {});

function comprimir(file) {
  return new Promise((ok, ko) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const m = 900, k = Math.min(1, m / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', .8)); };
    img.onerror = () => { URL.revokeObjectURL(url); ko(new Error('foto')); };
    img.src = url;
  });
}

function reducir(url, m = 600) {
  return new Promise(ok => { const img = new Image(); img.onload = () => { const k = Math.min(1, m / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', .72)); }; img.onerror = () => ok(url); img.src = url; });
}

// ---------- color automático (gratis, en el móvil) ----------
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

// ---------- utilidades de interfaz ----------
function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); }
function sheet(html) {
  const v = document.createElement('div'); v.className = 'veil'; v.innerHTML = `<div class="sheet" role="dialog"><div class="grab"></div>${html}</div>`;
  document.body.appendChild(v); document.body.style.overflow = 'hidden';
  const close = () => { v.remove(); document.body.style.overflow = ''; };
  v.addEventListener('click', e => { if (e.target === v || e.target.closest('[data-close]')) close(); });
  v.close = close; return v;
}
const swatch = c => `<span class="sw" style="background:${HEX[c] || '#ccc'}"></span>`;
const thumb = p => FOTOS[p.id] ? `<img src="${FOTOS[p.id]}" alt="">` : `<span class="nofoto" style="background:${HEX[p.color] || '#ccc'}"><b>${esc((p.cat || '?')[0])}</b></span>`;
const prenda = id => D.prendas.find(p => p.id === id);

function temporada() { const m = new Date().getMonth() + 1; return m >= 6 && m <= 9 ? 'Calor' : (m >= 11 || m <= 3) ? 'Frío' : 'Entretiempo'; }
const valeHoy = (p, t) => p.temp === 'Todo el año' || !p.temp || (t === 'Entretiempo' ? true : p.temp === t);

function generarLook() {
  const t = temporada(), pool = cats => D.prendas.filter(p => cats.includes(p.cat) && valeHoy(p, t) && !(t === 'Frío' && p.cat === 'Pantalón corto'));
  const ar = pool(PARTE.arriba), ab = pool(PARTE.abajo), pi = pool(PARTE.pies), en = t === 'Calor' ? [] : pool(PARTE.encima);
  if (!ar.length || !ab.length) return null;
  const rnd = l => l[Math.floor(Math.random() * l.length)];
  let mejor = null;
  for (let i = 0; i < 40; i++) {
    const l = [rnd(ar), rnd(ab)]; if (pi.length) l.push(rnd(pi)); if (en.length && (t === 'Frío' || Math.random() < .5)) l.push(rnd(en));
    const fuertes = l.filter(p => !NEUTROS.includes(p.color)).length;
    if (fuertes <= 1) { mejor = l; break; } if (!mejor) mejor = l;
  }
  return mejor.map(p => p.id);
}

// ---------- vistas ----------
function vHoy() {
  const p = D.perfil, vacio = !Object.keys(p).length, t = temporada();
  if (ui.look && ui.look.some(id => !prenda(id))) ui.look = null;
  if (!ui.look) ui.look = generarLook();
  const r = rutina(p), hecho = D.rutina[hoyKey()] || { m: [], n: [] };
  const d = new Date(), tip = CONSEJOS_GENERALES[(d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate()) % CONSEJOS_GENERALES.length];
  const look = ui.look ? ui.look.map(prenda).filter(Boolean) : [];
  return `<section class="hero"><small>${d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} · ${t.toLowerCase()}</small><h1>¿Qué me pongo?</h1></section>
    ${vacio ? `<div class="card destaca"><h2>Empieza por «Para mí»</h2><p class="sub">Con dos minutos de datos sobre ti, los consejos dejan de ser generales.</p><button class="pill on" data-go="yo">Rellenar mi perfil</button></div>` : ''}
    <div class="card"><h2>Conjunto para hoy</h2>
      ${look.length ? `<div class="look">${look.map(x => `<div class="lk">${thumb(x)}<small>${esc(x.nombre || x.cat)}</small></div>`).join('')}</div>
        <div class="row"><button class="pill" data-act="otro">Otro</button><button class="pill" data-act="puesto">Me lo pongo</button><button class="pill" data-act="guardarlook">Guardar como conjunto</button></div>`
      : `<p class="sub">Cuando tengas en el armario al menos una prenda de arriba y una de abajo, te propongo conjuntos para el tiempo que hace.</p><button class="pill on" data-go="armario">Añadir mi ropa</button>`}
    </div>
    <div class="card"><h2>Rutina de hoy</h2>
      <p class="mini">Mañana</p>${r.manana.map((x, i) => `<button class="chk ${hecho.m.includes(i) ? 'ok' : ''}" data-rut="m${i}"><span></span>${esc(x)}</button>`).join('')}
      <p class="mini">Noche</p>${r.noche.map((x, i) => `<button class="chk ${hecho.n.includes(i) ? 'ok' : ''}" data-rut="n${i}"><span></span>${esc(x)}</button>`).join('')}
    </div>
    <div class="card tip"><small>Consejo del día</small><p>${esc(tip)}</p></div>`;
}

function vArmario() {
  const l = D.prendas.filter(p => !ui.cat || p.cat === ui.cat);
  const cats = CATS.filter(c => D.prendas.some(p => p.cat === c));
  const sinUso = D.prendas.filter(p => !p.usos).length;
  return `<section class="hero"><small>${D.prendas.length} prendas${D.prendas.length && sinUso ? ` · ${sinUso} sin estrenar en la app` : ''}</small><h1>Mi armario</h1></section>
    <button class="btn full" data-act="nueva">＋ Añadir prenda (con foto)</button>
    ${cats.length > 1 ? `<div class="chips"><button class="pill ${!ui.cat ? 'on' : ''}" data-cat="">Todo</button>${cats.map(c => `<button class="pill ${ui.cat === c ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
    ${l.length ? `<div class="grid">${l.map(p => `<button class="prenda" data-prenda="${p.id}">${thumb(p)}<span class="pn"><b>${esc(p.nombre || p.cat)}</b><small>${swatch(p.color)}${esc(p.color || '')}${p.usos ? ` · ${p.usos} ${p.usos === 1 ? 'vez' : 'veces'}` : ''}</small></span></button>`).join('')}</div>`
      : `<div class="vacio"><p>Haz una foto a cada prenda (en una percha o extendida en la cama, con buena luz). Empieza por lo que más te pones.</p></div>`}`;
}

function vConjuntos() {
  return `<section class="hero"><small>${D.conjuntos.length} guardados</small><h1>Conjuntos</h1></section>
    <button class="btn full" data-act="nuevoconj">＋ Crear conjunto</button>
    ${D.conjuntos.length ? OCASIONES.map(o => { const l = D.conjuntos.filter(c => c.ocasion === o); return l.length ? `<p class="sec">${o}</p>${l.map(c => `<div class="card conj"><div class="look sm">${c.prendas.map(prenda).filter(Boolean).map(x => `<div class="lk">${thumb(x)}</div>`).join('')}</div><div class="row"><b class="cn">${esc(c.nombre)}</b><small class="muted">${c.usos ? `${c.usos} ${c.usos === 1 ? 'vez' : 'veces'}` : 'sin estrenar'}</small><span class="sp"></span><button class="pill" data-conjpuesto="${c.id}">Me lo pongo</button><button class="pill" data-conjdel="${c.id}">Borrar</button></div></div>`).join('')}` : ''; }).join('')
      : `<div class="vacio"><p>Guarda los conjuntos que te gustan para no pensar cada mañana: uno para el trabajo, uno para una cita, uno para salir.</p></div>`}`;
}

function faltan() {
  const est = D.perfil.estilo || [], l = BASICOS.concat(...est.map(e => BASICOS_ESTILO[e] || []));
  return l.map(b => ({ ...b, tengo: D.prendas.filter(p => p.cat === b.cat).length })).filter(b => b.tengo < b.min);
}
function vCompras() {
  const f = faltan(), pend = D.compras.filter(c => !c.hecho).sort((a, b) => a.prio - b.prio), hechas = D.compras.filter(c => c.hecho);
  const total = pend.reduce((s, c) => s + (+c.precio || 0), 0);
  return `<section class="hero"><small>${pend.length} pendientes${total ? ` · unos ${total} €` : ''}</small><h1>Compras</h1></section>
    ${D.prendas.length ? (f.length ? `<div class="card"><h2>Lo que te falta para un fondo de armario</h2><p class="sub">Según lo que tienes en el armario${(D.perfil.estilo || []).length ? ' y tu estilo' : ''}.</p>${f.map((b, i) => `<div class="falta"><b>${esc(b.n)}</b><small>${esc(b.por)} Tienes ${b.tengo} de ${b.min}.</small><button class="pill" data-falta="${i}">Añadir a la lista</button></div>`).join('')}</div>` : '<div class="card tip"><p>Tienes un fondo de armario completo. Ahora compra solo lo que combine con al menos tres cosas que ya tienes.</p></div>')
      : '<div class="card tip"><p>Cuando añadas tu ropa al armario, aquí te diré qué te falta.</p></div>'}
    <div class="card"><h2>Mi lista</h2>
      ${pend.map(c => `<div class="lrow"><button class="chk" data-comp="${c.id}"><span></span></button><span class="b"><b>${esc(c.que)}</b><small>${['', 'Urgente', 'Pronto', 'Cuando pueda'][c.prio] || ''}${c.precio ? ` · ${esc(c.precio)} €` : ''}${c.donde ? ` · ${esc(c.donde)}` : ''}</small></span><button class="x" data-compdel="${c.id}" aria-label="Borrar">×</button></div>`).join('') || '<p class="sub">Vacía.</p>'}
      <button class="pill" data-act="nuevacomp">＋ Añadir</button>
      ${hechas.length ? `<p class="mini">Comprado</p>${hechas.slice(-8).map(c => `<div class="lrow hecha"><button class="chk ok" data-comp="${c.id}"><span></span></button><span class="b"><b>${esc(c.que)}</b></span><button class="x" data-compdel="${c.id}" aria-label="Borrar">×</button></div>`).join('')}` : ''}
    </div>`;
}

function vYo() {
  const p = D.perfil, cs = consejos(p), pr = productos(p);
  const cuando = k => CAMBIANTES.includes(k) && p._f && p._f[k] ? ` <small class="cuando">desde ${new Date(p._f[k]).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</small>` : '';
  const campo = c => c.op ? `<div class="campo"><span>${esc(c.t)}${cuando(c.k)}</span>${c.ayuda ? `<small>${esc(c.ayuda)}</small>` : ''}<div class="chips">${c.op.map(o => { const on = c.multi ? (p[c.k] || []).includes(o) : p[c.k] === o; return `<button class="pill ${on ? 'on' : ''}" data-pf="${c.k}" data-v="${esc(o)}">${esc(o)}</button>`; }).join('')}</div></div>`
    : `<label class="campo"><span>${esc(c.t)}${cuando(c.k)}</span><input data-pfin="${c.k}" type="${c.tipo === 'num' ? 'number' : 'text'}" inputmode="${c.tipo === 'num' ? 'numeric' : 'text'}" value="${esc(p[c.k] || '')}" ${c.u ? `placeholder="${c.u}"` : ''} autocomplete="off"></label>`;
  const viejos = CAMBIANTES.filter(k => p[k] && p._f && p._f[k] && Date.now() - Date.parse(p._f[k]) > 90 * 864e5);
  return `<section class="hero"><small>Todo se adapta a lo que pongas aquí</small><h1>Para mí</h1></section>
    ${viejos.length ? `<div class="card destaca"><h2>¿Sigue todo igual?</h2><p class="sub">Hace más de tres meses que pusiste: ${viejos.map(k => PERFIL_CAMPOS.find(c => c.k === k).t.toLowerCase()).join(', ')}. Si ha cambiado, actualízalo en «Mis datos» y los consejos se ajustan.</p><button class="pill" data-act="sigueigual">Sigue igual</button></div>` : ''}
    ${cs.length ? `<p class="sec">Mis consejos</p>${cs.map(([t, l]) => `<details class="card blq"><summary>${esc(t)}</summary><ul>${l.map(x => `<li>${esc(x)}</li>`).join('')}</ul></details>`).join('')}
      <details class="card blq"><summary>Productos para mí</summary><ul>${pr.map(([t, x]) => `<li><b>${esc(t)}:</b> ${esc(x)}</li>`).join('')}</ul><p class="mini">Son ejemplos fáciles de encontrar en farmacias y droguerías. No hace falta comprarlo todo de golpe: empieza por el protector solar.</p></details>`
      : '<div class="card tip"><p>Rellena al menos tono de piel, complexión y forma de cara para ver tus consejos.</p></div>'}
    <details class="card blq" ${!cs.length || ui.datos ? 'open' : ''}><summary>Mis datos</summary>
      <div class="campo"><span>Pegar datos que te ha dado Claude</span><small>Empiezan por ESTILO1. Rellenan tus datos de golpe.</small><textarea id="pegar" rows="2" placeholder="ESTILO1 {…}"></textarea><div class="row"><button class="pill on" data-act="pegar">Aplicar</button></div></div>${PERFIL_CAMPOS.map(campo).join('')}</details>
    ${syncHTML()}
    ${iaHTML()}
    <details class="card blq"><summary>Copia de seguridad</summary><p class="sub">Todo (también las fotos) se guarda solo en este móvil. Haz una copia de vez en cuando por si cambias de móvil o borras el navegador.</p>
      <div class="row"><button class="pill" data-act="exportar">Descargar copia</button><label class="pill">Restaurar copia<input type="file" accept="application/json,.json" id="imp" hidden></label></div></details>`;
}

function hace(t) { if (!t) return 'nunca'; const s = (Date.now() - t) / 1000; return s < 60 ? 'hace un momento' : s < 3600 ? `hace ${Math.round(s / 60)} min` : s < 86400 ? `hace ${Math.round(s / 3600)} h` : new Date(t).toLocaleDateString('es-ES'); }
function syncHTML() {
  const st = ES.status(), otra = ES.fromOtra();
  return `<details class="card blq" id="syncbox" ${ui.syncOpen || !st.on ? 'open' : ''}><summary>Verlo en el móvil y en el PC</summary>
    ${st.on ? `<p class="sub" style="margin-top:10px">${st.busy ? 'Sincronizando…' : st.msg ? '⚠️ ' + esc(st.msg) : 'Sincronizado ' + hace(st.last) + '.'} Lo que cambies aquí aparece en tus otros dispositivos, y al revés. Las fotos viajan en versión reducida.</p>
        <div class="row"><button class="pill on" data-act="syncya">Sincronizar ahora</button><button class="pill" data-act="synccode">Copiar código para otro dispositivo</button><button class="pill" data-act="syncoff">Desconectar</button></div>`
      : `<p class="sub" style="margin-top:10px">Para tener tu armario en el móvil, el PC o donde quieras. Se guarda cifrado en tu GitHub, como Mi Espacio y Cimientos: GitHub solo ve un bloque ilegible.</p>
        ${otra ? '<div class="row"><button class="pill on" data-act="syncotra">Usar la misma conexión que Mi Espacio</button></div><p class="mini">O pega el código</p>' : ''}
        <label class="campo"><span>Código de vinculación (empieza por MD1.)</span><input id="synccode" autocomplete="off" placeholder="MD1.…"></label>
        <div class="row"><button class="pill ${otra ? '' : 'on'}" data-act="synclink">Vincular</button></div>
        <p class="mini">El código lo tienes en Mi Espacio (Más → Sincronizar y copias) o en Cimientos.</p>`}
  </details>`;
}

function iaHTML() {
  const c = iaCfg();
  return `<details class="card blq" ${ui.iaOpen ? 'open' : ''}><summary>Rellenar prendas con IA</summary>
    <p class="sub" style="margin-top:10px">Sin IA, la app ya detecta el color sola. Con IA, al hacer la foto se rellenan también el tipo, un nombre, la temporada y un consejo para combinarla.</p>
    <ul><li>Usa la API de Anthropic (Claude), que es de pago por uso y va aparte de la suscripción a Claude. La clave se crea en console.anthropic.com.</li><li>Tu clave se guarda solo en este móvil y no va en la copia de seguridad.</li><li>Cada foto se envía a Anthropic para analizarla.</li></ul>
    ${c.key ? `<p class="mini">Clave guardada (acaba en ${esc(c.key.slice(-4))})</p><div class="row"><button class="pill ${c.on ? 'on' : ''}" data-act="iaon">${c.on ? 'IA activada' : 'IA desactivada'}</button><button class="pill" data-act="iaborrar">Borrar clave</button></div>`
      : `<label class="campo"><span>Tu clave de la API</span><input id="iakey" type="password" autocomplete="off" placeholder="sk-ant-…"></label><div class="row"><button class="pill on" data-act="iaguardar">Guardar y activar</button></div>`}
  </details>`;
}

const VISTAS = { hoy: vHoy, armario: vArmario, conjuntos: vConjuntos, compras: vCompras, yo: vYo };
function render() { $('app').innerHTML = VISTAS[ui.tab](); document.querySelectorAll('#tabnav button').forEach(b => b.classList.toggle('active', b.dataset.tab === ui.tab)); }
function ir(t) { ui.tab = t; render(); window.scrollTo(0, 0); }

// ---------- formularios ----------
function openPrenda(id) {
  const p = id ? prenda(id) : { cat: '', color: '', temp: 'Todo el año' };
  let foto = id ? FOTOS[id] : null, cat = p.cat, color = p.color, temp = p.temp || 'Todo el año';
  const v = sheet('');
  const paint = () => {
    v.querySelector('.sheet').innerHTML = `<div class="grab"></div><h2>${id ? 'Editar prenda' : 'Nueva prenda'}</h2>
      <label class="foto">${foto ? `<img src="${foto}" alt="">` : '<span>📷 Hacer foto o elegir de la galería</span>'}<input type="file" accept="image/*" id="pf" hidden></label>
      <label class="campo"><span>Nombre (opcional)</span><input id="pn" value="${esc(p.nombre || '')}" placeholder="Camiseta blanca de Uniqlo" autocomplete="off"></label>
      <div class="campo"><span>Tipo</span><div class="chips">${CATS.map(c => `<button class="pill ${cat === c ? 'on' : ''}" data-pc="${c}">${c}</button>`).join('')}</div></div>
      <div class="campo"><span>Color principal</span><div class="chips">${COLORES.map(c => `<button class="pill ${color === c ? 'on' : ''}" data-pcol="${c}">${swatch(c)}${c}</button>`).join('')}</div></div>
      <div class="campo"><span>Cuándo</span><div class="chips">${TEMPS.map(c => `<button class="pill ${temp === c ? 'on' : ''}" data-pt="${c}">${c}</button>`).join('')}</div></div>
      <label class="campo"><span>Notas (talla, tienda, si te queda bien…)</span><input id="pno" value="${esc(p.notas || '')}" autocomplete="off"></label>
      <div class="acts">${id ? '<button class="btn ghost" data-pdel>Borrar</button>' : '<button class="btn ghost" data-close>Cancelar</button>'}<span class="sp"></span><button class="btn" data-pok>Guardar</button></div>`;
  };
  paint();
  v.addEventListener('change', async e => {
    if (e.target.id !== 'pf' || !e.target.files[0]) return;
    try { p.nombre = v.querySelector('#pn').value; p.notas = v.querySelector('#pno').value; foto = await comprimir(e.target.files[0]); } catch (er) { return toast('No se ha podido leer la foto.'); }
    if (!color) { color = await colorDominante(foto); if (color) toast(`Color detectado: ${color.toLowerCase()}. Cámbialo si no es.`); }
    paint();
    if (!iaActiva()) return;
    const st = v.querySelector('.foto'); st.classList.add('ia'); st.insertAdjacentHTML('beforeend', '<span class="iatag">Analizando con IA…</span>');
    try {
      const a = await analizarIA(foto);
      if (!v.isConnected) return;
      p.nombre = a.nombre || p.nombre; if (CATS.includes(a.cat)) cat = a.cat; if (COLORES.includes(a.color)) color = a.color; if (TEMPS.includes(a.temp)) temp = a.temp;
      if (a.consejo && !p.notas) p.notas = a.consejo;
      paint(); toast('Rellenado con IA. Revisa y guarda.');
    } catch (er) { if (v.isConnected) { paint(); toast(er.message || 'No se ha podido analizar.'); } }
  });
  v.addEventListener('click', async e => {
    const keep = () => { p.nombre = v.querySelector('#pn').value; p.notas = v.querySelector('#pno').value; };
    const b = e.target.closest('[data-pc],[data-pcol],[data-pt]');
    if (b) { keep(); if (b.dataset.pc) cat = b.dataset.pc; if (b.dataset.pcol) color = b.dataset.pcol; if (b.dataset.pt) temp = b.dataset.pt; return paint(); }
    if (e.target.closest('[data-pdel]')) { if (!confirm('¿Borrar esta prenda?')) return; D.prendas = D.prendas.filter(x => x.id !== id); D.conjuntos.forEach(c => { c.prendas = c.prendas.filter(x => x !== id); }); D.conjuntos = D.conjuntos.filter(c => c.prendas.length); save(); fotoDel(id).catch(() => {}); v.close(); render(); return; }
    if (!e.target.closest('[data-pok]')) return;
    if (!cat) return toast('Elige el tipo de prenda.');
    keep();
    const o = { id: id || uid('p'), nombre: p.nombre.trim(), cat, color, temp, notas: p.notas.trim(), usos: p.usos || 0, fecha: p.fecha || new Date().toISOString() };
    if (p.fv) o.fv = p.fv;
    if (foto && foto !== FOTOS[o.id]) { try { await fotoPut(o.id, foto); o.fv = Date.now(); ES.fotoLocal(o.id, o.fv); } catch (er) { toast('No se ha podido guardar la foto: puede que el móvil esté sin espacio.'); } }
    D.prendas = id ? D.prendas.map(x => x.id === id ? o : x) : D.prendas.concat(o); save(); v.close(); ui.look = null; render(); toast(id ? 'Guardada' : 'Añadida al armario');
  });
}

function openConjunto(pre) {
  if (D.prendas.length < 2) return toast('Añade antes algunas prendas al armario.');
  let sel = pre ? pre.slice() : [], oc = 'Diario';
  const v = sheet('');
  const paint = () => {
    const nombre = v.querySelector('#cn') ? v.querySelector('#cn').value : '';
    v.querySelector('.sheet').innerHTML = `<div class="grab"></div><h2>Nuevo conjunto</h2><p class="sub">Toca las prendas que lo forman.</p>
      <div class="grid pick">${D.prendas.map(p => `<button class="prenda ${sel.includes(p.id) ? 'sel' : ''}" data-sel="${p.id}">${thumb(p)}<span class="pn"><b>${esc(p.nombre || p.cat)}</b></span></button>`).join('')}</div>
      <label class="campo"><span>Nombre</span><input id="cn" value="${esc(nombre)}" placeholder="Cita tranquila" autocomplete="off"></label>
      <div class="campo"><span>Para</span><div class="chips">${OCASIONES.map(o => `<button class="pill ${oc === o ? 'on' : ''}" data-oc="${o}">${o}</button>`).join('')}</div></div>
      <div class="acts"><button class="btn ghost" data-close>Cancelar</button><span class="sp"></span><button class="btn" data-cok>Guardar (${sel.length})</button></div>`;
  };
  paint();
  v.addEventListener('click', e => {
    const s = e.target.closest('[data-sel]'); if (s) { const i = s.dataset.sel; sel = sel.includes(i) ? sel.filter(x => x !== i) : sel.concat(i); return paint(); }
    const o = e.target.closest('[data-oc]'); if (o) { oc = o.dataset.oc; return paint(); }
    if (!e.target.closest('[data-cok]')) return;
    if (sel.length < 2) return toast('Elige al menos dos prendas.');
    D.conjuntos.push({ id: uid('c'), nombre: v.querySelector('#cn').value.trim() || oc, prendas: sel, ocasion: oc, usos: 0 }); save(); v.close(); ir('conjuntos'); toast('Conjunto guardado');
  });
}

function openCompra(pre) {
  let prio = 2;
  const v = sheet('');
  const paint = () => {
    const g = k => v.querySelector(k) ? v.querySelector(k).value : '';
    const que = g('#cq') || pre || '', pr = g('#cp'), dn = g('#cd');
    v.querySelector('.sheet').innerHTML = `<div class="grab"></div><h2>Añadir a la lista</h2>
      <label class="campo"><span>Qué</span><input id="cq" value="${esc(que)}" placeholder="Vaqueros azul oscuro rectos" autocomplete="off"></label>
      <div class="campo"><span>Prioridad</span><div class="chips">${['Urgente', 'Pronto', 'Cuando pueda'].map((x, i) => `<button class="pill ${prio === i + 1 ? 'on' : ''}" data-prio="${i + 1}">${x}</button>`).join('')}</div></div>
      <label class="campo"><span>Precio aproximado (€)</span><input id="cp" type="number" inputmode="numeric" value="${esc(pr)}" autocomplete="off"></label>
      <label class="campo"><span>Dónde</span><input id="cd" value="${esc(dn)}" placeholder="Uniqlo" autocomplete="off"></label>
      <div class="acts"><button class="btn ghost" data-close>Cancelar</button><span class="sp"></span><button class="btn" data-cmok>Añadir</button></div>`;
  };
  paint();
  v.addEventListener('click', e => {
    const p = e.target.closest('[data-prio]'); if (p) { prio = +p.dataset.prio; return paint(); }
    if (!e.target.closest('[data-cmok]')) return;
    const que = v.querySelector('#cq').value.trim(); if (!que) return v.querySelector('#cq').focus();
    D.compras.push({ id: uid('b'), que, prio, precio: v.querySelector('#cp').value, donde: v.querySelector('#cd').value.trim(), hecho: false }); save(); v.close(); render();
  });
}

function marcarPuesto(ids) { ids.forEach(id => { const p = prenda(id); if (p) p.usos = (p.usos || 0) + 1; }); save(); }

function marcaFecha(k) { if (!CAMBIANTES.includes(k)) return; D.perfil._f = Object.assign({}, D.perfil._f); if (D.perfil[k] == null) delete D.perfil._f[k]; else D.perfil._f[k] = new Date().toISOString(); }

// ---------- eventos ----------
document.getElementById('tabnav').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) ir(b.dataset.tab); });
$('app').addEventListener('click', e => {
  const t = e.target;
  const go = t.closest('[data-go]'); if (go) return ir(go.dataset.go);
  const c = t.closest('[data-cat]'); if (c) { ui.cat = c.dataset.cat; return render(); }
  const pr = t.closest('[data-prenda]'); if (pr) return openPrenda(pr.dataset.prenda);
  const ru = t.closest('[data-rut]'); if (ru) { const k = hoyKey(), r = D.rutina[k] = D.rutina[k] || { m: [], n: [] }, l = r[ru.dataset.rut[0]], i = +ru.dataset.rut.slice(1); if (l.includes(i)) l.splice(l.indexOf(i), 1); else l.push(i); Object.keys(D.rutina).sort().slice(0, -30).forEach(x => delete D.rutina[x]); save(); return render(); }
  const cp = t.closest('[data-conjpuesto]'); if (cp) { const cj = D.conjuntos.find(x => x.id === cp.dataset.conjpuesto); cj.usos = (cj.usos || 0) + 1; marcarPuesto(cj.prendas); render(); return toast('Apuntado. ¡A por el día!'); }
  const cd = t.closest('[data-conjdel]'); if (cd) { if (!confirm('¿Borrar este conjunto? Las prendas no se borran.')) return; D.conjuntos = D.conjuntos.filter(x => x.id !== cd.dataset.conjdel); save(); return render(); }
  const fa = t.closest('[data-falta]'); if (fa) return openCompra(faltan()[+fa.dataset.falta].n);
  const co = t.closest('[data-comp]'); if (co) { const x = D.compras.find(y => y.id === co.dataset.comp); x.hecho = !x.hecho; save(); render(); if (x.hecho) toast('Comprado. Añádelo al armario cuando lo tengas.'); return; }
  const cdl = t.closest('[data-compdel]'); if (cdl) { D.compras = D.compras.filter(y => y.id !== cdl.dataset.compdel); save(); return render(); }
  const pf = t.closest('[data-pf]'); if (pf) { const k = pf.dataset.pf, v = pf.dataset.v, campo = PERFIL_CAMPOS.find(x => x.k === k); if (campo.multi) { const l = D.perfil[k] || []; D.perfil[k] = l.includes(v) ? l.filter(x => x !== v) : l.concat(v); } else D.perfil[k] = D.perfil[k] === v ? undefined : v; marcaFecha(k); save(); ui.datos = true; const y = window.scrollY; render(); window.scrollTo(0, y); return; }
  const a = t.closest('[data-act]'); if (!a) return;
  const act = a.dataset.act;
  if (act === 'nueva') return openPrenda();
  if (act === 'nuevoconj') return openConjunto();
  if (act === 'nuevacomp') return openCompra();
  if (act === 'otro') { ui.look = generarLook(); return render(); }
  if (act === 'puesto') { marcarPuesto(ui.look); return toast('Apuntado. ¡A por el día!'); }
  if (act === 'guardarlook') return openConjunto(ui.look);
  if (act === 'exportar') return exportar();
  if (act === 'pegar') {
    const m = $('pegar').value.match(/ESTILO1\s*(\{[\s\S]*\})/); let o = null; try { o = m && JSON.parse(m[1]); } catch (er) {}
    if (!o) return toast('No lo reconozco. Copia el bloque entero, desde ESTILO1 hasta la última llave.');
    let n = 0;
    for (const c of PERFIL_CAMPOS) {
      if (!(c.k in o)) continue; const v = o[c.k];
      const ok = c.op ? (c.multi ? Array.isArray(v) && v.every(x => c.op.includes(x)) : c.op.includes(v)) : (c.tipo === 'num' ? +v > 0 : typeof v === 'string');
      if (ok) { D.perfil[c.k] = c.tipo === 'num' ? String(+v) : v; marcaFecha(c.k); n++; }
    }
    save(); ui.datos = true; render(); return toast(n ? `${n} ${n === 1 ? 'dato aplicado' : 'datos aplicados'}` : 'No había datos válidos en el bloque.');
  }
  if (act === 'sigueigual') { D.perfil._f = Object.assign({}, D.perfil._f); CAMBIANTES.forEach(k => { if (D.perfil[k]) D.perfil._f[k] = new Date().toISOString(); }); save(); return render(); }
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
  if (act === 'iaon') { const c = iaCfg(); c.on = !c.on; localStorage.setItem(IA_KEY, JSON.stringify(c)); ui.iaOpen = true; return render(); }
  if (act === 'iaborrar') { if (!confirm('¿Borrar tu clave de este móvil?')) return; localStorage.removeItem(IA_KEY); ui.iaOpen = true; return render(); }
});
$('app').addEventListener('change', e => {
  const i = e.target.closest('[data-pfin]'); if (i) { D.perfil[i.dataset.pfin] = i.value.trim() || undefined; marcaFecha(i.dataset.pfin); save(); if (CAMBIANTES.includes(i.dataset.pfin)) { const y = window.scrollY; ui.datos = true; render(); window.scrollTo(0, y); } return; }
  if (e.target.id === 'imp' && e.target.files[0]) importar(e.target.files[0]);
});

async function exportar() {
  const blob = new Blob([JSON.stringify({ app: 'estilo', v: 1, fecha: new Date().toISOString(), datos: D, fotos: FOTOS })], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `estilo-copia-${hoyKey()}.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
async function importar(f) {
  try {
    const j = JSON.parse(await f.text()); if (j.app !== 'estilo' || !j.datos) throw new Error('formato');
    if (!confirm('Esto sustituye lo que tienes ahora en la app por la copia. ¿Seguir?')) return;
    D = Object.assign({ prendas: [], conjuntos: [], compras: [], perfil: {}, rutina: {} }, j.datos); save();
    for (const [k, v] of Object.entries(j.fotos || {})) await fotoPut(k, v);
    const ahora = Date.now(); D.prendas.forEach(p => { if (FOTOS[p.id]) { p.fv = ahora; ES.fotoLocal(p.id, ahora); } }); save();
    ui.look = null; render(); toast('Copia restaurada');
  } catch (e) { toast('Ese archivo no es una copia de Estilo.'); }
}

ES.init({
  get: () => D,
  set: d => { D = Object.assign({ prendas: [], conjuntos: [], compras: [], perfil: {}, rutina: {} }, D, d); D.perfil = D.perfil || {}; D.rutina = D.rutina || {}; try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} },
  fotoGet: id => FOTOS[id], fotoPut, fotoDel: id => fotoDel(id).catch(() => {}), reducir
});
ES.onChange = s => {
  if (s === 'changed') { ui.look = null; render(); return; }
  const box = document.getElementById('syncbox'); if (box && ui.tab === 'yo') { const y = window.scrollY; ui.syncOpen = box.open; render(); window.scrollTo(0, y); }
};
fotosCargar().then(() => {
  // Prendas con foto de antes de la sincronización: se les pone versión para que viajen.
  let cambia = false; const ahora = Date.now();
  D.prendas.forEach(p => { if (FOTOS[p.id] && !p.fv) { p.fv = ahora; ES.fotoLocal(p.id, ahora); cambia = true; } });
  if (cambia) save();
  render(); ES.sync();
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') ES.sync(); });
render();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(() => {});
