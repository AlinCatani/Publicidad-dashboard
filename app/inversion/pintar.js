// Pintado del reporte «Presupuesto vs inversión» (tabla con el formato del Sheet + resumen + acumulado del año).
// Fuente única: este archivo lo usa el sitio (datos por /api/inversion) y el artefacto (armar_presupuesto.py
// cambia runSql por el conector de BigQuery de claude.ai). Sin datos escritos aquí: todo llega de BigQuery.
export function montar(raiz, opciones) {
const ANIO = "2026";
/* ---------- datos: el navegador manda { tipo, mes }; el servidor valida y arma el SQL (consultas.ts) ---------- */
async function runSql(tipo, mes, force) {
  const res = await fetch("/api/inversion", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tipo, mes, force: !!force }) });
  if (res.status === 401 || res.redirected) throw { code: "sesion" };
  const p = await res.json().catch(() => ({}));
  if (!res.ok) throw { code: p.code || "tool_error", message: p.error || res.statusText };
  return { rows: p.rows, at: new Date(p.at) };
}
/* ---------- cómo se clasifica cada fila de gasto en la sección / grupo / fila del presupuesto ---------- */
const norm = (s) => (s == null ? "" : String(s)).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const ALIAS = { // claves ya normalizadas → clave canónica (sirve para el presupuesto y para el gasto)
  metamiamiflorida: "florida", pruebaflorida: "florida", metanoreste: "noreste", metaoeste: "oeste",
  aguascalietnes: "aguascalientes", cdjuarez: "juarez", ciudadjuarez: "juarez", gdl: "guadalajara", mty: "monterrey", cun: "cancun", pue: "puebla",
  can: "cancun", mrd: "merida", maz: "mazatlan", qro: "queretaro", tij: "tijuana", tol: "toluca", mexico: "cdmx", chihuauha: "chihuahua",
  nacionalmujersoltera: "nacionalmujeres", mxdemandgen: "mxdgen", uscalifornia: "california", ustexas: "texas", californianorth: "california", californiasouth: "california",
  texasnorth: "texas", texassouth: "texas", googlemxn: "google",
};
const canon = (s) => { let k = norm(s); k = k.replace(/open$/, "").replace(/whatsapp$/, ""); return ALIAS[k] || k; };
const SECC = { fertilidad_mx: "FERTILIDAD MÉXICO", turismo: "Turismo", us_fertilidad: "US_Fertilidad", surrogate: "Surrogate Mexico", more: "MORE", donacion: "Donación", gestantes: "Gestantes" };
const ORDEN = ["fertilidad_mx", "turismo", "us_fertilidad", "surrogate", "more", "donacion", "gestantes"];
const ORDEN_GRUPOS = ["Google Nacionales", "Tik Tok", "Meta Nacionales", "Meta Locales", "Campañas temporales", "Campañas Engagement", "Meta Turismo", "Google Turismo", "Meta USA", "Google USA", "Google · California", "Google · Texas", "MORE", "Mujeres", "Mujeres · Encuestas", "Mujeres · Dona Vida", "Hombres", "Gestantes"];
const SUC = { cancun: "CAN", cdmx: "CDMX", juarez: "CD JUAREZ", chihuahua: "Chihuahua", guadalajara: "GDL", hermosillo: "Hermosillo", mazatlan: "MAZ", merida: "MRD", monterrey: "MTY", nacional: "NACIONAL", puebla: "PUE", queretaro: "QRO", tijuana: "TIJ", toluca: "TOL", vallarta: "VALLARTA", regional: "Regional" };
const bonito = (s) => String(s || "").replace(/_/g, " ").replace(/\s+/g, " ").trim();
function clasificar(r) {
  const c = r.cuenta, camp = r.campana || "", k = norm(camp);
  if (r.fuente === "don") {
    const land = norm(r.landing), msg = norm(r.mensaje), reg = canon(r.region) || "sinregion";
    if (land.startsWith("onboarding") || land.startsWith("estrella") || msg.startsWith("estrella") || msg === "gesmex" || msg === "edad" || msg === "onboarding" || msg === "agent")
      return { seccion: "gestantes", grupo: "Gestantes", clave: msg === "agent" ? "gestantesai" : "gestantes", etiqueta: msg === "agent" ? "GESTANTES AI" : "Gestantes" };
    const suc = SUC[reg] || bonito(r.region) || "Sin región";
    if (msg === "hombres") return { seccion: "donacion", grupo: "Hombres", clave: reg, etiqueta: suc };
    if (land.startsWith("encuestas")) return { seccion: "donacion", grupo: "Mujeres · Encuestas", clave: reg, etiqueta: suc };
    return { seccion: "donacion", grupo: "Mujeres · Dona Vida", clave: reg, etiqueta: suc };
  }
  if (c === "INGENES_US") {
    if (/^mx/.test(k)) return { seccion: "fertilidad_mx", grupo: "Google Nacionales", clave: canon(camp), etiqueta: camp };
    if (/^us/.test(k)) {
      const g = k.includes("california") ? "Google · California" : k.includes("texas") ? "Google · Texas" : "Google USA";
      return { seccion: "us_fertilidad", grupo: g, clave: canon(camp), etiqueta: camp };
    }
    return { seccion: "turismo", grupo: "Google Turismo", clave: canon(camp), etiqueta: camp };
  }
  if (c === "IVF MORE") return { seccion: "fertilidad_mx", grupo: "Campañas Engagement", clave: "youtube", etiqueta: "Youtube" };
  if (c === "MX_ENGAGEMENT" || c === "ENGAGEMENT") return { seccion: "fertilidad_mx", grupo: "Campañas Engagement", clave: "engagement", etiqueta: "Engagement" };
  if (c === "MX_LEAD" || c === "MX_MONTERREY" || c === "MX_GUADALAJARA") {
    if (k.includes("ovi")) return { seccion: "fertilidad_mx", grupo: "Campañas temporales", clave: "nacionalovi", etiqueta: "Nacional_Ovi" };
    if (k.includes("fertilidadorg") || k === "creadores") return { seccion: "fertilidad_mx", grupo: "Campañas temporales", clave: canon(camp), etiqueta: camp };
    if (k.includes("express")) return { seccion: "fertilidad_mx", grupo: "Meta Nacionales", clave: "nacionalexpress", etiqueta: "Nacional Express" };
    if (k.includes("shopping")) return { seccion: "fertilidad_mx", grupo: "Meta Nacionales", clave: "nacionalshopping", etiqueta: "Nacional Shopping" };
    if (k.includes("mujer")) return { seccion: "fertilidad_mx", grupo: "Meta Nacionales", clave: "nacionalmujeres", etiqueta: "Nacional Mujeres" };
    return { seccion: "fertilidad_mx", grupo: "Meta Nacionales", clave: canon(camp), etiqueta: bonito(camp) };
  }
  if (c === "MX_MEXICO") return { seccion: "fertilidad_mx", grupo: "Meta Locales", clave: canon(camp), etiqueta: bonito(camp.replace(/_OPEN$/i, "").replace(/\s*-\s*WhatsApp$/i, "")) };
  if (c === "TURISMO") return { seccion: "turismo", grupo: "Meta Turismo", clave: canon(camp), etiqueta: bonito(camp.replace(/^Prueba:\s*/i, "")) };
  if (c === "USA_MXN") { const e = k.includes("california") ? "California" : k.includes("texas") ? "Texas" : "USA"; return { seccion: "us_fertilidad", grupo: "Meta USA", clave: canon(e), etiqueta: e }; }
  return { seccion: "otros", grupo: c || "Otros", clave: canon(camp), etiqueta: bonito(camp) || c };
}
/* ---------- estado y utilidades ---------- */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const n = (v) => { const x = Number(v); return isFinite(x) ? x : 0; };
const mxn = (v) => "$" + Math.round(n(v)).toLocaleString("es-MX");
const pct = (v) => (isFinite(v) ? (v * 100).toFixed(2) + "%" : "—");
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const diasDe = (m) => new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0).getDate();
const nombreMes = (m) => MESES[Number(m.slice(5, 7)) - 1] + " " + m.slice(0, 4);
const fechaDe = (m, d) => `${m}-${String(d).padStart(2, "0")}`;
function hoyMx() { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
function ayerMx() { const d = new Date(hoyMx() + "T12:00:00"); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); }
/* Cortes como en el Sheet: cada domingo del mes y el último día. */
function cortesDe(m) {
  const dias = diasDe(m), out = [];
  for (let d = 1; d <= dias; d++) { const dow = new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, d).getDay(); if (dow === 0) out.push(d); }
  if (out[out.length - 1] !== dias) out.push(dias);
  return out;
}
const state = { diaExtra: null, mes: null, corte: 1, vista: location.hash === "#resumen" ? "resumen" : "tabla" };
const datos = { presupuesto: null, fechas: null, anio: null, mes: {}, en: null };
let cargando = false;
function setStatus(cls, html) { $("estado").className = "estado " + cls; $("estado-txt").innerHTML = html; }
function msgError(err) {
  const code = (err && err.code) || "upstream_error";
  const map = {
    sesion: "Tu sesión terminó. Recarga la página y vuelve a entrar.",
    server_not_connected: "Para ver datos, agrega el conector Google Cloud BigQuery en claude.ai → Configuración → Conectores.",
    selection_required: "Elige qué conexión de Google Cloud BigQuery usar en el aviso de esta página.",
    needs_reauth: "Reconecta Google Cloud BigQuery en claude.ai → Configuración → Conectores.",
    not_in_manifest: "El acceso a BigQuery está desactivado para esta página; actívalo en el menú de permisos del artefacto.",
    blocked_by_policy: "La política de tu organización bloquea esta consulta a BigQuery.",
    approval_required: "Esta consulta a BigQuery necesita tu aprobación; dale a «Actualizar» y acepta el aviso.",
    tool_error: `BigQuery rechazó la consulta (${esc((err && err.message || "").slice(0, 160))}). Revisa que tu cuenta tenga acceso al proyecto de BigQuery.`,
    timeout: "La consulta tardó más de un minuto; dale a «Actualizar» para intentar de nuevo.",
    empty: "BigQuery no devolvió filas.",
  };
  return map[code] || `No se pudo consultar BigQuery (${esc(code)}). Dale a «Actualizar» para reintentar.`;
}
/* ---------- carga ---------- */
async function cargarBase(force) {
  const [p, f, a] = await Promise.all([runSql("presupuesto", null, force), runSql("fechas", null, force), runSql("anio", null, force)]);
  datos.presupuesto = p.rows; datos.anio = a.rows; datos.en = p.at;
  datos.fechas = {}; f.rows.forEach(r => datos.fechas[r.fuente] = r.hasta);
}
async function cargarMes(m, force) { const r = await runSql("mes", m, force); datos.mes[m] = r.rows; }
async function refresh(force) {
  if (cargando) return; cargando = true;
  setStatus("carga", "Consultando BigQuery…");
  try {
    if (force) datos.mes = {}; // «Actualizar» recarga todo: presupuesto, fechas, año y el mes en pantalla; los otros meses se vuelven a pedir al abrirlos
    if (!datos.presupuesto || force) await cargarBase(force);
    if (!state.mes) iniciarMeses();
    if (!datos.mes[state.mes] || force) await cargarMes(state.mes, force);
    pintar();
  } catch (err) {
    console.error(err); window.__err = String(err && err.stack || (err && err.code) || err);
    setStatus("err", msgError(err));
  } finally { cargando = false; }
}
function iniciarMeses() {
  const lista = [...new Set(datos.presupuesto.map(r => r.mes))].filter(m => m.startsWith(ANIO)).sort();
  const actual = hoyMx().slice(0, 7);
  $("mes").innerHTML = lista.map(m => `<option value="${m}">${nombreMes(m)}</option>`).join("");
  state.mes = lista.includes(actual) ? actual : lista[lista.length - 1];
  $("mes").value = state.mes;
  ajustarCorte(true);
}
function ajustarCorte(porDefecto) {
  const dias = diasDe(state.mes), input = $("corte");
  input.max = dias;
  if (porDefecto) {
    const ayer = ayerMx();
    state.corte = ayer.slice(0, 7) === state.mes ? Number(ayer.slice(8, 10)) : (ayer > state.mes + "-31" ? dias : 1);
  }
  state.corte = Math.min(Math.max(1, state.corte), dias); input.value = state.corte;
  $("corte-txt").textContent = `al ${state.corte} de ${MESES[Number(state.mes.slice(5, 7)) - 1]} · ${pct(state.corte / dias)} del mes`;
}

/* ---------- cálculo: presupuesto + gasto acumulado por corte ---------- */
function presupuestosDe(mes) {
  const sec = {}, grupos = {}, filas = {};
  (datos.presupuesto || []).filter(r => r.mes === mes).forEach(r => {
    const dia = r.presupuesto_dia == null ? null : n(r.presupuesto_dia), mesv = r.presupuesto_mes == null ? null : n(r.presupuesto_mes);
    if (r.nivel === "seccion") sec[r.seccion] = { dia, mes: mesv, nota: r.nota, etiqueta: r.etiqueta };
    else if (r.nivel === "grupo") grupos[r.seccion + "|" + r.grupo] = { dia, mes: mesv };
    else { const k = r.seccion + "|" + r.grupo + "|" + canon(r.etiqueta); const prev = filas[k];
      filas[k] = { dia: (prev ? prev.dia || 0 : 0) + (dia || 0), mes: (prev ? prev.mes || 0 : 0) + (mesv || 0), etiqueta: prev ? prev.etiqueta : r.etiqueta, nota: r.nota }; }
  });
  return { sec, grupos, filas };
}
function calcular(mes) {
  const dias = diasDe(mes), cortes = cortesDe(mes).slice(), P = presupuestosDe(mes), filasMes = datos.mes[mes] || [];
  if (state.diaExtra && state.diaExtra >= 1 && state.diaExtra <= dias && !cortes.includes(state.diaExtra)) { cortes.push(state.diaExtra); cortes.sort((a, b) => a - b); }
  const hasta = { ads: datos.fechas.ads || "", don: datos.fechas.don || "" };
  const ceros = () => cortes.map(() => 0);
  const secciones = {};
  const asegurar = (s) => secciones[s] || (secciones[s] = { seccion: s, nombre: SECC[s] || s, grupos: {}, acum: ceros(), dia: 0 });
  const grupoDe = (S, g) => S.grupos[g] || (S.grupos[g] = { nombre: g, filas: {}, acum: ceros(), dia: 0 });
  Object.keys(P.sec).forEach(asegurar);
  Object.keys(P.grupos).forEach(k => { const [s, g] = k.split("|"); grupoDe(asegurar(s), g).pres = P.grupos[k]; });
  Object.keys(P.filas).forEach(k => { const [s, g, c] = k.split("|"); grupoDe(asegurar(s), g).filas[c] = { etiqueta: P.filas[k].etiqueta, pres: P.filas[k], acum: ceros(), dia: 0 }; });
  filasMes.forEach(r => {
    const tope = r.fuente === "don" ? hasta.don : hasta.ads;
    if (r.dia > tope) return;
    const c = clasificar(r); const S = asegurar(c.seccion); const G = grupoDe(S, c.grupo);
    const F = G.filas[c.clave] || (G.filas[c.clave] = { etiqueta: c.etiqueta, pres: null, acum: ceros(), dia: 0 });
    const d = Number(r.dia.slice(8, 10)), costo = n(r.costo);
    cortes.forEach((cd, i) => { if (d <= cd) { F.acum[i] += costo; G.acum[i] += costo; S.acum[i] += costo; } });
    if (d === state.diaExtra) { F.dia += costo; G.dia += costo; S.dia += costo; }
  });
  Object.values(secciones).forEach(S => {
    // «Google USA» (TOTAL Google MXN en el Sheet) es padre de «Google · California» y «Google · Texas»
    [["Google USA", ["Google · California", "Google · Texas"]], ["Mujeres", ["Mujeres · Encuestas", "Mujeres · Dona Vida"]]].forEach(([pg, hijos]) => {
      const padre = S.grupos[pg]; if (!padre) return;
      hijos.forEach(g => { const H = S.grupos[g]; if (H) { H.acum.forEach((v, i) => padre.acum[i] += v); padre.dia += H.dia; } });
    });
    S.fuente = (S.seccion === "donacion" || S.seccion === "gestantes") ? "don" : "ads";
    S.hasta = hasta[S.fuente];
    const p = P.sec[S.seccion];
    S.presMes = p && p.mes != null ? p.mes : null; S.presDia = p && p.dia != null ? p.dia : (S.presMes != null ? S.presMes / dias : null);
    S.nota = p && p.nota || ""; S.etiquetaPres = p && p.etiqueta || "Total";
    Object.values(S.grupos).forEach(G => {
      G.presMes = G.pres && G.pres.mes != null ? G.pres.mes : Object.values(G.filas).reduce((b, F) => b + (F.pres ? (F.pres.mes || (F.pres.dia || 0) * dias) : 0), 0);
      G.presDia = G.pres && G.pres.dia != null ? G.pres.dia : Object.values(G.filas).reduce((b, F) => b + (F.pres && F.pres.dia != null ? F.pres.dia : 0), 0);
      Object.values(G.filas).forEach(F => { F.presMes = F.pres ? (F.pres.mes || (F.pres.dia || 0) * dias) : null; F.presDia = F.pres && F.pres.dia != null ? F.pres.dia : null; });
    });
  });
  return { secciones, dias, cortes };
}
/* ---------- pestañas ---------- */
function pintar() { mostrarVista(); pintarTabla(); pintarResumen(); } // se pintan las dos pestañas para que ambas queden al día
function mostrarVista() {
  document.querySelectorAll(".pestana").forEach(b => b.setAttribute("aria-selected", String(b.dataset.vista === state.vista)));
  $("vista-tabla").hidden = state.vista !== "tabla"; $("vista-resumen").hidden = state.vista !== "resumen"; $("ctl-corte").hidden = state.vista !== "resumen";
}
document.querySelectorAll(".pestana").forEach(b => b.addEventListener("click", () => { state.vista = b.dataset.vista; try { history.replaceState(null, "", "#" + state.vista); } catch (e) {} if (datos.mes[state.mes]) pintar(); else mostrarVista(); }));
/* ---------- plegado por sección (clic en la banda); se recuerda en este navegador ---------- */
const plegadas = new Set();
try { JSON.parse(localStorage.getItem("pv.plegadas") || "[]").forEach(x => plegadas.add(x)); } catch (e) {}
function guardarPlegadas() { try { localStorage.setItem("pv.plegadas", JSON.stringify([...plegadas])); } catch (e) {} }
function aplicarPlegado(sec) {
  const p = plegadas.has(sec);
  document.querySelectorAll(`#hoja tr.detalle[data-sec="${sec}"]`).forEach(tr => tr.classList.toggle("oculta", p));
  const b = document.querySelector(`#hoja tr.banda[data-sec="${sec}"]`); if (b) b.classList.toggle("plegada", p);
}
const plegados = new Set(); // grupos (medios) plegados: «Google Nacionales», «Meta Locales»…
try { JSON.parse(localStorage.getItem("pv.plegados") || "[]").forEach(x => plegados.add(x)); } catch (e) {}
function aplicarGrupo(gk) {
  const p = plegados.has(gk);
  document.querySelectorAll(`#hoja tr.fila[data-grupo="${CSS.escape(gk)}"]`).forEach(tr => tr.classList.toggle("oculta-g", p));
  const g = document.querySelector(`#hoja tr.grupo[data-grupo="${CSS.escape(gk)}"]`); if (g) g.classList.toggle("plegado", p);
}
$("hoja").addEventListener("click", (e) => {
  const grupo = e.target.closest("tr.grupo");
  if (grupo && e.target.closest("td") === grupo.firstElementChild) {
    const gk = grupo.dataset.grupo; plegados.has(gk) ? plegados.delete(gk) : plegados.add(gk);
    aplicarGrupo(gk); try { localStorage.setItem("pv.plegados", JSON.stringify([...plegados])); } catch (e2) {}
    return;
  }
  const banda = e.target.closest("tr.banda"); if (!banda) return;
  const sec = banda.dataset.sec; plegadas.has(sec) ? plegadas.delete(sec) : plegadas.add(sec);
  aplicarPlegado(sec); guardarPlegadas();
});
function ayerDe(mes) { const a = ayerMx(); return a.slice(0, 7) === mes ? Number(a.slice(8, 10)) : (a > mes + "-31" ? diasDe(mes) : 1); }
function pintarDia() { const on = state.diaExtra != null; $("dia-ayer").setAttribute("aria-pressed", String(on)); $("dia-ayer").textContent = on ? `Gasto del día ${state.diaExtra}` : "Ayer"; $("dia-menos").hidden = !on; $("dia-mas").hidden = !on; }
$("dia-ayer").addEventListener("click", () => { state.diaExtra = state.diaExtra == null ? ayerDe(state.mes) : null; pintarDia(); if (datos.mes[state.mes]) pintarTabla(); });
$("dia-menos").addEventListener("click", () => { if (state.diaExtra > 1) { state.diaExtra--; pintarDia(); pintarTabla(); } });
$("dia-mas").addEventListener("click", () => { if (state.diaExtra < diasDe(state.mes)) { state.diaExtra++; pintarDia(); pintarTabla(); } });
$("plegar-todo").addEventListener("click", () => { document.querySelectorAll("#hoja tr.banda").forEach(b => plegadas.add(b.dataset.sec)); [...plegadas].forEach(aplicarPlegado); guardarPlegadas(); });
$("desplegar-todo").addEventListener("click", () => {
  const todas = [...plegadas]; plegadas.clear(); todas.forEach(aplicarPlegado); guardarPlegadas();
  const grupos = [...plegados]; plegados.clear(); grupos.forEach(aplicarGrupo); try { localStorage.setItem("pv.plegados", "[]"); } catch (e) {}
});
/* ---------- pintado 1: una tabla con el formato del Sheet ---------- */
function pintarTabla() {
  const R = calcular(state.mes), m = state.mes, dias = R.dias, cortes = R.cortes, nc = cortes.length;
  const extra = state.diaExtra;
  const mesNombre = MESES[Number(m.slice(5, 7)) - 1];
  const ordenSec = ORDEN.filter(s => R.secciones[s]).concat(Object.keys(R.secciones).filter(s => !ORDEN.includes(s)));
  // MORE y Surrogate llevan tiempo apagadas (Alin, 2026-10-20): solo se muestran si tuvieron inversión en el mes.
  const SOLO_CON_GASTO = ["more", "surrogate"];
  const secs = ordenSec.map(s => R.secciones[s]).filter(S => SOLO_CON_GASTO.includes(S.seccion) ? S.acum.some(x => x > 0) : (S.presMes || S.acum.some(x => x > 0)));
  const colspan = 3 + nc;
  // Columna «día»: gasto de ese día solamente, comparado con la inversión por día autorizada (verde ±5 %, ámbar abajo, rojo pasado).
  const iExtra = cortes.indexOf(extra);
  const celda = (x, i, conDatos) => {
    if (!conDatos) return "<td></td>";
    if (i !== iExtra) return `<td>${mxn(x.acum[i])}</td>`;
    const pd = x.presDia || 0; const cls = !pd ? (x.dia > 0 ? "pasado" : "") : x.dia > pd * 1.05 ? "pasado" : x.dia < pd * 0.95 ? "abajo" : "bien";
    const d = x.dia - pd;
    const tip = !pd ? (x.dia > 0 ? "sin inversión por día autorizada: todo es exceso" : "sin inversión por día autorizada")
      : d > 0 ? `se pasó ${mxn(d)} (autorizado ${mxn(pd)})` : d < 0 ? `gastó ${mxn(-d)} menos (autorizado ${mxn(pd)})` : `exacto al autorizado (${mxn(pd)})`;
    return `<td class="dia ${cls}" title="${tip}">${mxn(x.dia)}</td>`;
  };
  let h = "";
  secs.forEach((S, idx) => {
    const conDatos = cortes.map(cd => fechaDe(m, cd) <= S.hasta);
    if (idx) h += `<tr class="sep"><td colspan="${colspan}"></td></tr>`;
    const plegada = plegadas.has(S.seccion), det = `class="detalle${plegada ? " oculta" : ""}" data-sec="${S.seccion}"`;
    const detc = (c) => det.replace('class="', `class="${c} `);
    h += `<tr class="banda ${S.seccion}${plegada ? " plegada" : ""}" data-sec="${S.seccion}" title="Clic para plegar o desplegar"><td colspan="${colspan}">${esc(S.nombre)}</td></tr>`;
    h += `<tr class="pres"><td>Presupuesto autorizado</td><td>${S.presDia != null ? mxn(S.presDia) : "—"}</td><td>${S.presMes != null ? mxn(S.presMes) : "—"}</td><td class="nota" colspan="${nc}">${esc(S.nota)}</td></tr>`;
    const grupos = Object.values(S.grupos).filter(G => G.presMes > 0 || G.acum.some(x => x > 0))
      .sort((a, b) => (ORDEN_GRUPOS.indexOf(a.nombre) + 1 || 99) - (ORDEN_GRUPOS.indexOf(b.nombre) + 1 || 99) || a.nombre.localeCompare(b.nombre, "es"));
    grupos.forEach(G => {
      const gk = S.seccion + "|" + G.nombre, gp = plegados.has(gk);
      h += `<tr ${detc("grupo" + (gp ? " plegado" : ""))} data-grupo="${esc(gk)}"><td>${esc(G.nombre)}</td><td>${G.presDia ? mxn(G.presDia) : ""}</td><td>${G.presMes ? mxn(G.presMes) : ""}</td>${G.acum.map((v, i) => celda(G, i, conDatos[i])).join("")}</tr>`;
      Object.values(G.filas).filter(F => (F.presMes || 0) > 0 || (F.presDia || 0) > 0 || F.acum.some(x => x > 0))
        .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, "es", { sensitivity: "base" }))
        .forEach(F => { h += `<tr ${detc("fila" + (gp ? " oculta-g" : ""))} data-grupo="${esc(gk)}"><td>${esc(F.etiqueta)}</td><td class="${F.pres ? "" : "sinpres"}">${F.presDia != null ? mxn(F.presDia) : (F.pres ? "" : "sin presupuesto")}</td><td>${F.presMes != null && F.presMes ? mxn(F.presMes) : ""}</td>${F.acum.map((v, i) => celda(F, i, conDatos[i])).join("")}</tr>`; });
    });
    const base = S.presMes || 0;
    h += `<tr class="res inv"><td>Inversión</td><td></td><td></td>${S.acum.map((v, i) => celda(S, i, conDatos[i])).join("")}</tr>`;
    // Las filas «Presupuesto restante» e «Inversión por día» se quitaron a pedido de Alin (2026-10-20): sobraban.
    h += `<tr class="res"><td>Porcentaje de inversión</td><td></td><td></td>${S.acum.map((v, i) => { if (!conDatos[i] || !base) return "<td></td>";
      if (i === iExtra) { const pd = S.presDia || 0; if (!pd) return "<td></td>"; const r = S.dia / pd; const cls = r > 1.05 ? "pasado" : r < 0.95 ? "abajo" : "bien"; return `<td class="${cls}" title="gasto del día entre la inversión por día autorizada">${pct(r)}</td>`; }
      const r = v / base, esp = cortes[i] / dias; const cls = r > esp * 1.05 ? "pasado" : r < esp * 0.95 ? "abajo" : "bien"; return `<td class="${cls}">${pct(r)}</td>`; }).join("")}</tr>`;
  });
  const hayDatos = cortes.map(cd => secs.some(S => fechaDe(m, cd) <= S.hasta));
  const thead = `<thead><tr><th>Campaña · ${dias} días</th><th>Inversión por día</th><th>Inversión por mes</th>${cortes.map((cd, i) => `<th class="${cd === extra ? "extra" : hayDatos[i] ? "" : "futuro"}" title="${hayDatos[i] ? "gasto acumulado al " + cd : "aún sin datos"}">${cd === extra ? "▸ " : ""}${cd} ${mesNombre}${cd === extra ? "<br><small>solo ese día</small>" : ""}</th>`).join("")}</tr>
<tr><th>% del mes transcurrido</th><th></th><th></th>${cortes.map(cd => `<th>${cd === extra ? "vs. inversión por día" : pct(cd / dias)}</th>`).join("")}</tr></thead>`;
  $("hoja").innerHTML = h ? `<table>${thead}<tbody>${h}</tbody></table>` : `<div class="vacio">No hay presupuesto ni gasto para ${nombreMes(m)}.</div>`;
  const f = datos.fechas || {};
  setStatus("", `<b>Datos al día:</b> anuncios Meta y Google hasta el <b>${esc(fechaCorta(f.ads))}</b> · donación y gestantes hasta el <b>${esc(fechaCorta(f.don))}</b> · consultado ${datos.en ? datos.en.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : ""}`);
  $("pie").textContent = "Cada columna de corte trae el gasto acumulado del 1 a ese día (domingos y fin de mes, como en el Sheet). La columna dorada del botón «Ayer» trae solo el gasto de ese día, comparado con la inversión por día autorizada de cada campaña. Un corte sin datos todavía se ve en gris. «Porcentaje de inversión» se compara con el porcentaje del mes transcurrido: verde en ritmo (±5 %), ámbar por debajo, rojo pasado. El presupuesto es el autorizado de cada mes en BigQuery; el gasto, la tabla de anuncios de Meta y Google más la cuenta de donación.";
}
function fechaCorta(s) { if (!s) return "—"; const d = s.slice(0, 10); return `${Number(d.slice(8, 10))} de ${MESES[Number(d.slice(5, 7)) - 1]}`; }
/* ---------- pintado 2: resumen con tarjetas y acumulado del año (v1) ---------- */
function estadoDe(gastado, esperado) {
  if (!esperado) return gastado > 0 ? "pasado" : "sin";
  const r = gastado / esperado;
  return r > 1.05 ? "pasado" : r < 0.95 ? "abajo" : "bien";
}
const ESTADO_TXT = { bien: "en ritmo", abajo: "por debajo", pasado: "pasado", sin: "sin presupuesto", grupo: "va en el grupo" };
function presupuestosDeV1(mes) {
  const sec = {}, grupos = {}, filas = {};
  (datos.presupuesto || []).filter(r => r.mes === mes).forEach(r => {
    const dia = r.presupuesto_dia == null ? null : n(r.presupuesto_dia), mesv = r.presupuesto_mes == null ? null : n(r.presupuesto_mes);
    if (r.nivel === "seccion") sec[r.seccion] = { dia, mes: mesv, nota: r.nota };
    else if (r.nivel === "grupo") grupos[r.seccion + "|" + r.grupo] = { dia, mes: mesv, etiqueta: r.etiqueta };
    else { const k = r.seccion + "|" + r.grupo + "|" + canon(r.etiqueta); const prev = filas[k];
      filas[k] = { dia: (prev ? prev.dia || 0 : 0) + (dia || 0), mes: (prev ? prev.mes || 0 : 0) + (mesv || 0), etiqueta: r.etiqueta, nota: r.nota }; }
  });
  return { sec, grupos, filas };
}
function calcularMes(mes, corte) {
  const dias = diasDe(mes), P = presupuestosDeV1(mes), filasMes = datos.mes[mes] || [];
  const hastaAds = datos.fechas.ads || "", hastaDon = datos.fechas.don || "";
  const corteFecha = `${mes}-${String(corte).padStart(2, "0")}`;
  const gasto = {}, ultimo = {};
  filasMes.forEach(r => {
    const tope = r.fuente === "don" ? hastaDon : hastaAds;
    if (r.dia > corteFecha || r.dia > tope) return;
    const c = clasificar(r); const k = c.seccion + "|" + c.grupo + "|" + c.clave;
    if (!gasto[k]) gasto[k] = { ...c, costo: 0 }; gasto[k].costo += n(r.costo);
    if (!ultimo[c.seccion] || r.dia > ultimo[c.seccion]) ultimo[c.seccion] = r.dia;
  });
  const secciones = {};
  const asegurar = (s) => secciones[s] || (secciones[s] = { seccion: s, nombre: SECC[s] || s, grupos: {}, gastado: 0 });
  Object.keys(P.sec).forEach(asegurar);
  Object.keys(P.filas).forEach(k => { const [s, g, c] = k.split("|"); const S = asegurar(s); const G = S.grupos[g] || (S.grupos[g] = { nombre: g, filas: {}, gastado: 0 }); G.filas[c] = { etiqueta: P.filas[k].etiqueta, pres: P.filas[k], gastado: 0 }; });
  Object.keys(P.grupos).forEach(k => { const [s, g] = k.split("|"); const S = asegurar(s); S.grupos[g] || (S.grupos[g] = { nombre: g, filas: {}, gastado: 0 }); S.grupos[g].pres = P.grupos[k]; });
  Object.values(gasto).forEach(x => { const S = asegurar(x.seccion); const G = S.grupos[x.grupo] || (S.grupos[x.grupo] = { nombre: x.grupo, filas: {}, gastado: 0 });
    const F = G.filas[x.clave] || (G.filas[x.clave] = { etiqueta: x.etiqueta, pres: null, gastado: 0 }); F.gastado += x.costo; G.gastado += x.costo; S.gastado += x.costo; });
  Object.values(secciones).forEach(S => {
    const fuente = (S.seccion === "donacion" || S.seccion === "gestantes") ? "don" : "ads";
    const tope = fuente === "don" ? hastaDon : hastaAds;
    S.corteEfectivo = tope && tope < corteFecha ? tope : corteFecha;
    S.diasCorte = Number(S.corteEfectivo.slice(8, 10)); S.dias = dias; S.fuente = fuente; S.recortado = S.corteEfectivo !== corteFecha;
    const p = P.sec[S.seccion];
    S.presMes = p && p.mes != null ? p.mes : Object.values(S.grupos).reduce((a, G) => a + (G.pres && G.pres.mes != null ? G.pres.mes : Object.values(G.filas).reduce((b, F) => b + (F.pres ? (F.pres.mes || (F.pres.dia || 0) * dias) : 0), 0)), 0);
    S.presDia = p && p.dia != null ? p.dia : S.presMes / dias;
    S.nota = p && p.nota || "";
    S.esperado = S.presMes * S.diasCorte / dias;
    S.estado = estadoDe(S.gastado, S.esperado);
    S.restante = S.presMes - S.gastado; S.diasRestan = dias - S.diasCorte;
    S.ritmo = S.diasRestan > 0 ? S.restante / S.diasRestan : null;
    S.proyeccion = S.diasCorte > 0 ? S.gastado / S.diasCorte * dias : 0;
    Object.values(S.grupos).forEach(G => {
      G.presMes = G.pres && G.pres.mes != null ? G.pres.mes : Object.values(G.filas).reduce((b, F) => b + (F.pres ? (F.pres.mes || (F.pres.dia || 0) * dias) : 0), 0);
      G.presDia = G.pres && G.pres.dia != null ? G.pres.dia : G.presMes / dias;
      G.esperado = G.presMes * S.diasCorte / dias; G.estado = estadoDe(G.gastado, G.esperado);
      Object.values(G.filas).forEach(F => { F.presMes = F.pres ? (F.pres.mes || (F.pres.dia || 0) * dias) : 0; F.presDia = F.pres ? (F.pres.dia != null ? F.pres.dia : F.presMes / dias) : 0;
        F.esperado = F.presMes * S.diasCorte / dias;
        // Sin presupuesto propio pero dentro de un grupo que sí lo tiene (Engagement, Youtube): el ritmo se juzga en el grupo.
        F.estado = !F.presMes && G.pres && G.presMes > 0 ? "grupo" : estadoDe(F.gastado, F.esperado); });
    });
  });
  return { secciones, dias, corteFecha };
}
function calcularAnio() {
  const meses = {}; const hoy = hoyMx().slice(0, 7);
  (datos.anio || []).forEach(r => { const c = clasificar(r); const M = meses[r.mes] || (meses[r.mes] = { gasto: {}, pres: {} }); M.gasto[c.seccion] = (M.gasto[c.seccion] || 0) + n(r.costo); });
  (datos.presupuesto || []).filter(r => r.nivel === "seccion").forEach(r => { const M = meses[r.mes] || (meses[r.mes] = { gasto: {}, pres: {} }); M.pres[r.seccion] = n(r.presupuesto_mes); });
  const lista = Object.keys(meses).filter(m => m.startsWith(ANIO)).sort();
  return { lista, meses, hoy };
}
function pintarResumen() {
  const R = calcularMes(state.mes, state.corte);
  const secs = ORDEN.filter(s => R.secciones[s] && (["more", "surrogate"].includes(s) ? R.secciones[s].gastado > 0 : (R.secciones[s].presMes > 0 || R.secciones[s].gastado > 0))).map(s => R.secciones[s]);
  Object.keys(R.secciones).filter(s => !ORDEN.includes(s)).forEach(s => secs.push(R.secciones[s]));
  const tot = secs.reduce((a, S) => ({ pres: a.pres + S.presMes, gasto: a.gasto + S.gastado, esp: a.esp + S.esperado }), { pres: 0, gasto: 0, esp: 0 });
  const estTot = estadoDe(tot.gasto, tot.esp);
  $("kpis-mes").innerHTML = [
    kpi("Presupuesto del mes", mxn(tot.pres), nombreMes(state.mes)),
    kpi("Gastado al corte", mxn(tot.gasto), `${pct(tot.pres ? tot.gasto / tot.pres : NaN)} del presupuesto`),
    kpi("Deberías llevar gastado", mxn(tot.esp), "según los días con datos de cada fuente"),
    kpi(tot.gasto >= tot.esp ? "Pasado por" : "Por debajo en", mxn(Math.abs(tot.gasto - tot.esp)), `<span class="chip ${estTot}">${ESTADO_TXT[estTot]}</span>`),
    kpi("Proyección al cierre", mxn(secs.reduce((a, S) => a + S.proyeccion, 0)), "si sigue el ritmo actual"),
  ].join("");
  $("secciones").innerHTML = secs.length ? tablaResultados(secs, tot, estTot, R) : `<div class="vacio">No hay presupuesto ni gasto para ${nombreMes(state.mes)}.</div>`;
  pintarAnio();
  const f = datos.fechas || {};
  if (false) setStatus("", `<b>Datos al día:</b> anuncios Meta y Google hasta el <b>${esc(fechaCorta(f.ads))}</b> · donación y gestantes hasta el <b>${esc(fechaCorta(f.don))}</b> · consultado ${datos.en ? datos.en.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : ""}`);
}
function fechaCorta(s) { if (!s) return "—"; const d = s.slice(0, 10); return `${Number(d.slice(8, 10))} de ${MESES[Number(d.slice(5, 7)) - 1]}`; }
function kpi(et, v, s) { return `<div class="kpi"><div class="et">${et}</div><div class="v num">${v}</div><div class="s">${s}</div></div>`; }
function barra(gastado, pres, esperado, estado) {
  if (!pres) return `<div class="barra"><div class="lleno ${estado}" style="width:${gastado > 0 ? 100 : 0}%"></div></div>`;
  const w = Math.min(100, gastado / pres * 100), m = Math.min(100, esperado / pres * 100);
  return `<div class="barra"><div class="lleno ${estado}" style="width:${w.toFixed(1)}%"></div><div class="marca" style="left:${m.toFixed(1)}%"></div></div>`;
}
/* Tarjeta única de resultados: una fila por servicio y el total (pedido de Alin, 2026-10-20). */
function tablaResultados(secs, tot, estTot, R) {
  const fila = (S) => { const dif = S.gastado - S.esperado; return `<tr><td>${esc(S.nombre)}${S.recortado ? ` <span class="tenue">datos al ${S.diasCorte}</span>` : ""}</td><td class="num">${mxn(S.presMes)}</td><td class="num">${mxn(S.gastado)}</td><td class="num">${mxn(S.esperado)}</td><td class="num ${dif >= 0 ? (S.estado === "pasado" ? "neg" : "") : (S.estado === "abajo" ? "amb" : "")}">${dif >= 0 ? "+" : "−"}${mxn(Math.abs(dif))}</td><td class="num">${pct(S.presMes ? S.gastado / S.presMes : NaN)}</td><td class="num">${pct(S.diasCorte / S.dias)}</td><td class="num">${S.ritmo == null ? "—" : mxn(S.ritmo)}<span class="ln">autorizado ${mxn(S.presDia)}</span></td><td class="num">${mxn(S.proyeccion)}</td><td><span class="chip ${S.estado}">${ESTADO_TXT[S.estado]}</span></td></tr>`; };
  const difT = tot.gasto - tot.esp, proy = secs.reduce((a, S) => a + S.proyeccion, 0);
  const total = `<tr class="total"><td>Total</td><td class="num">${mxn(tot.pres)}</td><td class="num">${mxn(tot.gasto)}</td><td class="num">${mxn(tot.esp)}</td><td class="num">${difT >= 0 ? "+" : "−"}${mxn(Math.abs(difT))}</td><td class="num">${pct(tot.pres ? tot.gasto / tot.pres : NaN)}</td><td class="num">${pct(state.corte / R.dias)}</td><td class="num">—</td><td class="num">${mxn(proy)}</td><td><span class="chip ${estTot}">${ESTADO_TXT[estTot]}</span></td></tr>`;
  return `<article class="sec ancha resultados"><div class="cuerpo"><h3>Resultados de ${esc(nombreMes(state.mes))}</h3>
    <div class="tabla"><table><thead><tr><th>Servicio</th><th>Presupuesto autorizado</th><th>Gastado al corte</th><th>Deberías llevar gastado</th><th>Gastado − deberías</th><th>% gastado</th><th>% del mes</th><th>Ritmo necesario / día</th><th>Proyección al cierre</th><th>Estado</th></tr></thead>
    <tbody>${secs.map(fila).join("")}${total}</tbody></table></div>
    <p class="nota">«Deberías llevar gastado» = presupuesto del mes × días transcurridos ÷ días del mes (al 18 de octubre, 18 ÷ 31 = 58 % del presupuesto). «Gastado − deberías»: positivo (rojo) vas pasado, negativo (ámbar) vas por debajo. Ritmo necesario = lo que falta entre los días que quedan. El desglose por campaña está en la pestaña «Tabla».</p></div></article>`;
}
function pintarSeccion(S) {
  const dif = S.gastado - S.esperado;
  const ritmo = S.ritmo == null ? "" : `Para cerrar el mes exacto hacen falta <b class="num">${mxn(S.ritmo)}</b> al día en los ${S.diasRestan} días que quedan (autorizado: ${mxn(S.presDia)} al día).`;
  const corte = S.recortado ? `<span class="tenue">datos solo hasta el ${fechaCorta(S.corteEfectivo)}</span>` : "";
  // Grupos y filas sin presupuesto ni gasto no aportan nada: se ocultan (Tik Tok en cero, campañas que ya no corren).
  const grupos = Object.values(S.grupos).filter(G => G.presMes > 0 || G.gastado > 0).sort((a, b) => (b.presMes || b.gastado) - (a.presMes || a.gastado));
  const filasHtml = grupos.map(G => {
    const filas = Object.values(G.filas).filter(F => F.presMes > 0 || F.gastado > 0).sort((a, b) => (b.presMes || b.gastado) - (a.presMes || a.gastado));
    const fg = `<tr class="grupo"><td>${esc(G.nombre)}</td><td class="num">${G.presDia ? mxn(G.presDia) : "—"}</td><td class="num">${G.presMes ? mxn(G.presMes) : "—"}</td><td class="num">${mxn(G.esperado)}</td><td class="num">${mxn(G.gastado)}${mini(G)}</td><td class="num">${difTxt(G)}</td><td><span class="chip ${G.estado}">${ESTADO_TXT[G.estado]}</span></td></tr>`;
    return fg + filas.map(F => `<tr class="fila"><td>${esc(F.etiqueta)}${F.pres && F.pres.nota ? ` <span class="tenue">${esc(F.pres.nota)}</span>` : ""}</td><td class="num">${F.presDia ? mxn(F.presDia) : "—"}</td><td class="num">${F.presMes ? mxn(F.presMes) : "—"}</td><td class="num">${F.presMes ? mxn(F.esperado) : "—"}</td><td class="num">${mxn(F.gastado)}${mini(F)}</td><td class="num">${F.presMes ? difTxt(F) : "—"}</td><td><span class="chip ${F.estado}">${ESTADO_TXT[F.estado]}</span></td></tr>`).join("");
  }).join("");
  return `<article class="sec ${S.seccion === "fertilidad_mx" ? "ancha" : ""}"><div class="cuerpo">
    <div class="titulo"><h3>${esc(S.nombre)}</h3><span class="chip ${S.estado}">${ESTADO_TXT[S.estado]}</span></div>
    <div class="cifras">
      <div><div class="et">Presupuesto autorizado</div><div class="v num">${mxn(S.presMes)}</div></div>
      <div><div class="et">Gastado al ${S.diasCorte}</div><div class="v num">${mxn(S.gastado)}</div></div>
      <div><div class="et">Esperado al corte</div><div class="v num">${mxn(S.esperado)}</div></div>
      <div><div class="et">${dif >= 0 ? "Pasado por" : "Por debajo en"}</div><div class="v num" style="color:${dif >= 0 ? (S.estado === "pasado" ? "var(--pasado)" : "var(--ink)") : (S.estado === "abajo" ? "var(--abajo)" : "var(--ink)")}">${mxn(Math.abs(dif))}</div></div>
    </div>
    ${barra(S.gastado, S.presMes, S.esperado, S.estado)}
    <div class="leyenda"><span>${pct(S.presMes ? S.gastado / S.presMes : NaN)} gastado</span><span>${pct(S.diasCorte / S.dias)} del mes</span></div>
    <div class="ritmo">${ritmo} Proyección al cierre: <b class="num">${mxn(S.proyeccion)}</b>. ${corte}${S.nota ? `<div class="nota">${esc(S.nota)}</div>` : ""}</div>
  </div>
  <details><summary>Desglose por campaña</summary><div class="tabla"><table>
    <thead><tr><th>Campaña</th><th>Por día</th><th>Mes</th><th>Esperado</th><th>Gastado</th><th>Diferencia</th><th>Estado</th></tr></thead>
    <tbody>${filasHtml || `<tr><td colspan="7" class="tenue">Sin filas</td></tr>`}</tbody></table></div></details></article>`;
}
function mini(x) { if (!x.presMes) return ""; const w = Math.min(100, x.gastado / x.presMes * 100); return `<span class="mini" aria-hidden="true"><i class="${x.estado}" style="width:${w.toFixed(0)}%"></i></span>`; }
function difTxt(x) { const d = x.gastado - x.esperado; return (d >= 0 ? "+" : "−") + mxn(Math.abs(d)); }
function compacto(v) { v = n(v); return v >= 1e6 ? (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + " M" : v >= 1e3 ? Math.round(v / 1e3) + " k" : String(Math.round(v)); }
/* Gráfica de barras de un servicio: una barra por mes (gastado) sobre el contorno del presupuesto. */
/* Color de cada servicio: el mismo de su banda en la tabla. */
const COLOR_SECC = { fertilidad_mx: "#7fbf40", turismo: "#c8a040", us_fertilidad: "#253f78", donacion: "#6a4fa3", gestantes: "#d9299c", more: "#b30000", surrogate: "#5c6b7a" };
function graficaServicio(nombre, meses, hoy, color) {
  color = color || "#253f78";
  const W = 520, H = 190, ml = 48, mr = 8, mt = 18, mb = 30, iw = W - ml - mr, ih = H - mt - mb;
  const max = Math.max(1, ...meses.map(x => Math.max(x.pres, x.gasto)));
  const paso = iw / Math.max(meses.length, 1), bw = Math.min(34, paso * 0.62);
  const y = (v) => mt + ih - (v / max) * ih;
  let g = "";
  [0.25, 0.5, 0.75, 1].forEach(f => { const yy = y(max * f); g += `<line x1="${ml}" x2="${W - mr}" y1="${yy.toFixed(1)}" y2="${yy.toFixed(1)}" stroke="#e3e8ef" stroke-width="1"/><text x="${ml - 6}" y="${(yy + 4).toFixed(1)}" text-anchor="end" font-size="10" fill="#6a7894">${compacto(max * f)}</text>`; });
  meses.forEach((x, i) => {
    const cx = ml + paso * i + paso / 2, x0 = cx - bw / 2;
    const enCurso = x.mes === hoy, futuro = x.mes > hoy;
    if (x.pres) g += `<rect x="${x0.toFixed(1)}" y="${y(x.pres).toFixed(1)}" width="${bw.toFixed(1)}" height="${(mt + ih - y(x.pres)).toFixed(1)}" fill="none" stroke="${color}" stroke-opacity="0.45" stroke-width="1.5" stroke-dasharray="${futuro ? "3 3" : "0"}" rx="3"/>`;
    if (x.gasto) g += `<rect x="${(x0 + 3).toFixed(1)}" y="${y(x.gasto).toFixed(1)}" width="${(bw - 6).toFixed(1)}" height="${(mt + ih - y(x.gasto)).toFixed(1)}" fill="${color}" opacity="${enCurso ? 0.55 : 1}" rx="3"><title>${esc(nombreMes(x.mes))}: gastado ${mxn(x.gasto)}${x.pres ? " de " + mxn(x.pres) + " (" + pct(x.gasto / x.pres) + ")" : ""}${enCurso ? " · en curso" : ""}</title></rect>`;
    if (x.gasto && (meses.length <= 8 || i % 2 === 0)) g += `<text x="${cx.toFixed(1)}" y="${(y(x.gasto) - 4).toFixed(1)}" text-anchor="middle" font-size="10" fill="#1a2f5c">${compacto(x.gasto)}</text>`;
    g += `<text x="${cx.toFixed(1)}" y="${H - 10}" text-anchor="middle" font-size="11" fill="#3d558a">${MESES[Number(x.mes.slice(5, 7)) - 1].slice(0, 3)}${enCurso ? "*" : ""}</text>`;
  });
  const tot = meses.filter(x => x.mes <= hoy).reduce((a, x) => ({ p: a.p + x.pres, g: a.g + x.gasto }), { p: 0, g: 0 });
  return `<div class="grafica" style="border-top: 5px solid ${color}"><h3 style="color:${color}">${esc(nombre)}</h3><div class="sub">Gastado ${mxn(tot.g)} de ${mxn(tot.p)} hasta ${nombreMes(hoy)}${tot.p ? " · " + pct(tot.g / tot.p) : ""}</div>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gastado contra presupuesto por mes, ${esc(nombre)}">${g}</svg>
    <div class="leyenda-g"><span><i style="background:${color}"></i>Gastado</span><span><i style="border:1.5px solid ${color}; opacity:.6"></i>Presupuesto</span><span>* mes en curso</span></div></div>`;
}
function pintarAnio() {
  const A = calcularAnio();
  const secs = ORDEN.filter(s => A.lista.some(m => (["more", "surrogate"].includes(s) ? (A.meses[m].gasto[s] || 0) > 0 : ((A.meses[m].pres[s] || 0) > 0 || (A.meses[m].gasto[s] || 0) > 0))));
  const totP = {}, totG = {}; let gp = 0, gg = 0;
  const filas = A.lista.map(m => {
    const M = A.meses[m]; let p = 0, g = 0; const cuenta = m <= A.hoy; // los meses futuros se ven, pero no entran al total
    const celdas = secs.map(s => { const pr = M.pres[s] || 0, ga = M.gasto[s] || 0; p += pr; g += ga; if (cuenta) { totP[s] = (totP[s] || 0) + pr; totG[s] = (totG[s] || 0) + ga; }
      const est = m > A.hoy ? "sin" : (m === A.hoy ? "sin" : estadoDe(ga, pr));
      return `<td class="celda num">${ga ? mxn(ga) : "—"}${pr ? `<span class="mini" aria-hidden="true"><i class="${est}" style="width:${Math.min(100, ga / pr * 100).toFixed(0)}%"></i></span>` : ""}<span class="ln">${pr ? "presupuesto " + mxn(pr) + (ga ? " · " + pct(ga / pr) + " gastado" : "") : "sin presupuesto"}</span></td>`; });
    if (cuenta) { gp += p; gg += g; }
    const parcial = m === A.hoy ? ' <span class="tenue">(en curso)</span>' : (m > A.hoy ? ' <span class="tenue">(no entra al total)</span>' : "");
    return `<tr><td>${nombreMes(m)}${parcial}</td>${celdas.join("")}<td class="celda num"><b>${mxn(g)}</b><span class="ln">presupuesto ${mxn(p)}${p ? " · " + pct(g / p) + " gastado" : ""}</span></td></tr>`;
  }).join("");
  const total = `<tr class="total"><td>Total ${ANIO} hasta ${nombreMes(A.hoy)}</td>${secs.map(s => `<td class="celda num">${mxn(totG[s] || 0)}<span class="ln">presupuesto ${mxn(totP[s] || 0)}${totP[s] ? " · " + pct((totG[s] || 0) / totP[s]) + " gastado" : ""}</span></td>`).join("")}<td class="celda num">${mxn(gg)}<span class="ln">presupuesto ${mxn(gp)}${gp ? " · " + pct(gg / gp) + " gastado" : ""}</span></td></tr>`;
  const f = datos.fechas || {};
  $("anio").innerHTML = `<h2>Acumulado del año</h2>
    <div class="kpis"><div><div class="et">Presupuesto ${ANIO} hasta ${nombreMes(A.hoy)}</div><div class="v num">${mxn(gp)}</div></div><div><div class="et">Gastado ${ANIO}</div><div class="v num">${mxn(gg)}</div></div><div><div class="et">Avance</div><div class="v num">${pct(gp ? gg / gp : NaN)}</div></div></div>
    <div class="graficas">${secs.map(s => graficaServicio(SECC[s] || s, A.lista.map(m => ({ mes: m, pres: A.meses[m].pres[s] || 0, gasto: A.meses[m].gasto[s] || 0 })), A.hoy, COLOR_SECC[s])).join("")}</div>
    <div class="tabla"><table><thead><tr><th>Mes</th>${secs.map(s => `<th>${esc(SECC[s] || s)}<span class="ln">gastado · presupuesto · %</span></th>`).join("")}<th>Total</th></tr></thead><tbody>${filas}${total}</tbody></table></div>
    <p class="nota">Gastado: suma de Meta y Google por anuncio y día (hasta el ${esc(fechaCorta(f.ads))}) más la cuenta de donación (hasta el ${esc(fechaCorta(f.don))}). Presupuesto: el autorizado de cada mes, cargado desde el Sheet «Presupuesto / Publicidad» el 20 de octubre de 2026 y mantenido desde entonces en BigQuery. El mes en curso compara lo gastado hasta hoy contra el presupuesto completo. De abril en adelante el gasto cuadra con el Sheet; enero a marzo quedan cortos porque la tabla de anuncios aún no tenía todas las cuentas (por ejemplo, Meta de US corría en dólares en otra cuenta).</p>`;
}
/* ---------- bloque superior congelado ---------- */
const arriba = $("arriba"), asa = $("asa");
let bajado = false, abierto = false, fijo = false;
function pintarArriba() { const plegar = bajado && !abierto && !fijo; arriba.classList.toggle("plegada", plegar); asa.classList.toggle("visible", bajado && !fijo); }
function alScroll(e) { const y = e.target.scrollTop; const antes = bajado; bajado = y > 140; if (!bajado) { fijo = false; abierto = false; } if (antes !== bajado) pintarArriba(); }
$("hoja").addEventListener("scroll", alScroll, { passive: true });
$("vista-resumen").addEventListener("scroll", alScroll, { passive: true });
asa.addEventListener("mouseenter", () => { abierto = true; pintarArriba(); });
asa.addEventListener("click", () => { fijo = !fijo; abierto = fijo; pintarArriba(); });
arriba.addEventListener("mouseleave", () => { if (!fijo) { abierto = false; pintarArriba(); } });
/* ---------- eventos ---------- */
$("mes").addEventListener("change", async (e) => { state.mes = e.target.value; if (state.diaExtra != null) { state.diaExtra = ayerDe(state.mes); pintarDia(); } ajustarCorte(true); if (!datos.mes[state.mes]) await refresh(false); else pintar(); });
$("corte").addEventListener("input", (e) => { state.corte = Number(e.target.value); ajustarCorte(false); if (datos.mes[state.mes] && state.vista === "resumen") pintarResumen(); });
$("actualizar").addEventListener("click", () => refresh(true));
$("actualizar").hidden = false;
refresh(false);
return () => { /* los oyentes viven en elementos del propio marcado; al desmontar, el contenedor se vacía */ };
}
