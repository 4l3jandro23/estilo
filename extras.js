/* Extras de la versión 24: tu armario en cifras, la maleta de viaje y el filtro por tienda.
   Usan las mismas piezas que el resto de la app (D, sheet, thumb, usos…); no guardan nada nuevo en tus datos,
   solo la última maleta en este dispositivo. */
'use strict';
ICONOS.grafico = '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>';
ICONOS.maleta = '<rect x="3" y="8" width="18" height="12" rx="3"/><path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/>';

// Tono de cada categoría, el mismo que en las siluetas (--t-… / --i-… del CSS).
const TONO_CAT = { 'Camisetas': 'azul', 'Polos': 'azul', 'Camisas': 'lila', 'Sudaderas y jerséis': 'rosa', 'Chaquetas y abrigos': 'ambar', 'Vaqueros': 'denim', 'Pantalones': 'salvia', 'Pantalón corto': 'mar', 'Zapatillas': 'arena', 'Zapatos': 'arena', 'Accesorios': 'ciruela' };
const tonoDe = c => TONO_CAT[c] || 'gris';
const sale = p => /^(Vender|Donar|Tirar)/.test(p.veredicto || '');

function barras(filas, tono) {
  const max = Math.max(1, ...filas.map(f => f.n));
  return `<div class="barras">${filas.map(f => `<div class="bar-f"><span class="bar-t">${f.sw || ''}${esc(f.t)}</span><span class="bar-b"><i style="width:${Math.max(6, f.n / max * 100)}%;${f.hex ? `--tt:${f.hex};--ii:rgba(0,0,0,.18)` : `--tt:var(--t-${f.tono || tono});--ii:var(--i-${f.tono || tono})`}"></i></span><b>${f.v != null ? f.v : f.n}</b></div>`).join('')}</div>`;
}
function cuenta(l, clave) { const m = {}; l.forEach(p => { const k = clave(p); if (k) m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); }

function openInforme() {
  const v = sheet(''), l = D.prendas, n = l.length;
  if (!n) { v.querySelector('.sheet').innerHTML = `<div class="grab"></div><h2>Tu armario en cifras</h2><div class="vacio"><p><b>Aún no hay ropa.</b></p><p>Añade prendas y aquí verás cómo se reparte.</p></div><div class="acts"><span class="sp"></span><button class="btn" data-close>Cerrar</button></div>`; return; }
  const valor = l.reduce((s, p) => s + (+p.precio || 0), 0), conPrecio = l.filter(p => +p.precio);
  const porCat = cuenta(l, p => p.cat).map(([t, k]) => ({ t, n: k, tono: tonoDe(t) }));
  const porColor = cuenta(l, p => p.color).slice(0, 8).map(([t, k]) => ({ t, n: k, hex: HEX[t] || '#C9CDD2' }));
  const porTienda = cuenta(l, p => p.tienda).slice(0, 8).map(([t, k]) => ({ t, n: k, tono: 'azul' }));
  const gastoTienda = {}; conPrecio.forEach(p => { if (p.tienda) gastoTienda[p.tienda] = (gastoTienda[p.tienda] || 0) + (+p.precio); });
  const porForm = FORMALIDAD.map(f => ({ t: f, n: l.filter(p => p.formalidad === f).length, tono: { Deportivo: 'mar', Casual: 'azul', Arreglado: 'lila', Formal: 'ciruela' }[f] })).filter(x => x.n);
  const mas = l.slice().sort((a, b) => usos(b) - usos(a)).filter(p => usos(p) > 0).slice(0, 4);
  const sinEstrenar = l.filter(p => !usos(p) && !sale(p)).length;
  const neutros = l.filter(p => NEUTROS.includes(p.color)).length;
  const cpu = conPrecio.length ? conPrecio.reduce((s, p) => s + (+p.precio) / Math.max(1, usos(p)), 0) / conPrecio.length : 0;
  const top = porCat[0], topColor = porColor[0];
  const dato = `Tu armario es sobre todo ${top.t.toLowerCase()} (${top.n} de ${n})${topColor ? ` y el color que más repites es ${topColor.t.toLowerCase()}` : ''}. ${Math.round(neutros / n * 100)}% de tus prendas son colores neutros, así que casi todo combina entre sí.`;
  const faltan0 = faltan().slice(0, 3);
  v.querySelector('.sheet').innerHTML = `<div class="grab"></div><h2>Tu armario en cifras</h2><p class="sub">${esc(dato)}</p>
    <div class="stats"><div><b>${n}</b><small>prendas</small></div><div><b>${valor ? eur(valor) : '—'}</b><small>valor</small></div><div><b>${cpu ? eur(cpu) : '—'}</b><small>coste por puesta</small></div><div><b>${sinEstrenar}</b><small>sin estrenar</small></div></div>
    <section class="card"><h2>Por tipo de prenda</h2>${barras(porCat)}</section>
    <section class="card"><h2>Por color</h2>${barras(porColor)}</section>
    ${porForm.length ? `<section class="card"><h2>Cómo de arreglado</h2><p class="sub">Solo las prendas con formalidad apuntada.</p>${barras(porForm)}</section>` : ''}
    ${porTienda.length ? `<section class="card"><h2>Dónde compras</h2>${barras(porTienda.map(x => Object.assign(x, gastoTienda[x.t] ? { v: `${x.n} · ${eur(gastoTienda[x.t])}` } : {})))}</section>` : ''}
    ${mas.length ? `<section class="card"><h2>Lo que más te pones</h2><div class="look sm">${mas.map(p => `<button class="lk" data-ficha="${p.id}">${thumb(p)}<small>${usos(p)} ${usos(p) === 1 ? 'vez' : 'veces'}</small></button>`).join('')}</div></section>` : '<section class="card etiqueta"><p>Cuando pulses «Me lo pongo» unos días, aquí verás lo que más usas.</p></section>'}
    ${faltan0.length ? `<section class="card aviso"><h2>Lo que más te falta</h2>${faltan0.map(f => `<p class="sub" style="margin:6px 0 0"><b>${esc(f.n)}</b></p>`).join('')}</section>` : ''}
    <div class="acts"><span class="sp"></span><button class="btn" data-close>Cerrar</button></div>`;
  v.addEventListener('click', e => { const b = e.target.closest('[data-ficha]'); if (b) { v.close(); openPrenda(b.dataset.ficha); } });
}

// ---------- Maleta ----------
const MALETA_KEY = 'estiloMaleta';
const maletaGuardada = () => { try { return JSON.parse(localStorage.getItem(MALETA_KEY)) || null; } catch (e) { return null; } };
const maletaGuarda = m => { try { localStorage.setItem(MALETA_KEY, JSON.stringify(m)); } catch (e) {} };
const CLIMAS = [['Calor', 'Calor'], ['Mixto', 'Mixto'], ['Frío', 'Frío']];

function armaMaleta(dias, clima, cena, azar) {
  const ok = p => !p.estado && !sale(p) && (clima === 'Calor' ? p.temp !== 'Frío' : clima === 'Frío' ? p.temp !== 'Calor' : true);
  const pool = D.prendas.filter(ok);
  const score = p => (NEUTROS.includes(p.color) ? 2 : 0) + Math.min(usos(p), 6) * .3 + (p.fav ? 1 : 0) + Math.random() * azar * 2;
  const elige = (cats, n, evitaColor) => {
    const usados = new Set(), r = [];
    const l = pool.filter(p => cats.includes(p.cat)).sort((a, b) => score(b) - score(a));
    while (r.length < n && l.length) {
      let i = evitaColor ? l.findIndex(p => !usados.has(p.color)) : 0; if (i < 0) i = 0;
      const p = l.splice(i, 1)[0]; r.push(p); usados.add(p.color);
    }
    return r;
  };
  const nTop = dias <= 3 ? dias : Math.ceil(dias * .7), nBot = dias <= 3 ? 2 : Math.min(4, Math.ceil(dias / 3) + 1);
  const sel = [];
  if (cena) { const c = elige(['Camisas'], 1); sel.push(...c); }
  sel.push(...elige(['Camisetas', 'Polos', 'Camisas'], nTop - sel.length, true).filter(p => !sel.includes(p)));
  const bajos = elige(['Vaqueros', 'Pantalones'], clima === 'Calor' ? Math.max(1, nBot - 1) : nBot, true);
  sel.push(...bajos);
  if (clima !== 'Frío') sel.push(...elige(['Pantalón corto'], clima === 'Calor' ? 2 : 1));
  if (clima !== 'Calor') sel.push(...elige(['Sudaderas y jerséis'], clima === 'Frío' ? 2 : 1));
  if (clima !== 'Calor') sel.push(...elige(['Chaquetas y abrigos'], 1));
  else sel.push(...elige(['Chaquetas y abrigos'], 0));
  sel.push(...elige(['Zapatillas'], 1));
  if (cena) sel.push(...elige(['Zapatos'], 1));
  sel.push(...elige(['Accesorios'], 1));
  return [...new Set(sel)].map(p => p.id);
}

function openMaleta() {
  const v = sheet('');
  const g = maletaGuardada() || {};
  const m = { dias: g.dias || 4, clima: g.clima || 'Mixto', cena: !!g.cena, ids: (g.ids || []).filter(id => prenda(id)), hecho: g.hecho || [] };
  const paint = () => {
    const por = {}; m.ids.map(prenda).filter(Boolean).forEach(p => { (por[p.cat] = por[p.cat] || []).push(p); });
    const cats = CATS.filter(c => por[c]);
    const hechas = m.ids.filter(id => m.hecho.includes(id)).length;
    v.querySelector('.sheet').innerHTML = `<div class="grab"></div><h2>Maleta de viaje</h2><p class="sub">Dime cuántos días y qué tiempo hará, y te armo la lista con lo que tienes limpio y usas más.</p>
      <section class="card">
        <div class="paso"><span>Días</span><div class="step"><button class="pill" data-md="-1" aria-label="Un día menos">−</button><b>${m.dias}</b><button class="pill" data-md="1" aria-label="Un día más">+</button></div></div>
        <div class="campo"><span>Tiempo</span><div class="chips tight">${CLIMAS.map(([k, t]) => `<button class="pill sm ${m.clima === k ? 'on' : ''}" data-mc="${k}">${t}</button>`).join('')}</div></div>
        <button class="chk ${m.cena ? 'ok' : ''}" data-mcena style="margin-top:6px"><span></span>Alguna cena o salida arreglada</button>
        <div class="row"><button class="btn" data-mhaz>${m.ids.length ? 'Preparar otra vez' : 'Preparar maleta'}</button></div>
      </section>
      ${m.ids.length ? `<section class="card"><div class="row-h"><h2>Tu lista</h2><small class="muted">${hechas} de ${m.ids.length} en la maleta</small></div><div class="barra"><span style="width:${hechas / m.ids.length * 100}%"></span></div>
        ${cats.map(c => `<p class="mini">${esc(c)}</p>${por[c].map(p => `<div class="lrow"><button class="chk ${m.hecho.includes(p.id) ? 'ok' : ''}" data-mh="${p.id}" aria-label="Marcar ${esc(nombre(p))}"><span></span></button><span class="fpt mt">${thumb(p)}</span><span class="b"><b>${esc(nombre(p))}</b></span><button class="x" data-mq="${p.id}" aria-label="Quitar de la lista">×</button></div>`).join('')}`).join('')}
        <div class="row"><button class="pill" data-mcopia>Copiar lista</button></div>
        <p class="mini-t">Recuerda también: cargador, ropa interior y calcetines para ${m.dias} días, y el neceser.</p></section>` : ''}
      <div class="acts"><span class="sp"></span><button class="btn" data-close>Listo</button></div>`;
  };
  paint();
  v.addEventListener('click', e => {
    const q = s => e.target.closest(s);
    if (q('[data-md]')) { m.dias = Math.min(21, Math.max(1, m.dias + +q('[data-md]').dataset.md)); }
    else if (q('[data-mc]')) m.clima = q('[data-mc]').dataset.mc;
    else if (q('[data-mcena]')) m.cena = !m.cena;
    else if (q('[data-mhaz]')) { m.ids = armaMaleta(m.dias, m.clima, m.cena, m.ids.length ? 1 : 0); m.hecho = []; if (!m.ids.length) toast('No tengo prendas limpias para armar la maleta.'); }
    else if (q('[data-mh]')) { const id = q('[data-mh]').dataset.mh; m.hecho = m.hecho.includes(id) ? m.hecho.filter(x => x !== id) : [...m.hecho, id]; }
    else if (q('[data-mq]')) { const id = q('[data-mq]').dataset.mq; m.ids = m.ids.filter(x => x !== id); }
    else if (q('[data-mcopia]')) {
      const t = `Maleta (${m.dias} días, ${m.clima.toLowerCase()})\n` + m.ids.map(prenda).filter(Boolean).map(p => `- ${nombre(p)}`).join('\n');
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Lista copiada.')).catch(() => toast('No he podido copiarla.')); return;
    } else return;
    maletaGuarda(m); const y = v.querySelector('.sheet').scrollTop; paint(); v.querySelector('.sheet').scrollTop = y;
  });
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  if (b.dataset.act === 'informe') openInforme();
  else if (b.dataset.act === 'maleta') openMaleta();
});

// Tres atajos en Hoy y el filtro por tienda en Armario.
const atajosHTML = () => `<div class="atajos"><button class="atajo" data-act="informe">${IC('grafico')}<span>Tu armario en cifras</span></button><button class="atajo" data-act="maleta">${IC('maleta')}<span>Maleta de viaje</span></button><button class="atajo" data-act="locompro">${IC('pregunta')}<span>¿Lo compro?</span></button></div>`;
const tiendasHTML = () => {
  const t = cuenta(D.prendas, p => p.tienda); if (t.length < 2) return '';
  return `<div class="chips scroll"><span class="lbl">Tienda</span><button class="pill sm ${!ui.tienda ? 'on' : ''}" data-tienda="">Todas</button>${t.map(([n, k]) => `<button class="pill sm ${ui.tienda === n ? 'on' : ''}" data-tienda="${esc(n)}">${esc(n)} <span class="cnt">${k}</span></button>`).join('')}</div>`;
};
document.addEventListener('click', e => { const b = e.target.closest('[data-tienda]'); if (b) { ui.tienda = b.dataset.tienda; render(); } });
