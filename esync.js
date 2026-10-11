/* Sincronización entre tus dispositivos, igual que Cimientos: todo se comprime y se CIFRA aquí (AES-256-GCM con tu clave)
   antes de subirlo a un gist secreto de tu GitHub. Cada prenda, conjunto o compra lleva la hora de su último cambio,
   así que lo que hagas en el móvil y en el PC se junta sin pisarse. Las fotos viajan aparte, en versión reducida, una por archivo. */
'use strict';
const ES = (() => {
  const API = 'https://api.github.com';
  const FILE = 'estilo-sync.enc.json';
  const CFG = 'estilo.sync';            // token y clave: solo en este dispositivo, nunca se suben
  const META = 'estiloMeta';            // horas de cada cambio y borrados
  const FV = 'estiloFotoV';             // versión de la foto que hay en este dispositivo, por prenda
  const MD_CFG = 'midinero.sync';       // la sincronización de Mi Espacio (mismo dominio: se puede reutilizar)
  const TYPES = { prendas: 'list', conjuntos: 'list', compras: 'list', historial: 'list', perfil: 'whole', rutina: 'map', rutinaPasos: 'whole' };
  const MAX_FOTOS = 15;                 // fotos que se suben o bajan por ciclo, para no hacer peticiones enormes

  const rd = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const wr = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const cfg = () => rd(CFG, {}) || {};
  const setCfg = c => wr(CFG, c);
  const meta = () => { const m = rd(META, {}) || {}; m.t = m.t || {}; m.del = m.del || {}; return m; };
  const J = x => JSON.stringify(x == null ? null : x);
  const asItems = (type, v) => type === 'list' ? Object.fromEntries((Array.isArray(v) ? v : []).filter(x => x && x.id).map(x => [x.id, x])) : (v && typeof v === 'object' ? v : {});
  const fname = id => 'f-' + id + '.enc';

  let host = null; // { get(), set(datos), fotoGet(id), fotoPut(id, url), fotoDel(id), reducir(url) }

  // Apunta la hora de lo que ha cambiado entre los datos viejos y los nuevos.
  function touch(oldD, newD) {
    const m = meta(), now = Date.now();
    for (const [k, type] of Object.entries(TYPES)) {
      const ov = oldD && oldD[k], nv = newD && newD[k];
      if (type === 'whole') { if (J(ov) !== J(nv)) m.t[k] = now; continue; }
      const a = asItems(type, ov), b = asItems(type, nv);
      for (const id of Object.keys(b)) if (J(a[id]) !== J(b[id])) { m.t[k + '/' + id] = now; delete m.del[k + '/' + id]; }
      for (const id of Object.keys(a)) if (!(id in b)) m.del[k + '/' + id] = now;
    }
    wr(META, m); schedule();
  }

  function snapshot() { const m = meta(), D = host.get(), data = {}; for (const k of Object.keys(TYPES)) data[k] = D[k] == null ? null : D[k]; return { v: 1, data, t: m.t, del: m.del }; }
  // Junta dos copias: por cada cosa gana el cambio más reciente; lo borrado se queda borrado.
  function merge(a, b) {
    const out = { v: 1, data: {}, t: {}, del: {} };
    for (const [k, type] of Object.entries(TYPES)) {
      const va = a.data[k], vb = b.data[k];
      if (type === 'whole') {
        const ta = a.t[k] || 0, tb = b.t[k] || 0;
        out.data[k] = ta > tb ? va : tb > ta ? vb : (va != null ? va : vb);
        if (ta || tb) out.t[k] = Math.max(ta, tb);
        continue;
      }
      const ia = asItems(type, va), ib = asItems(type, vb), res = {};
      const ids = new Set([...Object.keys(ia), ...Object.keys(ib)]);
      for (const sk of [...Object.keys(a.del), ...Object.keys(b.del)]) if (sk.startsWith(k + '/')) ids.add(sk.slice(k.length + 1));
      for (const id of ids) {
        const p = k + '/' + id, ta = a.t[p] || 0, tb = b.t[p] || 0, d = Math.max(a.del[p] || 0, b.del[p] || 0);
        const item = ta > tb ? ia[id] : tb > ta ? ib[id] : (id in ia ? ia[id] : ib[id]);
        const tt = Math.max(ta, tb);
        if (d && d >= tt) { out.del[p] = d; continue; }
        if (item !== undefined) res[id] = item;
        if (tt) out.t[p] = tt;
      }
      if (type === 'map') out.data[k] = res;
      else {
        const order = [...(Array.isArray(va) ? va : []), ...(Array.isArray(vb) ? vb : [])].map(x => x && x.id);
        const list = Object.values(res), f = x => x.fecha || '';
        if (list.every(f)) list.sort((x, y) => (f(x) < f(y) ? -1 : 1)); else list.sort((x, y) => order.indexOf(x.id) - order.indexOf(y.id));
        out.data[k] = list;
      }
    }
    return out;
  }
  const same = (x, y) => J(x.data) === J(y.data) && J(x.del) === J(y.del);

  // ---- cifrado ----
  const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const pipe = async (u8, stream) => new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(stream)).arrayBuffer());
  const keys = {};
  async function key(pass, saltB64) {
    const ck = pass + '|' + saltB64; if (keys[ck]) return keys[ck];
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
    return (keys[ck] = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: unb64(saltB64), iterations: 310000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']));
  }
  async function encrypt(obj, pass, saltB64) {
    const salt = saltB64 || b64(crypto.getRandomValues(new Uint8Array(16))), iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await pipe(new TextEncoder().encode(JSON.stringify(obj)), new CompressionStream('gzip'));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(pass, salt), data));
    return { v: 1, salt, iv: b64(iv), data: b64(ct) };
  }
  async function decrypt(p, pass) {
    let pt;
    try { pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(p.iv) }, await key(pass, p.salt), unb64(p.data)); }
    catch (e) { throw new Error('La clave no coincide con la del otro dispositivo. Vuelve a vincular con el código.'); }
    return JSON.parse(new TextDecoder().decode(await pipe(new Uint8Array(pt), new DecompressionStream('gzip'))));
  }

  // ---- GitHub ----
  async function gh(token, path, opt) {
    opt = opt || {};
    const headers = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (opt.body) headers['Content-Type'] = 'application/json';
    let r;
    try { r = await fetch(API + path, Object.assign({}, opt, { headers, cache: 'no-store' })); }
    catch (e) { throw new Error('Sin conexión. Se sincronizará cuando vuelvas a tener internet.'); }
    if (r.status === 401) throw new Error('El token de GitHub no es válido o ha caducado.');
    if (r.status === 403 || r.status === 404) throw new Error('El token no tiene permiso de Gists.');
    if (!r.ok) throw new Error('GitHub ha dado un error (' + r.status + '). Prueba en un rato.');
    return r.status === 204 ? null : r.json();
  }
  async function findGist(token) {
    for (let page = 1; page <= 10; page++) {
      const list = await gh(token, '/gists?per_page=100&page=' + page);
      const g = list.find(g => g.files && g.files[FILE]); if (g) return g.id;
      if (list.length < 100) break;
    }
    return null;
  }
  const fileText = async f => f.truncated ? (await fetch(f.raw_url, { cache: 'no-store' })).text() : f.content;

  // ---- un ciclo ----
  let busy = false, again = false, timer = null, msg = '', onChange = () => {};
  async function sync() {
    const c = cfg(); if (!c.token || !c.pass || !host) return;
    if (busy) { again = true; return; }
    busy = true; msg = ''; onChange('busy');
    try {
      let id = c.gistId || await findGist(c.token), remote = null, salt = null, files = {};
      if (id) {
        const g = await gh(c.token, '/gists/' + id); files = g.files || {};
        if (files[FILE]) { const p = JSON.parse(await fileText(files[FILE])); remote = await decrypt(p, c.pass); salt = p.salt; }
      }
      salt = salt || b64(crypto.getRandomValues(new Uint8Array(16)));
      const local = snapshot(), merged = remote ? merge(local, remote) : local;
      const changed = !same(merged, local);
      if (changed) { host.set(merged.data); wr(META, { t: merged.t, del: merged.del }); }

      // Fotos: subir las nuevas de aquí, bajar las nuevas de otros, borrar las de prendas que ya no existen.
      const fv = rd(FV, {}) || {}, out = {}, prendas = merged.data.prendas || [], vivas = new Set(prendas.filter(p => p.fv).map(p => p.id));
      let sube = 0, baja = 0, pendiente = false;
      for (const p of prendas) {
        if (!p.fv) continue;
        const remota = files[fname(p.id)], local = host.fotoGet(p.id);
        if (fv[p.id] === p.fv && local) {
          // La versión buena la tengo yo: súbela si en GitHub no está o es de otra versión.
          if (!remota || (c.subidas || {})[p.id] !== p.fv) {
            if (sube >= MAX_FOTOS) { pendiente = true; continue; }
            out[fname(p.id)] = { content: JSON.stringify(await encrypt({ id: p.id, fv: p.fv, u: await host.reducir(local) }, c.pass, salt)) };
            sube++;
          }
        } else if (remota) {
          if (baja >= MAX_FOTOS) { pendiente = true; continue; }
          try { const f = await decrypt(JSON.parse(await fileText(remota)), c.pass); if (f.fv === p.fv) { await host.fotoPut(p.id, f.u); fv[p.id] = p.fv; baja++; } } catch (e) {}
        }
      }
      for (const name of Object.keys(files)) { const m = name.match(/^f-(.+)\.enc$/); if (m && !vivas.has(m[1])) out[name] = null; }
      for (const pid of Object.keys(fv)) if (!vivas.has(pid)) { delete fv[pid]; host.fotoDel(pid); }
      wr(FV, fv);

      if (!remote || !same(merged, remote) || Object.keys(out).length) {
        out[FILE] = { content: JSON.stringify(await encrypt(merged, c.pass, salt)) };
        if (id) await gh(c.token, '/gists/' + id, { method: 'PATCH', body: JSON.stringify({ files: out }) });
        else {
          for (const k of Object.keys(out)) if (out[k] === null) delete out[k];
          id = (await gh(c.token, '/gists', { method: 'POST', body: JSON.stringify({ description: 'Datos cifrados', public: false, files: out }) })).id;
        }
        const subidas = cfg().subidas || {};
        for (const name of Object.keys(out)) { const m = name.match(/^f-(.+)\.enc$/); if (!m) continue; if (out[name]) subidas[m[1]] = (prendas.find(p => p.id === m[1]) || {}).fv; else delete subidas[m[1]]; }
        const c2 = cfg(); c2.subidas = subidas; setCfg(c2);
      }
      const c2 = cfg(); c2.gistId = id; c2.last = Date.now(); setCfg(c2);
      busy = false; onChange(changed || baja ? 'changed' : 'ok');
      if (pendiente) again = true;
    } catch (e) { msg = e.message; busy = false; onChange('error'); }
    if (again) { again = false; setTimeout(sync, 300); }
  }
  function schedule() { const c = cfg(); if (!c.token || !c.pass) return; clearTimeout(timer); timer = setTimeout(sync, 1500); }

  // Al guardar una foto nueva en este dispositivo.
  function fotoLocal(id, version) { const fv = rd(FV, {}) || {}; fv[id] = version; wr(FV, fv); }
  const fotoVersion = id => (rd(FV, {}) || {})[id];

  // ---- vincular: el mismo código que Mi Espacio y Cimientos (MD1.…) ----
  const b64url = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64url = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
  function parseCode(text) {
    const m = String(text || '').trim().match(/MD1\.([A-Za-z0-9_-]+)/); if (!m) return null;
    try { const o = JSON.parse(unb64url(m[1])); return o.t && o.k ? o : null; } catch (e) { return null; }
  }
  const code = () => { const c = cfg(); return 'MD1.' + b64url(JSON.stringify({ t: c.token, k: c.pass, g: '' })); };
  const fromOtra = () => { for (const k of [MD_CFG, 'cimientos.sync']) { const m = rd(k, null); if (m && m.token && m.pass) return m; } return null; };
  async function link(o) { setCfg({ token: o.token || o.t, pass: o.pass || o.k }); await sync(); if (msg) { const e = msg; setCfg({}); msg = ''; throw new Error(e); } }
  function off() { setCfg(null); }
  function init(h) { host = h; }

  return { init, touch, sync, schedule, merge, fotoLocal, fotoVersion, code, parseCode, fromOtra, link, off, status: () => ({ busy, msg, last: cfg().last, on: !!(cfg().token && cfg().pass) }), set onChange(f) { onChange = f; } };
})();
