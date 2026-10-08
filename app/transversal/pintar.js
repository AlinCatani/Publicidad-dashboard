// Pintado del Reporte Transversal+Ole, portado de la v14 del artefacto (2026-10-06).
// Diferencias con el artefacto: (1) el SQL no está aquí, lo arma el servidor en consultas.ts a partir
// del estado (filtros) que se le manda; (2) los datos llegan por /api/transversal, no por el conector MCP.
// `montar(raiz)` pinta dentro de `raiz` (que ya trae el marcado) y devuelve la función que limpia.
export function montar(raiz, opciones) {
let vivo = true, resizeT = 0;
const escuchas = [];
const on = (t, ev, fn) => { t.addEventListener(ev, fn); escuchas.push([t, ev, fn]); };
/* ===== Configuración ===== */
const MIN_DATE = "2026-03-01";
const CH = { meta: "Meta", google: "Google", otros: "Otros medios" };
const OPEN_START = "2026-08-10";
/* Región de campaña que corresponde a cada sucursal (valores de utm region, en minúsculas). */
const SUC_REGION = { "CIUDAD DE MEXICO": ["mexico", "cdmx", "ciudad_de_mexico"], "MONTERREY": ["monterrey", "mty"], "GUADALAJARA": ["guadalajara", "gdl"], "PUEBLA": ["puebla"], "TIJUANA": ["tijuana"], "CANCUN": ["cancun"], "MERIDA": ["merida"], "QUERETARO": ["queretaro"], "VERACRUZ": ["veracruz"], "TOLUCA": ["toluca"], "CIUDAD JUAREZ": ["juarez", "ciudad_juarez", "cd_juarez"], "LEON": ["leon", "bajio"], "MORELIA": ["morelia"], "MEXICALI": ["mexicali"], "CHIHUAHUA": ["chihuahua", "chuhuahua"], "AGUASCALIENTES": ["aguascalientes"], "HERMOSILLO": ["hermosillo"], "MAZATLAN": ["mazatlan"], "PUERTO VALLARTA": ["vallarta", "puerto_vallarta"], "HOUSTON": ["texas", "houston", "usa_south"], "ORANGE COUNTY": ["california", "orange_county"], "NEW YORK": ["newyork", "new_york"], "MIAMI": ["florida", "miami"] };
const localRegions = () => { const out = []; state.sucs.forEach(s => { const base = SUC_REGION[s] || [s.toLowerCase().replace(/\s+/g, "_")]; base.concat(base.map(x => x.replace(/_/g, " "))).forEach(r => { if (!out.includes(r)) out.push(r); }); }); return out; };
const soloMty = () => state.sucs.length === 1 && state.sucs[0] === "MONTERREY";
const sucsLabel = () => state.sucs.length === 0 ? "Todas las sucursales" : state.sucs.length === 1 ? `Sucursal ${sucName(state.sucs[0])}` : `${state.sucs.length} sucursales`;
const ORIGENES = [
  { k: "local", name: "Campaña local", sub: "región de la sucursal" },
  { k: "nacional", name: "Campañas nacionales", sub: "región nacional" },
  { k: "otras", name: "Campañas de otras regiones", sub: "otras ciudades, Texas, turismo" },
  { k: "sin_campana", name: "Sin campaña pagada", sub: "orgánico o sin UTM" }
];
/* Dimensiones: filtro (select), desglose por campaña (tabla) y desglose por paciente (tabla). */
/* Un reporte puede no traer todas las secciones (armarMarcado): lo que no está se pinta en un nodo suelto y no pasa nada. */
const el = id => document.getElementById(id) || document.createElement("div");
const hay = sec => !!document.querySelector(`[data-sec="${sec}"]`);
const VACIO = "__vacio__"; // valor del select para «(vacío)»: distinto de "" (= Todas)
const DIMS = {
  sucursal_real: { label: "Sucursal" }, campaign: { label: "Campaña" }, medium: { label: "Medio" }, landing: { label: "Landing", top: 300 },
  region: { label: "Región" }, anuncio: { label: "Anuncio", top: 300 }, mensaje: { label: "Mensaje" },
  tipo_de_paciente: { label: "Tipo de paciente" }, perfil: { label: "Perfil" }, score: { label: "Score" }, user_persona: { label: "User persona" },
  grupo_edad: { label: "Grupo de edad", sortKey: true }, es_leading: { label: "LeadING", fixed: ["LeadING", "No LeadING"] }, ole: { label: "OLE", fixed: ["OLE", "Con campaña"] }, internacional: { label: "Nacional / Internacional", fixed: ["Nacional", "Internacional"] },
  canal: { label: "Canal" }, mes: { label: "Mes" }
};
const FILTER_ROW1 = ["campaign", "medium", "landing", "region", "anuncio", "mensaje"];
const FILTER_ROW2 = ["tipo_de_paciente", "perfil", "score", "user_persona", "grupo_edad", "es_leading", "ole", "internacional"];
const FILTER_DIMS = FILTER_ROW1.concat(FILTER_ROW2);
const DESG_DIMS = ["campaign", "medium", "landing", "region", "anuncio", "mensaje", "sucursal_real", "canal", "mes"];
const PERFIL_DIMS = ["tipo_de_paciente", "perfil", "score", "user_persona", "es_leading", "grupo_edad"];

/* Sucursales: abreviatura y grupo de color (mx = verde del logo, us = azul marino, tur = dorado). */
const SUC = {
  "CIUDAD DE MEXICO": ["CDM", "mx"], "MONTERREY": ["MTY", "mx"], "GUADALAJARA": ["GDL", "mx"], "PUEBLA": ["PUE", "mx"], "TIJUANA": ["TIJ", "mx"],
  "CANCUN": ["CUN", "mx"], "MERIDA": ["MID", "mx"], "QUERETARO": ["QRO", "mx"], "VERACRUZ": ["VER", "mx"], "TOLUCA": ["TOL", "mx"],
  "CIUDAD JUAREZ": ["CJS", "mx"], "LEON": ["LEO", "mx"], "MORELIA": ["MOR", "mx"], "MEXICALI": ["MXL", "mx"], "CHIHUAHUA": ["CHI", "mx"],
  "AGUASCALIENTES": ["AGS", "mx"], "HERMOSILLO": ["HMO", "mx"], "MAZATLAN": ["MZT", "mx"], "PUERTO VALLARTA": ["VTA", "mx"],
  "HOUSTON": ["HOU", "us"], "ORANGE COUNTY": ["OCO", "us"], "NEW YORK": ["NYC", "us"], "MIAMI": ["MIA", "us"],
  "NO SE": ["NSE", "tur"], "INTERNACIONAL": ["INT", "tur"], "SIN SUCURSAL": ["S/S", "tur"]
};
const sucInfo = v => SUC[v] || [String(v || "").replace(/[^A-Z]/g, "").slice(0, 3) || "—", "tur"];
const sucName = v => v ? v.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase()).replace("Ciudad De Mexico", "Ciudad de México").replace("Ciudad Juarez", "Ciudad Juárez").replace("Cancun", "Cancún").replace("Merida", "Mérida").replace("Queretaro", "Querétaro").replace("Leon", "León").replace("Mazatlan", "Mazatlán").replace("No Se", "No sé") : "(vacío)";

/* ===== Formato ===== */
const nf = new Intl.NumberFormat("es-MX");
const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat("es-MX", { notation: "compact", maximumFractionDigits: 1 });
const pct = v => isFinite(v) ? (v * 100).toLocaleString("es-MX", { maximumFractionDigits: 1 }) + "%" : "—";
const money = v => isFinite(v) ? mxn.format(v) : "—";
const div = (a, b) => b ? a / b : NaN;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmtDate = s => new Date(s + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }).replace(/\./g, "");
const today = iso(new Date());

/* ===== Estado ===== */
const state = { desde: MIN_DATE, hasta: today, mes: "todo", canal: "pagado", gran: "dia", dim: "campaign", pdim: "tipo_de_paciente", sucs: ["MONTERREY"], f: {} };
FILTER_DIMS.forEach(k => state.f[k] = []);
try {
  const s = JSON.parse(localStorage.getItem("reporte-transversal-v3") || "{}");
  if (Array.isArray(s.sucs)) state.sucs = s.sucs.filter(v => typeof v === "string" && v).slice(0, 40);
  if (s.gran === "semana") state.gran = "semana";
  if (/^\d{4}-\d\d-\d\d$/.test(s.desde || "")) state.desde = s.desde < MIN_DATE ? MIN_DATE : s.desde;
  if (/^\d{4}-\d\d-\d\d$/.test(s.hasta || "")) state.hasta = s.hasta;
  if (s.canal) state.canal = s.canal;
  if (typeof s.mes === "string") state.mes = s.mes;
  if (s.dim && DESG_DIMS.includes(s.dim)) state.dim = s.dim;
  if (s.pdim && PERFIL_DIMS.includes(s.pdim)) state.pdim = s.pdim;
  if (s.f) FILTER_DIMS.forEach(k => { const v = s.f[k]; if (Array.isArray(v)) state.f[k] = v.filter(x => typeof x === "string" && x).slice(0, 60); else if (typeof v === "string" && v) state.f[k] = [v]; });
  const viejo = { Leading: "LeadING", "No leading": "No LeadING" }; state.f.es_leading = state.f.es_leading.map(v => viejo[v] || v);
} catch (e) {}
if (state.hasta < state.desde) state.hasta = state.desde;
const save = () => { try { localStorage.setItem("reporte-transversal-v3", JSON.stringify(state)); } catch (e) {} };
const channels = () => state.canal === "pagado" ? ["meta", "google"] : state.canal === "todos" ? ["meta", "google", "otros"] : [state.canal];
/* Meses dentro del periodo elegido */
function monthsSel() {
  const out = []; let d = new Date(state.desde.slice(0, 7) + "-01T12:00:00");
  const end = state.hasta.slice(0, 7);
  while (iso(d).slice(0, 7) <= end) { out.push({ key: iso(d).slice(0, 7), short: d.toLocaleDateString("es-MX", { month: "short" }).replace(".", ""), long: d.toLocaleDateString("es-MX", { month: "long" }) }); d.setMonth(d.getMonth() + 1); }
  return out;
}

const REG_SKIP = { perfil: 1, es_leading: 1, internacional: 1 };
/* ===== Datos ===== */
let ALL = [], ROWS = [], PROWS = [], RROWS = [], WEEKS = [], DROWS = [], OPTIONS = null;
let MROWS = [];
const inMes = r => state.mes === "todo" || r.mes === state.mes;
const applyCanal = () => { const chs = channels(); MROWS = ALL.filter(r => chs.includes(r.canal)); ROWS = MROWS.filter(inMes); };
const prevMonthKey = () => { if (state.mes === "todo") return null; const d = new Date(state.mes + "-01T12:00:00"); d.setMonth(d.getMonth() - 1); return iso(d).slice(0, 7); };
/* OLE = leads orgánicos: sin campaña pagada (campaign no empieza con "paid"), de todos los medios. */
const ole = () => sum(ALL.filter(r => r.origen === "sin_campana" && inMes(r)));
const METRICS = ["leads", "citas", "pvr", "cambio", "inversion"];
const blank = () => ({ leads: 0, citas: 0, pvr: 0, cambio: 0, inversion: 0 });
function sum(rows) { const o = blank(); rows.forEach(r => METRICS.forEach(m => o[m] += r[m])); return o; }
const byCanal = c => ROWS.filter(r => r.canal === c);
const regSum = rows => rows.reduce((t, r) => t + r.registros, 0);
const regBy = (canal, mes, origen) => regSum(RROWS.filter(r => (!canal || r.canal === canal) && (mes ? r.mes === mes : inMes(r)) && (!origen || r.origen === origen)));
const regTotal = () => regBy(null, null, null);
const parseRows = rows => rows.map(r => ({ mes: r.mes == null ? "" : String(r.mes), canal: r.canal == null ? "" : String(r.canal), origen: r.origen == null ? "" : String(r.origen), dim: r.dim == null ? "" : String(r.dim),
  leads: +r.leads || 0, citas: +r.citas || 0, pvr: +r.pvr || 0, cambio: +r.cambio || 0, inversion: +r.inversion || 0 }));

/* ===== Periodo ===== */
const periodBtn = el("periodBtn"), periodPop = el("periodPop");
const dDesde = el("dDesde"), dHasta = el("dHasta");
dDesde.min = MIN_DATE; dHasta.min = MIN_DATE; dDesde.max = today; dHasta.max = today;
function openPop(open) { periodPop.hidden = !open; periodBtn.setAttribute("aria-expanded", String(open)); if (open) { dDesde.value = state.desde; dHasta.value = state.hasta; dDesde.focus(); } }
periodBtn.addEventListener("click", () => openPop(periodPop.hidden));
on(document, "click", e => { if (!periodPop.hidden && !e.target.closest(".period-wrap")) openPop(false); });
on(document, "keydown", e => { if (e.key === "Escape") openPop(false); });
function applyPeriod(desde, hasta) {
  if (desde < MIN_DATE) desde = MIN_DATE;
  if (hasta > today) hasta = today;
  if (hasta < desde) [desde, hasta] = [hasta, desde];
  state.desde = desde; state.hasta = hasta; save(); openPop(false); renderMesButtons(); paintFilters(); refresh(false);
}
el("pApply").addEventListener("click", () => { if (dDesde.value && dHasta.value) applyPeriod(dDesde.value, dHasta.value); });
el("pQuick1").addEventListener("click", () => applyPeriod(today.slice(0, 7) + "-01", today));
el("pQuick2").addEventListener("click", () => { const d = new Date(); d.setMonth(d.getMonth() - 2); applyPeriod(iso(d).slice(0, 7) + "-01", today); });
el("pQuick3").addEventListener("click", () => applyPeriod(MIN_DATE, today));

/* ===== Mes (filtro rápido dentro del periodo) ===== */
const fMes = el("fMes");
function renderMesButtons() {
  const ms = monthsSel();
  if (state.mes !== "todo" && !ms.some(m => m.key === state.mes)) state.mes = "todo";
  fMes.innerHTML = `<button type="button" data-v="todo">Todo</button>` + ms.map(m => `<button type="button" data-v="${m.key}">${cap(m.short)}</button>`).join("");
}
fMes.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; state.mes = b.dataset.v; save(); applyCanal(); render(); refreshPerfil(false); refreshDiario(false); });

/* ===== Canal, desglose, perfil ===== */
el("fCanal").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; state.canal = b.dataset.v; save(); applyCanal(); render(); refreshPerfil(false); refreshDiario(false); refreshReg(false); });
const fDim = el("fDim");
fDim.innerHTML = DESG_DIMS.map(k => `<button type="button" data-v="${k}">${DIMS[k].label}</button>`).join("");
fDim.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; state.dim = b.dataset.v; save(); paintFilters(); refresh(false); });
const fPerfil = el("fPerfil");
fPerfil.innerHTML = PERFIL_DIMS.map(k => `<button type="button" data-v="${k}">${DIMS[k].label}</button>`).join("");
fPerfil.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; state.pdim = b.dataset.v; save(); paintFilters(); refreshPerfil(false); refreshDiario(false); });

/* ===== Filtros de varias opciones: botón + desplegable con casillas, «Todas» y «Solo» ===== */
const selVal = o => o.v === "" ? VACIO : o.v, selLabel = v => v === VACIO ? "(vacío)" : v;
function selOpts(k) {
  const d = DIMS[k];
  let opts = d.fixed ? d.fixed.map(v => ({ v, n: null })) : ((OPTIONS && OPTIONS[k]) || []).slice(0, d.top || 200);
  if (d.sortKey) opts = opts.slice().sort((a, b) => a.v.localeCompare(b.v, "es", { numeric: true }));
  const faltan = state.f[k].filter(v => !opts.some(o => selVal(o) === v)).map(v => ({ v: v === VACIO ? "" : v, n: null }));
  return faltan.concat(opts);
}
function selResumen(k) { const c = state.f[k]; return c.length === 0 ? "Todas" : c.length === 1 ? selLabel(c[0]) : `${c.length} elegidas`; }
function selectHtml(k) {
  const n = state.f[k].length;
  return `<div class="sel" data-k="${k}"><span>${DIMS[k].label}</span><button type="button" class="sel-btn${n ? " on" : ""}" aria-haspopup="listbox" aria-expanded="false"><em>${esc(selResumen(k))}</em><i>▾</i></button></div>`;
}
function pintarSelBtn(host) { const k = host.dataset.k, b = host.querySelector(".sel-btn"); b.classList.toggle("on", state.f[k].length > 0); b.querySelector("em").textContent = selResumen(k); }
let selAbierto = null;
function cerrarSel() { if (!selAbierto) return; const pop = selAbierto.querySelector(".sel-pop"); if (pop) pop.remove(); selAbierto.querySelector(".sel-btn").setAttribute("aria-expanded", "false"); selAbierto = null; }
function pintarSelLista(host) {
  const k = host.dataset.k, cur = state.f[k], pop = host.querySelector(".sel-pop"), q = (pop.querySelector(".sel-q") || {}).value || "";
  const qn = q.trim().toLowerCase();
  const opts = selOpts(k).filter(o => !qn || selLabel(selVal(o)).toLowerCase().includes(qn));
  pop.querySelector(".sel-all").disabled = cur.length === 0;
  pop.querySelector(".sel-list").innerHTML = opts.map(o => { const v = selVal(o), on = cur.includes(v);
    return `<label class="sel-opt${on ? " on" : ""}"><input type="checkbox" value="${esc(v)}"${on ? " checked" : ""}><b>${esc(selLabel(v))}</b>${o.n != null ? `<small>${compact.format(o.n)}</small>` : ""}<button type="button" class="sel-solo" data-v="${esc(v)}" title="Solo esta opción">Solo</button></label>`; }).join("") || `<div class="sel-nada">Sin coincidencias</div>`;
}
function abrirSel(host) {
  if (selAbierto === host) { cerrarSel(); return; }
  cerrarSel();
  const k = host.dataset.k;
  const pop = document.createElement("div"); pop.className = "sel-pop"; pop.setAttribute("role", "listbox"); pop.setAttribute("aria-label", DIMS[k].label);
  pop.innerHTML = `<div class="sel-top"><button type="button" class="sel-all">Todas</button>${selOpts(k).length > 8 ? `<input type="search" class="sel-q" placeholder="Buscar…" aria-label="Buscar opción">` : ""}</div><div class="sel-list"></div>`;
  host.appendChild(pop); host.querySelector(".sel-btn").setAttribute("aria-expanded", "true"); selAbierto = host;
  pintarSelLista(host);
  const aplicar = () => { save(); pintarSelBtn(host); paintFilters(); renderTabs(); refresh(false); };
  pop.addEventListener("change", e => {
    const cb = e.target; if (cb.type !== "checkbox") return;
    const cur = state.f[k], i = cur.indexOf(cb.value);
    if (cb.checked && i < 0) cur.push(cb.value); if (!cb.checked && i >= 0) cur.splice(i, 1);
    cb.closest(".sel-opt").classList.toggle("on", cb.checked); pop.querySelector(".sel-all").disabled = cur.length === 0; aplicar();
  });
  pop.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return; e.preventDefault();
    if (b.classList.contains("sel-all")) state.f[k] = []; else if (b.classList.contains("sel-solo")) state.f[k] = [b.dataset.v]; else return;
    pintarSelLista(host); aplicar();
  });
  const q = pop.querySelector(".sel-q"); if (q) { q.addEventListener("input", () => pintarSelLista(host)); q.focus(); }
}
function renderSelects() {
  cerrarSel();
  el("selects1").innerHTML = FILTER_ROW1.map(selectHtml).join("");
  el("selects2").innerHTML = FILTER_ROW2.map(selectHtml).join("");
  document.querySelectorAll("#selects1 .sel-btn, #selects2 .sel-btn").forEach(b => b.addEventListener("click", () => abrirSel(b.parentElement)));
}
on(el("filterNote"), "click", e => {
  const b = e.target.closest(".chip"); if (!b) return;
  if (b.dataset.all) FILTER_DIMS.forEach(k => state.f[k] = []);
  else { const cur = state.f[b.dataset.k], i = cur.indexOf(b.dataset.v); if (i >= 0) cur.splice(i, 1); }
  save(); renderSelects(); paintFilters(); renderTabs(); refresh(false);
});
on(document, "click", e => { if (selAbierto && !selAbierto.contains(e.target)) cerrarSel(); });
on(document, "keydown", e => { if (e.key === "Escape") cerrarSel(); });

/* ===== Pestañas de sucursal ===== */
function renderTabs() {
  const host = el("tabsSuc");
  const list = ((OPTIONS && OPTIONS.sucursal_real) || Object.keys(SUC).map(v => ({ v, n: 0 }))).filter(o => o.v !== "");
  const order = { mx: 0, us: 1, tur: 2 };
  list.sort((a, b) => order[sucInfo(a.v)[1]] - order[sucInfo(b.v)[1]] || (b.n || 0) - (a.n || 0));
  let lastG = null;
  host.innerHTML = `<button type="button" class="tab g-all" data-all="1" aria-pressed="${String(state.sucs.length === 0)}" title="Todas las sucursales (sin filtro)"><b>ALL</b></button>` +
    list.map(o => { const [ab, g] = sucInfo(o.v); const head = g !== lastG ? `<div class="tgroup">${{ mx: "México", us: "Estados Unidos", tur: "Turismo médico" }[g]}</div>` : ""; lastG = g;
    return head + `<button type="button" class="tab g-${g}" data-v="${esc(o.v)}" aria-pressed="${String(state.sucs.includes(o.v))}" title="${esc(sucName(o.v))}${o.n ? ` · ${nf.format(o.n)} leads` : ""}"><b>${ab}</b></button>`; }).join("");
  host.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => {
    if (b.dataset.all) state.sucs = [];
    else { const v = b.dataset.v, i = state.sucs.indexOf(v); if (i >= 0) state.sucs.splice(i, 1); else state.sucs.push(v); }
    save(); paintFilters(); renderTabs(); refresh(false);
  }));
}

function paintFilters() {
  document.querySelectorAll("#fCanal button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === state.canal)));
  fMes.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === state.mes)));
  fDim.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === state.dim)));
  fPerfil.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === state.pdim)));
  periodBtn.textContent = `${fmtDate(state.desde)} – ${fmtDate(state.hasta)} ▾`;
  el("eyebrow").textContent = `Marketing · ${sucsLabel()}`;
  pintarPliegue();
  const chips = [];
  FILTER_DIMS.forEach(k => state.f[k].forEach(v => chips.push(`<button type="button" class="chip" data-k="${k}" data-v="${esc(v)}" title="Quitar este filtro">${DIMS[k].label}: <b>${esc(selLabel(v))}</b><i>×</i></button>`)));
  el("filterNote").innerHTML = chips.length
    ? `<span class="chips-lbl">Filtros activos:</span> ${chips.join("")}${chips.length > 1 ? `<button type="button" class="chip chip-all" data-all="1" title="Quitar todos los filtros">Quitar todos</button>` : ""}`
    : "Sin filtros: se muestran todas las sucursales, campañas y perfiles.";
}

/* ===== KPIs ===== */
function renderKpis() {
  const a = sum(ROWS), reg = regTotal();
  const pk = prevMonthKey();
  const chs = channels();
  const p = pk ? sum(ALL.filter(r => chs.includes(r.canal) && r.mes === pk)) : null;
  const preg = pk ? regSum(RROWS.filter(r => r.mes === pk)) : 0;
  const has = p && (p.leads || preg);
  const items = [
    { k: "Inversión asignada", v: a.inversion, f: money, prev: has && p.inversion, neutral: true },
    { k: "Registros", v: reg, f: nf.format, prev: has && preg },
    { k: "Leads", v: a.leads, f: nf.format, prev: has && p.leads, sub: reg ? `${pct(div(a.leads, reg))} de registros` : "" },
    { k: "CPL", v: div(a.inversion, a.leads), f: money, prev: has && div(p.inversion, p.leads), cost: true },
    { k: "Citas agendadas", v: a.citas, f: nf.format, prev: has && p.citas, sub: `${pct(div(a.citas, a.leads))} de leads` },
    { k: "Costo por cita agendada", v: div(a.inversion, a.citas), f: money, prev: has && div(p.inversion, p.citas), cost: true },
    { k: "Primeras visitas", v: a.pvr, f: nf.format, prev: has && p.pvr, sub: `${pct(div(a.pvr, a.citas))} de citas agendadas` },
    { k: "Costo por PVR", v: div(a.inversion, a.pvr), f: money, prev: has && div(p.inversion, p.pvr), cost: true },
    { k: "TAL% · lead → PVR", v: div(a.pvr, a.leads), f: pct, prev: has && div(p.pvr, p.leads) },
    { k: "OLE", v: ole().leads, f: nf.format, sub: `Leads NO pagados · ${nf.format(ole().citas)} citas agendadas · ${nf.format(ole().pvr)} PVR`, cls: "ole" }
  ];
  const prevName = pk ? new Date(pk + "-01T12:00:00").toLocaleDateString("es-MX", { month: "short" }).replace(".", "") : "";
  el("kpis").innerHTML = items.map(it => {
    let d = it.sub || "", cls = "";
    if (it.prev && isFinite(it.prev) && isFinite(it.v)) {
      const ch = it.v / it.prev - 1, up = ch >= 0;
      d = `${up ? "▲" : "▼"} ${Math.abs(ch * 100).toFixed(1)}% vs ${prevName}`;
      if (!it.neutral) cls = (it.cost ? !up : up) ? "good" : "bad";
    }
    return `<div class="kpi${it.cls ? " " + it.cls : ""}"><span class="k">${it.k}</span><span class="v">${ROWS.length ? it.f(it.v) : "—"}</span><span class="d ${cls}">${d}</span></div>`;
  }).join("");
}

/* ===== Tabla genérica de resultados por valor ===== */
function resultTable(rows, label, nameFn) {
  const tot = sum(rows);
  const groups = {};
  rows.forEach(r => { (groups[r.dim] = groups[r.dim] || []).push(r); });
  let list = Object.keys(groups).map(k => ({ k, a: sum(groups[k]) }));
  if (DIMS[state.pdim] && label === DIMS[state.pdim].label && DIMS[state.pdim].sortKey) list.sort((x, y) => x.k.localeCompare(y.k, "es", { numeric: true }));
  else list.sort((x, y) => y.a.leads - x.a.leads);
  const shown = list.slice(0, 30), rest = list.slice(30);
  if (rest.length) shown.push({ k: `Otros (${rest.length})`, a: sum(rest.flatMap(x => groups[x.k])), raw: true });
  const row = (name, a, cls) => `<tr${cls ? ` class="${cls}"` : ""}>
      <td>${esc(name)}</td>
      <td>${nf.format(a.leads)}</td>
      <td><span class="share">${pct(div(a.leads, tot.leads))}<span class="bar"><i style="width:${(div(a.leads, tot.leads) * 100 || 0).toFixed(1)}%"></i></span></span></td>
      <td>${nf.format(a.citas)}</td><td>${pct(div(a.citas, a.leads))}</td>
      <td>${nf.format(a.pvr)}</td><td>${pct(div(a.pvr, a.leads))}</td>
      <td>${money(a.inversion)}</td><td class="hl">${money(div(a.inversion, a.leads))}</td><td class="hl">${money(div(a.inversion, a.citas))}</td><td class="hl">${money(div(a.inversion, a.pvr))}</td>
    </tr>`;
  return { html: `<thead><tr><th>${label}</th><th>Leads</th><th>% leads</th><th>Citas agendadas</th><th>Lead → cita agendada</th><th>PVR</th><th>TAL%</th><th>Inversión</th><th>CPL</th><th>Costo/cita agendada</th><th>Costo/PVR</th></tr></thead>
     <tbody>${shown.map(x => row(x.raw ? x.k : nameFn(x.k), x.a)).join("")}${row("Total", tot, "total")}</tbody>`, n: list.length, rest: rest.length };
}
const monthName = key => { const m = monthsSel().find(x => x.key === key); return m ? cap(m.long) : key; };
const dimName = (dim, k) => dim === "mes" ? monthName(k) : dim === "canal" ? (CH[k] || k) : dim === "sucursal_real" ? sucName(k) : (k || "(vacío)");

function renderDesglose() {
  const d = DIMS[state.dim];
  const t = resultTable(ROWS, d.label, k => dimName(state.dim, k));
  el("tDesg").innerHTML = t.html;
  el("desgHint").textContent = `${d.label}, ordenado por leads. ${t.n} valores${t.rest ? `; se muestran 30 y el resto se agrupa en «Otros»` : ""}.`;
}
function renderPerfil() {
  const d = DIMS[state.pdim];
  const t = resultTable(PROWS, d.label, k => dimName(state.pdim, k));
  el("tPerfil").innerHTML = t.html;
  el("perfilHint").textContent = `CPL, costo por cita agendada y costo por primera visita por ${d.label.toLowerCase()}. Los filtros de arriba aplican.`;
}

/* ===== Funnel ===== */
const STAGES = [
  { m: "leads", name: "Leads", sub: "Airtable", cost: "CPL" },
  { m: "citas", name: "Citas agendadas", sub: "en BIC", conv: "de leads", cost: "Costo por cita agendada" },
  { m: "pvr", name: "Primeras visitas", sub: "realizadas", conv: "de citas agendadas", cost: "Costo por PVR" }
];
const legendHtml = chs => chs.map(c => `<span><i class="dot ${c}"></i>${CH[c]}</span>`).join("");
const tipRows = rows => rows.map(r => `<div class="row"><span>${r[0]}</span><b>${r[1]}</b></div>`).join("");
function renderFunnel() {
  const chs = channels();
  const per = {}; chs.forEach(c => per[c] = sum(byCanal(c)));
  const a = sum(ROWS);
  const R = 46, SW = 14, C = 2 * Math.PI * R, GAP = 3;
  const ring = (inner, label) => `<svg class="donut" viewBox="0 0 120 120" role="img" aria-label="${label}"><g transform="rotate(-90 60 60)">${inner}</g></svg>`;
  const pendingCard = (n, why) => `<div class="dcard pending"><div class="dname">${n}</div>
      <div class="dslot"><div class="dwrap" style="width:100%">${ring(`<circle cx="60" cy="60" r="${R}" fill="none" class="ring-pending" stroke-width="${SW}"/>`, `${n}: pendiente`)}
        <div class="dcenter"><span class="dval na">—</span></div></div></div><div class="dline">${why}</div></div>`;
  let html = `<div class="fgroup-title">Atracción</div><div class="donuts">`;
  html += pendingCard("Impresiones y clics", "Pendiente: cargar métricas de Meta y Google a BigQuery");
  html += `</div><div class="fgroup-title">Conversión</div><div class="donuts">`;
  let prevM = null;
  /* Registros: primer anillo, por canal */
  { const total = regTotal(); let offset = 0, segs = `<circle cx="60" cy="60" r="${R}" fill="none" class="ring-track" stroke-width="${SW}"/>`;
    const parts = chs.map(c => ({ c, v: regBy(c) })).filter(p => p.v > 0);
    parts.forEach(p => { const frac = div(p.v, total) || 0, gap = parts.length > 1 ? GAP : 0, len = Math.max(0, frac * C - gap);
      const tip = `<div class="tt">Registros · ${CH[p.c]}</div>` + tipRows([["Volumen", nf.format(p.v)], ["Pasaron a lead", pct(div(per[p.c].leads, p.v))], ["Costo por registro", money(div(per[p.c].inversion, p.v))]]);
      segs += `<circle cx="60" cy="60" r="${R}" fill="none" class="s-${p.c}" stroke-width="${SW}" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-offset - gap / 2).toFixed(2)}" data-tip="${encodeURIComponent(tip)}"/>`; offset += frac * C; });
    html += `<div class="dcard"><div class="dname">Registros<small>formularios</small></div><div class="dslot"><div class="dwrap" style="width:100%">${ring(segs, `Registros: ${nf.format(total)}`)}<div class="dcenter"><span class="dval" style="font-size:19px">${nf.format(total)}</span></div></div></div>
      ${chs.length > 1 ? `<div class="dsplit">${parts.map(p => `<span><i class="dot ${p.c}"></i>${pct(div(p.v, total))}</span>`).join("")}</div>` : ""}<div class="dconv muted">Inicio del funnel</div><div class="dline">Costo por registro ${money(div(a.inversion, total))}</div></div>`; }
  STAGES.forEach(st => {
    const total = a[st.m];
    let offset = 0, segs = `<circle cx="60" cy="60" r="${R}" fill="none" class="ring-track" stroke-width="${SW}"/>`;
    const parts = chs.map(c => ({ c, v: per[c][st.m] })).filter(p => p.v > 0);
    parts.forEach(p => {
      const frac = div(p.v, total) || 0, gap = parts.length > 1 ? GAP : 0, len = Math.max(0, frac * C - gap);
      const tip = `<div class="tt">${st.name} · ${CH[p.c]}</div>` + tipRows([
        ["Volumen", nf.format(p.v)], chs.length > 1 ? ["% del total", pct(frac)] : null,
        prevM ? ["Conversión", pct(div(p.v, per[p.c][prevM]))] : null, [st.cost, money(div(per[p.c].inversion, p.v))]].filter(Boolean));
      segs += `<circle cx="60" cy="60" r="${R}" fill="none" class="s-${p.c}" stroke-width="${SW}" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-offset - gap / 2).toFixed(2)}" data-tip="${encodeURIComponent(tip)}"/>`;
      offset += frac * C;
    });
    const split = chs.length > 1 ? `<div class="dsplit">${chs.filter(c => per[c][st.m] > 0).map(c => `<span><i class="dot ${c}"></i>${pct(div(per[c][st.m], total))}</span>`).join("")}</div>` : "";
    const regT = regTotal();
    const conv = prevM ? `<div class="dconv">${pct(div(total, a[prevM]))} ${st.conv}</div>` : regT ? `<div class="dconv">${pct(div(total, regT))} de registros</div>` : `<div class="dconv muted">Inicio de la conversión</div>`;
    const sc = Math.min(1, Math.max(0.42, 1 + 0.35 * Math.log10(div(total, regT || a.leads) || 0.001)));
    html += `<div class="dcard"><div class="dname">${st.name}<small>${st.sub}</small></div>
      <div class="dslot"><div class="dwrap" style="width:${(sc * 100).toFixed(1)}%">${ring(segs, `${st.name}: ${nf.format(total)}`)}
        <div class="dcenter"><span class="dval" style="font-size:${(12 + 7 * sc).toFixed(1)}px">${nf.format(total)}</span></div></div></div>
      ${split}${conv}<div class="dline">${st.cost} ${money(div(a.inversion, total))}</div></div>`;
    prevM = st.m;
  });
  html += `</div><div class="overall">${regTotal() ? `<span>Registro → PVR <b>${pct(div(a.pvr, regTotal()))}</b></span>` : ""}<span>Lead → cita agendada <b>${pct(div(a.citas, a.leads))}</b></span><span>Cita agendada → PVR <b>${pct(div(a.pvr, a.citas))}</b></span><span>TAL% <b>${pct(div(a.pvr, a.leads))}</b></span><span>Inversión asignada <b>${money(a.inversion)}</b></span></div>`;
  el("funnel").innerHTML = html;
  el("legFunnel").innerHTML = legendHtml(chs);
}

/* ===== Origen de los leads ===== */
function renderOrigen() {
  const tot = sum(ROWS), regT = regTotal();
  const rows = ORIGENES.map(o => ({ o, a: sum(ROWS.filter(r => r.origen === o.k)), reg: regBy(null, null, o.k) })).filter(r => r.a.leads || r.reg).sort((x, y) => y.a.leads - x.a.leads);
  const body = rows.map(({ o, a, reg }) => { const share = div(a.leads, tot.leads), paid = o.k !== "sin_campana"; return `<tr${o.k === "local" ? ' class="hl"' : ""}>
      <td><span class="oname">${o.name}<small>${o.sub}</small></span></td>
      <td>${nf.format(reg)}</td><td>${nf.format(a.leads)}</td>
      <td><span class="share">${pct(share)}<span class="bar"><i style="width:${(share * 100 || 0).toFixed(1)}%"></i></span></span></td>
      <td>${nf.format(a.citas)}</td><td>${nf.format(a.pvr)}</td><td>${pct(div(a.pvr, a.leads))}</td>
      <td>${paid ? money(a.inversion) : "—"}</td><td>${paid ? money(div(a.inversion, a.leads)) : "—"}</td><td>${paid ? money(div(a.inversion, a.pvr)) : "—"}</td></tr>`; }).join("");
  el("tOrigen").innerHTML = `<thead><tr><th>Origen</th><th>Registros</th><th>Leads</th><th>% de leads</th><th>Citas agendadas</th><th>PVRs</th><th>TAL%</th><th>Inversión</th><th>CPL</th><th>Costo/PVR</th></tr></thead>
    <tbody>${body}<tr class="total"><td>Total</td><td>${nf.format(regT)}</td><td>${nf.format(tot.leads)}</td><td>100%</td><td>${nf.format(tot.citas)}</td><td>${nf.format(tot.pvr)}</td><td>${pct(div(tot.pvr, tot.leads))}</td><td>${money(tot.inversion)}</td><td>${money(div(tot.inversion, tot.leads))}</td><td>${money(div(tot.inversion, tot.pvr))}</td></tr></tbody>`;
  const suc = state.sucs.length ? sucsLabel() : "", nac = sum(ROWS.filter(r => r.origen === "nacional")), loc = sum(ROWS.filter(r => r.origen === "local"));
  el("origenHint").textContent = suc ? `Leads de ${suc.toLowerCase()}: las campañas nacionales aportan ${pct(div(nac.leads, tot.leads))} y la campaña local ${pct(div(loc.leads, tot.leads))}.` : "Elige una sucursal en las pestañas para separar su campaña local de las nacionales.";
  el("origenNote").textContent = suc && localRegions().length ? `«Campaña local» agrupa todo lo etiquetado con región ${localRegions().slice(0, 2).join(" o ")} en campañas pagadas. Si una campaña cambió de segmentación sin cambiar sus UTM, aquí se ve junta.` : "";
}

/* ===== Campaña local: ADV vs OPEN (solo Monterrey) + semanal ===== */
const wkMetrics = {
  cita: { title: "Costo por cita agendada", fmt: money, axis: v => "$" + compact.format(v), val: w => w.inv_asig > 0 && w.citas > 0 ? w.inv_asig / w.citas : NaN, avg: ws => { const i = ws.filter(w => w.inv_asig > 0); return div(i.reduce((s, w) => s + w.inv_asig, 0), i.reduce((s, w) => s + w.citas, 0)); }, note: "Costo por cita agendada = inversión asignada a los leads de la sucursal ÷ citas agendadas de esos leads, por semana de creación. Con pocas citas agendadas por semana la línea brinca; guíate por el promedio." },
  cpl: { title: "CPL", fmt: money, axis: v => "$" + compact.format(v), val: w => w.inv_asig > 0 && w.leads > 0 ? w.inv_asig / w.leads : NaN, avg: ws => { const i = ws.filter(w => w.inv_asig > 0); return div(i.reduce((s, w) => s + w.inv_asig, 0), i.reduce((s, w) => s + w.leads, 0)); }, note: "CPL = inversión asignada ÷ leads de la sucursal creados esa semana." },
  share: { title: "% de leads de la campaña que son de la sucursal", fmt: pct, axis: v => Math.round(v * 100) + "%", val: w => w.leads_all > 0 ? w.leads / w.leads_all : NaN, avg: ws => div(ws.reduce((s, w) => s + w.leads, 0), ws.reduce((s, w) => s + w.leads_all, 0)), note: "Del total de leads que genera la campaña local en todas las sucursales, qué parte terminó en esta sucursal." },
  leads: { title: "Leads de la sucursal", fmt: v => nf.format(Math.round(v)), axis: v => nf.format(v), val: w => w.leads, avg: ws => div(ws.reduce((s, w) => s + w.leads, 0), ws.length), note: "Leads de la sucursal generados por la campaña local cada semana." },
  pvr: { title: "Primeras visitas", fmt: v => nf.format(Math.round(v)), axis: v => nf.format(v), val: w => w.pvr, avg: ws => div(ws.reduce((s, w) => s + w.pvr, 0), ws.length), note: "Primeras visitas de los leads de la sucursal creados esa semana (cohorte): las últimas semanas siguen madurando." }
};
state.wk = state.wk || "cita";
el("fWk").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; state.wk = b.dataset.v; save(); renderWeekly(); });
const shortDate = s => new Date(s + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" }).replace(".", "");
function renderLocal() {
  const sec = el("secLocal");
  const isMty = soloMty() && WEEKS.length;
  sec.hidden = !isMty; if (!isMty) return;
  const agg = ws => ws.reduce((o, w) => { ["leads", "citas", "pvr", "inv_asig", "leads_all", "inv_all"].forEach(k => o[k] += w[k]); return o; }, { leads: 0, citas: 0, pvr: 0, inv_asig: 0, leads_all: 0, inv_all: 0 });
  const A = agg(WEEKS.filter(w => w.semana < OPEN_START)), O = agg(WEEKS.filter(w => w.semana >= OPEN_START));
  const dA = Math.max(1, Math.round((new Date(Math.min(new Date(OPEN_START), new Date(state.hasta + "T12:00:00"))) - new Date(state.desde + "T12:00:00")) / 864e5)), dO = Math.max(1, Math.round((new Date(state.hasta + "T12:00:00") - new Date(Math.max(new Date(OPEN_START), new Date(state.desde + "T12:00:00")))) / 864e5) + 1);
  const rows = [
    ["Leads de Monterrey", x => x.leads, nf.format], ["Leads por día", (x, d) => x.leads / d, v => v.toFixed(1), true],
    ["% leads de la campaña que son de Mty", x => div(x.leads, x.leads_all), pct, true],
    ["Citas agendadas", x => x.citas, nf.format], ["Lead → cita agendada", x => div(x.citas, x.leads), pct, true],
    ["Primeras visitas", x => x.pvr, nf.format], ["TAL% (lead → PVR)", x => div(x.pvr, x.leads), pct, true],
    ["Inversión asignada a Mty", x => x.inv_asig, money], ["Inversión total de la campaña", x => x.inv_all, money],
    ["CPL (asignada)", x => div(x.inv_asig, x.leads), money, true], ["Costo por cita (asignada)", x => div(x.inv_asig, x.citas), money, true], ["Costo por PVR (asignada)", x => div(x.inv_asig, x.pvr), money, true],
    ["Costo por lead Mty (inversión total)", x => div(x.inv_all, x.leads), money, true]
  ];
  const body = rows.map(([label, fn, f, rate]) => { const va = fn(A, dA), vo = fn(O, dO); const ch = div(vo, va) - 1; const txt = isFinite(ch) && isFinite(va) && isFinite(vo) ? `${ch >= 0 ? "+" : "−"}${Math.abs(ch * 100).toFixed(0)}%` : "—";
    return `<tr${rate ? ' class="rate"' : ""}><td>${label}</td><td>${f(va)}</td><td>${f(vo)}</td><td class="chg">${txt}</td></tr>`; }).join("");
  el("tLocal").innerHTML = `<thead><tr><th>Métrica</th><th>ADV<small>hasta 9 ago · ${dA} días</small></th><th>OPEN<small>desde 10 ago · ${dO} días</small></th><th>Cambio</th></tr></thead><tbody>${body}</tbody>`;
  el("localNote").textContent = `Con OPEN, ${pct(div(O.leads, O.leads_all))} de los leads de la campaña son de Monterrey (con ADV ${pct(div(A.leads, A.leads_all))}); el resto se va a otras sucursales. Los totales no son comparables directo porque los periodos duran distinto; usa las filas por día y las tasas. Los leads recientes siguen madurando.`;
}
function renderWeekly() {
  const sec = el("secWk");
  sec.hidden = !(state.sucs.length && WEEKS.length);
  if (sec.hidden) return;
  document.querySelectorAll("#fWk button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === state.wk)));
  const cfg = wkMetrics[state.wk], host = el("cWk");
  setDims(host); H = W < 520 ? 240 : 270; ih = H - M.t - M.b;
  const ws = WEEKS, isMty = soloMty();
  const openIdx = isMty ? ws.findIndex(w => w.semana >= OPEN_START) : -1;
  const vals = ws.map(cfg.val);
  const segs = openIdx > 0 ? [[0, openIdx - 1, "a"], [openIdx, ws.length - 1, "b"]] : [[0, ws.length - 1, "a"]];
  const avgs = segs.map(([i0, i1]) => cfg.avg(ws.slice(i0, i1 + 1)));
  const yMax = niceMax(Math.max(...vals.filter(isFinite), ...avgs.filter(isFinite), 0) * 1.12 || 1);
  const step = iw / ws.length, x = i => M.l + step * i + step / 2, y = v => M.t + ih - v / yMax * ih;
  let s = axes(yMax, cfg.axis);
  if (openIdx > 0) { const xs = M.l + step * openIdx; s += `<rect x="${xs}" y="${M.t}" width="${W - M.r - xs}" height="${ih}" class="open-zone"/><line x1="${xs}" x2="${xs}" y1="${M.t - 6}" y2="${M.t + ih}" class="open-mark"/><text x="${xs + 6}" y="${M.t + 6}" class="lbl">Inicia OPEN · 10 ago</text>`; }
  const every = W < 520 ? 4 : W < 820 ? 3 : 2;
  ws.forEach((w, i) => { if (i % every === 0 || i === openIdx) s += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${shortDate(w.semana)}</text>`; });
  segs.forEach(([i0, i1, c], k) => {
    if (isFinite(avgs[k])) s += `<line x1="${x(i0) - step / 2}" x2="${x(i1) + step / 2}" y1="${y(avgs[k])}" y2="${y(avgs[k])}" class="avg s-${c}"/><text x="${x(i1) + step / 2 - 4}" y="${y(avgs[k]) - 6}" text-anchor="end" class="lbl">Prom. ${cfg.fmt(avgs[k])}</text>`;
    let d = "", pen = false;
    for (let i = i0; i <= i1; i++) { if (!isFinite(vals[i])) { pen = false; continue; } d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(vals[i]).toFixed(1)}`; pen = true; }
    s += `<path d="${d}" fill="none" class="s-${c}" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round" pointer-events="none"/>`;
  });
  ws.forEach((w, i) => { const v = vals[i], c = openIdx > 0 && i >= openIdx ? "b" : "a";
    const tip = `<div class="tt">Semana del ${shortDate(w.semana)}${openIdx > 0 ? ` · ${i >= openIdx ? "OPEN" : "ADV"}` : ""}</div>` + tipRows([[cfg.title, isFinite(v) ? cfg.fmt(v) : "Sin dato"], ["Leads de la sucursal", nf.format(w.leads)], ["Citas agendadas", nf.format(w.citas)], ["PVR", nf.format(w.pvr)], ["% leads de la sucursal", pct(div(w.leads, w.leads_all))], ["Inversión asignada", w.inv_asig > 0 ? money(w.inv_asig) : "—"]]);
    s += `<g class="col" data-tip="${encodeURIComponent(tip)}"><rect class="hit" x="${M.l + step * i}" y="${M.t}" width="${step}" height="${ih}"/>${isFinite(v) ? `<circle class="f-${c} mk" cx="${x(i)}" cy="${y(v)}" r="4.5"/>` : `<text x="${x(i)}" y="${M.t + ih - 6}" text-anchor="middle" class="gap-mark">sin dato</text>`}</g>`; });
  host.innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${cfg.title} semanal">${s}</svg>`;
  el("legWk").innerHTML = openIdx > 0 ? `<span><i class="dot" style="background:var(--seg-a)"></i>ADV</span><span><i class="dot" style="background:var(--seg-b)"></i>OPEN</span>` : "";
  el("wkHint").textContent = `Campaña pagada de Meta con región ${localRegions().slice(0, 2).join(" o ")}, semana por semana (lunes a domingo). La línea punteada es el promedio${openIdx > 0 ? " de cada periodo" : ""}.`;
  const ch = avgs.length > 1 ? div(avgs[1], avgs[0]) - 1 : NaN;
  el("wkNote").textContent = `${cfg.note}${avgs.length > 1 ? ` Promedio ADV: ${isFinite(avgs[0]) ? cfg.fmt(avgs[0]) : "—"}; promedio OPEN: ${isFinite(avgs[1]) ? cfg.fmt(avgs[1]) : "—"}${isFinite(ch) ? ` (${ch >= 0 ? "+" : "−"}${Math.abs(ch * 100).toFixed(0)}%)` : ""}.` : ""} La última semana puede estar incompleta.`;
  H = W < 520 ? 220 : 240; ih = H - M.t - M.b;
}

/* ===== Registros por mes (apilado) ===== */
function renderReg() {
  const chs = channels(), ms = monthsSel(), host = el("cReg"); setDims(host);
  const per = ms.map(mo => { const o = {}; chs.forEach(c => o[c] = regBy(c, mo.key)); o.all = regBy(null, mo.key); o.leads = sum(MROWS.filter(r => r.mes === mo.key)).leads; return o; });
  const yMax = niceMax(Math.max(1, ...per.map(p => p.all)) * 1.1);
  const step = iw / ms.length, bw = Math.min(64, step * 0.6);
  let s = axes(yMax, v => nf.format(v));
  ms.forEach((mo, i) => { const x = M.l + step * i + (step - bw) / 2; let yTop = M.t + ih;
    chs.forEach(c => { const v = per[i][c]; if (!v) return; const h = v / yMax * ih; yTop -= h; s += `<rect class="f-${c}" x="${x}" y="${yTop}" width="${bw}" height="${h}"/>`; });
    const tip = `<div class="tt">${cap(mo.long)}</div>` + tipRows(chs.map(c => [`<i class="dot ${c}"></i>${CH[c]}`, nf.format(per[i][c])]).concat([["Pasaron a lead", `${nf.format(per[i].leads)} (${pct(div(per[i].leads, per[i].all))})`]]));
    s += `<g class="col" data-tip="${encodeURIComponent(tip)}"><rect class="hit" x="${M.l + step * i}" y="${M.t}" width="${step}" height="${ih}"/></g><text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle">${cap(mo.short)}</text>`;
    if (per[i].all) s += `<text x="${x + bw / 2}" y="${yTop - 5}" text-anchor="middle" class="lbl">${nf.format(per[i].all)}</text>`; });
  host.innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Registros por mes">${s}</svg>`;
  el("legReg").innerHTML = legendHtml(chs);
  const skipped = FILTER_DIMS.filter(k => state.f[k].length && REG_SKIP[k]).map(k => DIMS[k].label);
  el("regNote").textContent = (state.sucs.length ? "Registros por la sucursal que eligió la persona (el formulario no sabe dónde terminará la visita). " : "") + (skipped.length ? `Los filtros de ${skipped.join(" y ")} no aplican a registros.` : "");
}

/* ===== Líneas de costo por mes y canal ===== */
function renderLine(elId, legId, metric, label) {
  const chs = channels(), ms = monthsSel(), host = el(elId); setDims(host);
  const val = (c, mo) => { const a = sum(MROWS.filter(r => r.mes === mo.key && r.canal === c)); return a[metric] > 0 && a.inversion > 0 ? a.inversion / a[metric] : NaN; };
  const all = chs.flatMap(c => ms.map(mo => val(c, mo))).filter(isFinite);
  const yMax = niceMax((all.length ? Math.max(...all) : 1) * 1.15);
  const step = iw / ms.length, x = i => M.l + step * i + step / 2, y = v => M.t + ih - v / yMax * ih;
  let s = axes(yMax, v => "$" + compact.format(v));
  ms.forEach((mo, i) => s += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${cap(mo.short)}</text>`);
  chs.forEach(c => { let d = "", pen = false; ms.forEach((mo, i) => { const v = val(c, mo); if (!isFinite(v)) { pen = false; return; } d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`; pen = true; });
    s += `<path d="${d}" fill="none" class="s-${c}" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round" pointer-events="none"/>`;
    ms.forEach((mo, i) => { const v = val(c, mo); if (isFinite(v)) s += `<circle class="f-${c} mk" cx="${x(i)}" cy="${y(v)}" r="4" pointer-events="none"/>`; }); });
  ms.forEach((mo, i) => { const tip = `<div class="tt">${cap(mo.long)}</div>` + tipRows(chs.map(c => { const a = sum(MROWS.filter(r => r.mes === mo.key && r.canal === c)); return [`<i class="dot ${c}"></i>${CH[c]}`, `${money(val(c, mo))} · ${nf.format(a[metric])}`]; }));
    s += `<g class="col" data-tip="${encodeURIComponent(tip)}"><rect class="hit" x="${M.l + step * i}" y="${M.t}" width="${step}" height="${ih}"/><line class="guide" x1="${x(i)}" x2="${x(i)}" y1="${M.t}" y2="${M.t + ih}"/></g>`; });
  host.innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label} por mes">${s}</svg>`;
  el(legId).innerHTML = legendHtml(chs);
}

/* ===== Meta vs Google ===== */
function renderCanal() {
  const m = sum(byCanal("meta")), g = sum(byCanal("google")), t = sum(ROWS.filter(r => r.canal !== "otros"));
  const rm = regBy("meta"), rg = regBy("google"), rt = rm + rg;
  const rows = [
    ["Inversión asignada", x => x.inversion, money], ["Registros", (x, r) => r, nf.format], ["Leads", x => x.leads, nf.format],
    ["Registro → lead", (x, r) => div(x.leads, r), pct, "high"], ["CPL", x => div(x.inversion, x.leads), money, "low"],
    ["Citas agendadas", x => x.citas, nf.format], ["Lead → cita agendada", x => div(x.citas, x.leads), pct, "high"], ["Costo por cita agendada", x => div(x.inversion, x.citas), money, "low"],
    ["PVRs", x => x.pvr, nf.format], ["Cita → PVR", x => div(x.pvr, x.citas), pct, "high"], ["Costo por PVR", x => div(x.inversion, x.pvr), money, "low"]
  ];
  const body = rows.map(([label, fn, f, better]) => { const vm = fn(m, rm), vg = fn(g, rg); let bm = "", bg = "";
    if (better === "low") { bm = vm < vg ? "better" : ""; bg = vg < vm ? "better" : ""; }
    if (better === "high") { bm = vm > vg ? "better" : ""; bg = vg > vm ? "better" : ""; }
    return `<tr${better ? ' class="rate"' : ""}><td>${label}</td><td class="${bm}">${f(vm)}</td><td class="${bg}">${f(vg)}</td><td>${f(fn(t, rt))}</td></tr>`; }).join("");
  el("tCanal").innerHTML = `<thead><tr><th>Métrica</th><th><span class="dot meta"></span>Meta</th><th><span class="dot google"></span>Google</th><th>Total pagado</th></tr></thead><tbody>${body}</tbody>`;
  el("canalHint").textContent = `Siempre muestra ambos canales con los demás filtros; ● marca el mejor en tasas y costos.`;
}

/* ===== Por mes ===== */
let W = 560, H = 240, iw = 0, ih = 0;
const M = { l: 56, r: 20, t: 22, b: 28 };
function niceMax(v) { if (!v) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
function setDims(el) { W = Math.max(300, Math.round(el.clientWidth || 560)); H = W < 520 ? 220 : 240; iw = W - M.l - M.r; ih = H - M.t - M.b; }
function axes(yMax, fmt) {
  let s = "";
  for (let i = 0; i <= 4; i++) { const v = yMax * i / 4, y = M.t + ih - ih * i / 4; s += `<line class="${i === 0 ? "base" : "gridl"}" x1="${M.l}" x2="${W - M.r}" y1="${y}" y2="${y}"/><text x="${M.l - 8}" y="${y + 4}" text-anchor="end">${fmt(v)}</text>`; }
  return s;
}
function renderMes() {
  const chs = channels(), ms = monthsSel();
  const per = ms.map(mo => { const o = {}; chs.forEach(c => o[c] = sum(MROWS.filter(r => r.mes === mo.key && r.canal === c))); o.all = sum(MROWS.filter(r => r.mes === mo.key)); return o; });
  const host = el("cMes"); setDims(host);
  const yMax = niceMax(Math.max(1, ...per.map(p => p.all.leads)) * 1.1);
  const step = iw / ms.length, bw = Math.min(64, step * 0.6);
  let s = axes(yMax, v => nf.format(v));
  ms.forEach((mo, i) => {
    const x = M.l + step * i + (step - bw) / 2;
    let yTop = M.t + ih;
    chs.forEach(c => { const v = per[i][c].leads; if (!v) return; const h = v / yMax * ih; yTop -= h; s += `<rect class="f-${c}" x="${x}" y="${yTop}" width="${bw}" height="${h}"/>`; });
    const a = per[i].all;
    const tip = `<div class="tt">${cap(mo.long)}</div>` + tipRows(chs.map(c => [`<i class="dot ${c}"></i>${CH[c]}`, `${nf.format(per[i][c].leads)} · CPL ${money(div(per[i][c].inversion, per[i][c].leads))}`])
      .concat([["Citas agendadas", `${nf.format(a.citas)} (${pct(div(a.citas, a.leads))})`], ["PVR", `${nf.format(a.pvr)} (${pct(div(a.pvr, a.leads))})`], ["Costo por PVR", money(div(a.inversion, a.pvr))]]));
    s += `<g class="col" data-tip="${encodeURIComponent(tip)}"><rect class="hit" x="${M.l + step * i}" y="${M.t}" width="${step}" height="${ih}"/></g>`;
    s += `<text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle">${cap(mo.short)}</text>`;
    if (a.leads) s += `<text x="${x + bw / 2}" y="${yTop - 5}" text-anchor="middle" class="lbl">${nf.format(a.leads)}</text>`;
  });
  host.innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Leads por mes">${s}</svg>`;
  el("legMes").innerHTML = legendHtml(chs);
  const cols = [["Registros", (a, i) => nf.format(i == null ? regSum(RROWS) : regBy(null, ms[i].key))], ["Leads", a => nf.format(a.leads)], ["Citas agendadas", a => nf.format(a.citas)], ["Lead → cita agendada", a => pct(div(a.citas, a.leads))], ["PVR", a => nf.format(a.pvr)], ["TAL%", a => pct(div(a.pvr, a.leads))],
    ["Inversión", a => money(a.inversion)], ["CPL", a => money(div(a.inversion, a.leads))], ["Costo/cita", a => money(div(a.inversion, a.citas))], ["Costo/PVR", a => money(div(a.inversion, a.pvr))]];
  el("tMes").innerHTML = `<thead><tr><th>Mes</th>${cols.map(c => `<th>${c[0]}</th>`).join("")}</tr></thead><tbody>` +
    ms.map((mo, i) => `<tr${state.mes === mo.key ? ' class="hl"' : ""}><td>${cap(mo.long)}</td>${cols.map(c => `<td>${c[1](per[i].all, i)}</td>`).join("")}</tr>`).join("") +
    `<tr class="total"><td>${state.mes === "todo" ? "Total" : "Total del periodo"}</td>${cols.map(c => `<td>${c[1](sum(MROWS), null)}</td>`).join("")}</tr></tbody>`;
}

/* ===== Evolución diaria: tres gráficas pequeñas (leads, citas, PVR), por día o por semana ===== */
const fGran = el("fGran");
fGran.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; state.gran = b.dataset.v; save(); renderDiario(); });
function monday(d) { const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return iso(x); }
function renderDiario() {
  fGran.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === state.gran)));
  const host = el("cDiario");
  const sem = state.gran === "semana";
  const map = new Map();
  DROWS.forEach(r => { const k = sem ? monday(r.dia) : r.dia; const o = map.get(k) || { k, leads: 0, citas: 0, pvr: 0 }; o.leads += r.leads; o.citas += r.citas; o.pvr += r.pvr; map.set(k, o); });
  const pts = [...map.values()].sort((a, b) => a.k < b.k ? -1 : 1);
  const series = [["leads", "Leads", "meta"], ["citas", "Citas agendadas", "google"], ["pvr", "Primeras visitas", "otros"]];
  if (!pts.length) { host.innerHTML = `<p class="hint">Sin datos con estos filtros.</p>`; return; }
  const fmtK = k => sem ? `Semana del ${fmtDate(k)}` : fmtDate(k);
  host.innerHTML = series.map(([m, label]) => `<div class="mini"><h3>${label}</h3><div id="cDia-${m}"></div></div>`).join("");
  series.forEach(([m, label, cls]) => {
    const el = el("cDia-" + m); setDims(el); H = 180; ih = H - M.t - M.b;
    const yMax = niceMax(Math.max(1, ...pts.map(p => p[m])) * 1.15);
    const n = pts.length, x = i => M.l + (n > 1 ? iw * i / (n - 1) : iw / 2), y = v => M.t + ih - v / yMax * ih;
    let s = axes(yMax, v => nf.format(v));
    const every = Math.max(1, Math.ceil(n / (W < 420 ? 4 : 6)));
    pts.forEach((p, i) => { if (i % every === 0 || i === n - 1) s += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${new Date(p.k + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" }).replace(".", "")}</text>`; });
    let d = ""; pts.forEach((p, i) => d += `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[m]).toFixed(1)}`);
    s += `<path d="${d}" fill="none" class="s-${cls}" stroke-width="2" stroke-linejoin="round" pointer-events="none"/>`;
    if (n <= 60) pts.forEach((p, i) => s += `<circle class="f-${cls} mk" cx="${x(i)}" cy="${y(p[m])}" r="3" pointer-events="none"/>`);
    const step = n > 1 ? iw / (n - 1) : iw;
    pts.forEach((p, i) => { const tip = `<div class="tt">${fmtK(p.k)}</div>` + tipRows(series.map(([mm, ll]) => [ll, nf.format(p[mm])]));
      s += `<g class="col" data-tip="${encodeURIComponent(tip)}"><rect class="hit" x="${x(i) - step / 2}" y="${M.t}" width="${step}" height="${ih}"/><line class="guide" x1="${x(i)}" x2="${x(i)}" y1="${M.t}" y2="${M.t + ih}"/></g>`; });
    el.innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label} por ${sem ? "semana" : "día"}">${s}</svg>`;
  });
}

/* ===== Notas al pie con datos en vivo ===== */
function renderNotes() {
  const a = sum(ROWS);
  const base = "La sucursal es la de la visita cuando la hubo (BIP.nom_suc); si no, la que eligió el lead al registrarse. La cita no aporta sucursal.";
  el("noteSucursal").textContent = a.pvr
    ? `${base} Con los filtros actuales, ${nf.format(a.cambio)} de ${nf.format(a.pvr)} primeras visitas (${pct(div(a.cambio, a.pvr))}) ocurrieron en una sucursal distinta a la que eligió el lead; por eso los resultados se leen por sucursal real.`
    : base;
}

/* ===== Tooltip ===== */
const tip = el("tip");
on(document, "mousemove", e => {
  const t = e.target.closest("[data-tip]");
  if (!t) { tip.hidden = true; return; }
  tip.innerHTML = decodeURIComponent(t.dataset.tip); tip.hidden = false;
  const r = tip.getBoundingClientRect();
  tip.style.left = Math.min(e.clientX + 14, window.innerWidth - r.width - 8) + "px";
  tip.style.top = Math.min(e.clientY + 14, window.innerHeight - r.height - 8) + "px";
});

function renderCharts() { renderDiario(); renderMes(); renderReg(); renderLine("cCag", "legCag", "citas", "Costo por cita agendada"); renderLine("cCpvr", "legCpvr", "pvr", "Costo por primera visita"); renderWeekly(); }
function render() { paintFilters(); renderKpis(); renderFunnel(); renderOrigen(); renderLocal(); renderCanal(); renderDesglose(); renderCharts(); renderNotes(); }
/* Menú lateral plegable (preferencia de pantalla, aparte de los filtros) */
const wrapEl = document.querySelector(".wrap"), sideToggle = el("sideToggle"), sideEl = document.querySelector(".side");
const sideBadge = document.createElement("button"); sideBadge.type = "button"; sideBadge.className = "side-badge"; sideEl.appendChild(sideBadge);
let plegado = false;
try { plegado = localStorage.getItem("reporte-transversal-menu") === "plegado"; } catch (e) {}
function pintarPliegue() {
  wrapEl.classList.toggle("plegado", plegado);
  sideToggle.setAttribute("aria-expanded", String(!plegado));
  sideToggle.title = plegado ? "Mostrar el menú de sucursales" : "Plegar el menú de sucursales";
  sideToggle.firstElementChild.textContent = plegado ? "›" : "‹";
  sideBadge.textContent = state.sucs.length === 0 ? "∀" : String(state.sucs.length);
  sideBadge.title = `${sucsLabel()} · clic para abrir el menú`;
}
const alternarPliegue = () => { plegado = !plegado; try { localStorage.setItem("reporte-transversal-menu", plegado ? "plegado" : "abierto"); } catch (e) {} pintarPliegue(); clearTimeout(resizeT); resizeT = setTimeout(renderCharts, 200); };
on(sideToggle, "click", alternarPliegue); on(sideBadge, "click", alternarPliegue);
pintarPliegue();
/* Botones flotantes: volver al menú (siempre), inicio y salir (solo en el sitio) */
const irMenu = el("irMenu");
const enSitio = typeof opciones === "object" && !!opciones && !!opciones.sitio;
/* En el artefacto, Inicio y Salir se ven como vista previa (Alin, 2026-10-08) pero no hacen nada: no hay sesión ni lista de reportes. */
[el("irInicio"), el("irSalir")].forEach(a => { a.hidden = false; if (!enSitio) { a.setAttribute("href", "#"); a.title = "Solo funciona en el sitio publicado"; a.classList.add("fl-preview"); on(a, "click", e => e.preventDefault()); } });
const pintarFlotante = () => { irMenu.hidden = window.scrollY < 240; };
on(window, "scroll", pintarFlotante); pintarFlotante();
on(irMenu, "click", () => { if (plegado) alternarPliegue(); window.scrollTo({ top: 0, behavior: "smooth" }); });
on(window, "resize", () => { clearTimeout(resizeT); resizeT = setTimeout(renderCharts, 150); });
renderMesButtons(); renderSelects(); renderTabs(); render(); renderPerfil();

/* ===== BigQuery ===== */
const pill = el("statusPill"), msg = el("statusMsg"), btn = el("btnRefresh");
function setStatus(kind, label, text) { pill.className = "pill " + kind; pill.textContent = label; msg.textContent = text; }
let retried = false, seq = 0, pseq = 0;
async function runSql(tipo, force) {
  const res = await fetch("/api/transversal", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tipo, estado: state, force: !!force }) });
  if (res.status === 401 || res.redirected) throw { code: "sesion" };
  const p = await res.json().catch(() => ({}));
  if (!res.ok) throw { code: p.code || "tool_error", message: p.error || res.statusText };
  if (!vivo) throw { code: "cerrado" };
  return { rows: p.rows, at: new Date(p.at) };
}
async function loadOptions(force) {
  try {
    const { rows } = await runSql("opciones", force);
    if (!rows) return;
    OPTIONS = {};
    rows.forEach(r => { (OPTIONS[r.k] = OPTIONS[r.k] || []).push({ v: r.v == null ? "" : String(r.v), n: Number(r.n) || 0 }); });
    renderSelects(); renderTabs();
  } catch (e) { /* los selects se quedan con lo fijo */ }
}
async function refreshReg(force) {
  try { const { rows } = await runSql("registros", force); if (!rows) return;
    RROWS = rows.map(r => ({ mes: String(r.mes), canal: String(r.canal), origen: String(r.origen), registros: +r.registros || 0 })); render();
  } catch (e) { /* registros se quedan en cero */ }
}
async function refreshWeekly(force) {
  if (!hay("local") && !hay("wk")) return;
  if (!state.sucs.length || !localRegions().length) { WEEKS = []; renderLocal(); renderWeekly(); return; }
  try { const { rows } = await runSql("semanal", force); if (!rows) return;
    WEEKS = rows.map(r => ({ semana: String(r.semana).slice(0, 10), leads: +r.leads || 0, citas: +r.citas || 0, pvr: +r.pvr || 0, inv_asig: +r.inv_asig || 0, leads_all: +r.leads_all || 0, inv_all: +r.inv_all || 0 })).sort((a, b) => a.semana < b.semana ? -1 : 1);
    renderLocal(); renderWeekly();
  } catch (e) { WEEKS = []; renderLocal(); renderWeekly(); }
}
let dseq = 0;
async function refreshDiario(force) {
  if (!hay("diario")) return;
  const my = ++dseq;
  try {
    const { rows } = await runSql("diario", force);
    if (my !== dseq || !rows) return;
    DROWS = rows.map(r => ({ dia: String(r.dia).slice(0, 10), leads: +r.leads || 0, citas: +r.citas || 0, pvr: +r.pvr || 0 })).sort((a, b) => a.dia < b.dia ? -1 : 1);
    renderDiario();
  } catch (e) { /* la sección conserva lo anterior */ }
}
async function refreshPerfil(force) {
  if (!hay("perfil")) return;
  const my = ++pseq;
  try {
    const { rows } = await runSql("perfil", force);
    if (my !== pseq || !rows) return;
    PROWS = parseRows(rows); renderPerfil();
  } catch (e) { /* la sección conserva lo anterior */ }
}
async function refresh(force) {
  const my = ++seq;
  btn.disabled = true;
  setStatus("snap", "Consultando", "Consultando BigQuery…");
  refreshPerfil(force); refreshReg(force); refreshWeekly(force); refreshDiario(force);
  try {
    const { rows, at } = await runSql("principal", force);
    if (my !== seq) return;
    if (!rows) throw { code: "empty" };
    ALL = parseRows(rows); applyCanal();
    render();
    setStatus(rows.length ? "live" : "snap", rows.length ? "Al día" : "Sin filas",
      rows.length ? `Datos de BigQuery consultados el ${at.toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}.` : "BigQuery no devolvió leads con estos filtros.");
  } catch (err) {
    if (my !== seq) return;
    const code = err && err.code;
    if (err && err.retryable && !retried) { retried = true; setTimeout(() => refresh(force), (err.retryAfterMs || 1500) + Math.random() * 1000); return; }
    const map = {
      sesion: "Tu sesión terminó. Recarga la página y vuelve a entrar.",
      tool_error: `BigQuery rechazó la consulta (${esc((err.message || "").slice(0, 160))}).`,
      empty: "BigQuery no devolvió filas."
    };
    setStatus("err", "Sin conexión", map[code] || "No se pudo consultar BigQuery en este momento.");
  } finally { if (my === seq) btn.disabled = false; }
}
btn.addEventListener("click", () => { retried = false; loadOptions(true); refresh(true); });

btn.hidden = false;
loadOptions(false);
refresh(false);

return () => { vivo = false; clearTimeout(resizeT); escuchas.forEach(([t, ev, fn]) => t.removeEventListener(ev, fn)); };
}
