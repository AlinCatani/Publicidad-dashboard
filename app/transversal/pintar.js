// Pintado del Reporte Transversal+Ole, portado de la v14 del artefacto (2026-10-06).
// Diferencias con el artefacto: (1) el SQL no está aquí, lo arma el servidor en consultas.ts a partir
// del estado (filtros) que se le manda; (2) los datos llegan por /api/transversal, no por el conector MCP.
// `montar(raiz)` pinta dentro de `raiz` (que ya trae el marcado) y devuelve la función que limpia.
import { MAPA_PATHS, MAPA_BOX, MAPA_PAIS, MAPA_ETIQ } from "./mapa.js";
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
/* Territorio (Alin, 2026-10-15): México = número nacional y sucursal de México; Internacional = número extranjero y
   sucursal de México, «No sé» o sin sucursal; USA = número extranjero y sucursal de Estados Unidos. */
const TERR = { mexico: ["MEX", "México", "Número nacional (+52) y sucursal de México"], internacional: ["INT", "Internacional", "Número extranjero y sucursal de México, «No sé» o sin sucursal"], usa: ["USA", "USA", "Número extranjero y sucursal de Estados Unidos (Houston, Orange County, New York, Miami)"] };
const terrLabel = () => state.terr ? ` · ${TERR[state.terr][1]}` : "";
const sucsLabel = () => (state.sucs.length === 0 ? "Todas las sucursales" : state.sucs.length === 1 ? `Sucursal ${sucName(state.sucs[0])}` : `${state.sucs.length} sucursales`) + terrLabel();
const ORIGENES = [
  { k: "local", name: "Campaña local", sub: "región de la sucursal" },
  { k: "nacional", name: "Campañas nacionales", sub: "región nacional" },
  { k: "otras", name: "Campañas de otras regiones", sub: "otras ciudades, Texas, turismo" },
  { k: "sin_campana", name: "Sin campaña pagada", sub: "orgánico o sin UTM" }
];
/* Dimensiones: filtro (select), desglose por campaña (tabla) y desglose por paciente (tabla). */
/* Un reporte puede no traer todas las secciones (armarMarcado): lo que no está se pinta en un nodo suelto y no pasa nada. */
const byId = id => document.getElementById(id) || document.createElement("div");
const hay = sec => !!document.querySelector(`[data-sec="${sec}"]`);
const VACIO = "__vacio__"; // valor del select para «(vacío)»: distinto de "" (= Todas)
const DIMS = {
  sucursal_real: { label: "Sucursal" }, campaign: { label: "Campaña" }, medium: { label: "Medio" }, landing: { label: "Landing", top: 300 },
  region: { label: "Región" }, anuncio: { label: "Anuncio", top: 300 }, mensaje: { label: "Mensaje" },
  tipo_de_paciente: { label: "Tipo de paciente" }, perfil: { label: "Perfil" }, score: { label: "Score" }, user_persona: { label: "User persona" },
  grupo_edad: { label: "Grupo de edad", sortKey: true }, es_leading: { label: "LeadING", fixed: ["LeadING", "No LeadING"] }, ole: { label: "OLE", fixed: ["OLE", "Con campaña"] }, internacional: { label: "Nacional / Internacional", fixed: ["Nacional", "Internacional"] }, estado: { label: "Estado de residencia" }, unidad: { label: "Unidad de negocio" }, octante: { label: "Octantes" }, etapa: { label: "Etapa" }, motivo: { label: "Motivo" }, necesidad: { label: "Necesidad" },
  canal: { label: "Meta / Google" }, mes: { label: "Mes" }
};
const FILTER_ROW1 = ["sucursal_real", "campaign", "medium", "landing", "region", "anuncio", "mensaje"]; // sucursal también como filtro (Alin, 2026-10-22); es la misma selección que el menú lateral
const FILTER_ROW2 = ["tipo_de_paciente", "perfil", "score", "octante", "user_persona", "grupo_edad", "es_leading", "ole", "internacional", "estado", "etapa", "motivo", "necesidad"];
const FILTER_DIMS = FILTER_ROW1.concat(FILTER_ROW2);
const DESG_DIMS = ["campaign", "medium", "landing", "region", "anuncio", "mensaje", "sucursal_real", "etapa", "unidad"]; // «canal» (Meta/Google/otros) salió de los botones el 2026-10-15 a pedido de Alin; el servidor lo sigue aceptando
const PERFIL_DIMS = ["tipo_de_paciente", "perfil", "score", "octante", "user_persona", "es_leading", "grupo_edad", "internacional", "estado", "motivo", "necesidad"]; // + octantes y estado de residencia (Alin, 2026-10-27) // Nacional / Internacional como barras apiladas (Alin, 2026-10-22)

/* Sucursales: abreviatura y grupo de color (mx = verde del logo, us = azul marino, tur = dorado). */
const SUC = {
  "CIUDAD DE MEXICO": ["CDMX", "mx"], "MONTERREY": ["MTY", "mx"], "GUADALAJARA": ["GDL", "mx"], "PUEBLA": ["PUE", "mx"], "TIJUANA": ["TIJ", "mx"],
  "CANCUN": ["CUN", "mx"], "MERIDA": ["MID", "mx"], "QUERETARO": ["QRO", "mx"], "VERACRUZ": ["VER", "mx"], "TOLUCA": ["TOL", "mx"],
  "CIUDAD JUAREZ": ["CJS", "mx"], "LEON": ["LEO", "mx"], "MORELIA": ["MOR", "mx"], "MEXICALI": ["MXL", "mx"], "CHIHUAHUA": ["CHI", "mx"],
  "AGUASCALIENTES": ["AGS", "mx"], "HERMOSILLO": ["HMO", "mx"], "MAZATLAN": ["MZT", "mx"], "PUERTO VALLARTA": ["VTA", "mx"],
  "HOUSTON": ["HOU", "us"], "ORANGE COUNTY": ["OCO", "us"], "NEW YORK": ["NYC", "us"], "MIAMI": ["MIA", "us"],
  "NO SE": ["No sé", "tur"], "INTERNACIONAL": ["INT", "tur"], "SIN SUCURSAL": ["S/S", "tur"]
};
const sucInfo = v => SUC[v] || [String(v || "").replace(/[^A-Z]/g, "").slice(0, 3) || "—", "tur"];
const sucName = v => v ? v.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase()).replace("Ciudad De Mexico", "Ciudad de México").replace("Ciudad Juarez", "Ciudad Juárez").replace("Cancun", "Cancún").replace("Merida", "Mérida").replace("Queretaro", "Querétaro").replace("Leon", "León").replace("Mazatlan", "Mazatlán").replace("No Se", "No sé") : "(vacío)";

/* ===== Formato ===== */
const nf = new Intl.NumberFormat("es-MX");
const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat("es-MX", { notation: "compact", maximumFractionDigits: 1 });
const pct = v => isFinite(v) ? (v * 100).toLocaleString("es-MX", { maximumFractionDigits: 1 }) + "%" : "—";
const money = v => isFinite(v) ? mxn.format(v) : "—";
/* Montos grandes en tarjeta: $201.1 M en vez de $201,092,156, para que quepan (Alin, 2026-10-27: «que entre el importe vendido»). */
const moneyK = v => !isFinite(v) ? "—" : Math.abs(v) >= 1e6 ? `$${(v / 1e6).toLocaleString("es-MX", { maximumFractionDigits: 1 })} M` : mxn.format(v);
const div = (a, b) => b ? a / b : NaN;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmtDate = s => new Date(s + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }).replace(/\./g, "");
const today = iso(new Date());

/* ===== Estado ===== */
const MES_MET_KEYS = ["leads", "citas", "pvr", "ventas"];
const MAX_VALS_F = 200; // valores por filtro; igual que MAX_VALS en consultas.ts
/* Nivel «resultados» (acceso por usuario, 2026-10-27): el sitio pone data-nivel en la raíz y la API ya no manda dinero.
   Aquí solo se esconde lo que lo mostraría (tarjetas, columnas y secciones de montos) para que no queden huecos. */
const raizNivel = (typeof raiz !== "undefined" && raiz) || document.querySelector(".rt"); // en el artefacto no hay `raiz` (se quita el envoltorio montar)
const SIN_MONTOS = !!(raizNivel && raizNivel.dataset && raizNivel.dataset.nivel === "resultados");
if (SIN_MONTOS && raizNivel.classList) raizNivel.classList.add("sin-montos");
const state = { desde: MIN_DATE, hasta: today, mes: "todo", canal: "todos", modo: "directo", terr: "", diaMet: "leads", gran: "dia", evolGran: "dia", desgMet: "leads", desgGran: "dia", regMet: "registros", regGran: "dia", costoMet: "leads", costoVista: "pagado", horaMet: "registros", mapaMet: "leads", vistaPerfil: "tabla", dim: "campaign", pdim: "tipo_de_paciente", sucs: [], f: {} }; // arranca en ALL y con todos los medios (Alin, 2026-10-15): «no dejes fuera nada»
/* El filtro «Sucursal» de la barra y el menú lateral son la misma selección: state.f.sucursal_real es un alias de state.sucs
   (no enumerable, así no se guarda dos veces ni viaja al servidor como filtro aparte). */
Object.defineProperty(state.f, "sucursal_real", { get: () => state.sucs, set: v => { state.sucs = v; }, enumerable: false });
FILTER_DIMS.forEach(k => state.f[k] = []);
try {
  /* Cada pestaña guarda su estado en su propia URL (#f=…), además del localStorage compartido (Alin, 2026-10-28: con varias
     pestañas abiertas, recargar una le ponía los filtros de la última que tocó). Al cargar manda la URL de esa pestaña; si no
     trae nada (enlace limpio), se usa lo último guardado. */
  const deUrl = (() => { try { const m = (location.hash || "").match(/[#&]f=([^&]+)/); return m ? JSON.parse(decodeURIComponent(m[1])) : null; } catch (e) { return null; } })();
  const s = deUrl || JSON.parse(localStorage.getItem("reporte-transversal-v3") || "{}");
  if (Array.isArray(s.sucs)) state.sucs = s.sucs.filter(v => typeof v === "string" && v).slice(0, 40);
  if (s.gran === "semana" || s.gran === "mes") state.gran = s.gran;
  if (MES_MET_KEYS.includes(s.diaMet)) state.diaMet = s.diaMet;
  if (s.evolGran === "semana") state.evolGran = "semana";
  if (MES_MET_KEYS.includes(s.desgMet)) state.desgMet = s.desgMet;
  if (["dia", "semana", "mes"].includes(s.desgGran)) state.desgGran = s.desgGran;
  if (["registros", "leads", "citas", "pvr", "ventas"].includes(s.regMet)) state.regMet = s.regMet;
  if (["dia", "semana", "mes"].includes(s.regGran)) state.regGran = s.regGran;
  if (["leads", "citas", "pvr", "ventas"].includes(s.costoMet)) state.costoMet = s.costoMet;
  if (s.costoVista === "ole") state.costoVista = "ole";
  if (["registros", "leads", "citas", "pvr", "ventas"].includes(s.horaMet)) state.horaMet = s.horaMet;
  if (["leads", "citas", "pvr", "ventas", "cpl"].includes(s.mapaMet)) state.mapaMet = s.mapaMet;
  if (s.vistaPerfil === "mapa") { state.vistaPerfil = "mapa"; state.pdim = "estado"; }
  if (typeof s.mesMet === "string") state.mesMet = s.mesMet;
  if (/^\d{4}-\d\d-\d\d$/.test(s.desde || "")) state.desde = s.desde < MIN_DATE ? MIN_DATE : s.desde;
  if (/^\d{4}-\d\d-\d\d$/.test(s.hasta || "")) state.hasta = s.hasta;
  if (s.modo === "indirecto") state.modo = "indirecto";
  if (TERR[s.terr]) state.terr = s.terr;
  if (s.dim && DESG_DIMS.includes(s.dim)) state.dim = s.dim;
  if (s.pdim && PERFIL_DIMS.includes(s.pdim)) state.pdim = s.pdim;
  if (s.f) FILTER_DIMS.forEach(k => { const v = s.f[k]; if (Array.isArray(v)) state.f[k] = v.filter(x => typeof x === "string" && x).slice(0, MAX_VALS_F); else if (typeof v === "string" && v) state.f[k] = [v]; });
  const viejo = { Leading: "LeadING", "No leading": "No LeadING" }; state.f.es_leading = state.f.es_leading.map(v => viejo[v] || v);
} catch (e) {}
if (state.hasta < state.desde) state.hasta = state.desde;
const save = () => { try { localStorage.setItem("reporte-transversal-v3", JSON.stringify(state)); } catch (e) {}
  try { const f = {}; Object.keys(state.f).forEach(k => { if (state.f[k].length) f[k] = state.f[k]; }); const url = "#f=" + encodeURIComponent(JSON.stringify({ ...state, f })); if (location.hash !== url) history.replaceState(null, "", url); } catch (e) {} };
/* La URL de la pestaña se fija desde que carga (no solo al tocar un filtro): así una pestaña abierta antes de este cambio, o recién
   abierta, ya queda independiente de las demás en cuanto se recarga (2026-10-28, lo que le pasaba a Juan). */
try { const f = {}; Object.keys(state.f).forEach(k => { if (state.f[k].length) f[k] = state.f[k]; }); history.replaceState(null, "", "#f=" + encodeURIComponent(JSON.stringify({ ...state, f }))); } catch (e) {}
const channels = () => state.canal === "pagado" ? ["meta", "google"] : state.canal === "todos" ? ["meta", "google", "otros"] : [state.canal];
/* Meses dentro del periodo elegido */
function monthsSel() {
  const out = []; let d = new Date(state.desde.slice(0, 7) + "-01T12:00:00");
  const end = state.hasta.slice(0, 7);
  while (iso(d).slice(0, 7) <= end) { out.push({ key: iso(d).slice(0, 7), short: d.toLocaleDateString("es-MX", { month: "short" }).replace(".", ""), long: d.toLocaleDateString("es-MX", { month: "long" }) }); d.setMonth(d.getMonth() + 1); }
  return out;
}

const REG_SKIP = { perfil: 1, es_leading: 1, internacional: 1, unidad: 1 };
/* ===== Datos ===== */
let ALL = [], ROWS = [], PROWS = [], RROWS = [], RDROWS = [], CROWS = [], HROWS = [], HRROWS = [], WEEKS = [], DROWS = [], GROWS = [], AROWS = [], MAPROWS = [], OPTIONS = null, OPTIONS_F = null; // OPTIONS: histórico completo (menú y colores); OPTIONS_F: en cascada con los filtros (selects)
let MROWS = [];
const inMes = r => state.mes === "todo" || r.mes === state.mes;
const applyCanal = () => { const chs = channels(); MROWS = ALL.filter(r => chs.includes(r.canal)); ROWS = MROWS.filter(inMes); };
const prevMonthKey = () => { if (state.mes === "todo") return null; const d = new Date(state.mes + "-01T12:00:00"); d.setMonth(d.getMonth() - 1); return iso(d).slice(0, 7); };
/* OLE = leads orgánicos: sin campaña pagada (campaign no empieza con "paid"), de todos los medios. */
const ole = () => sum(ALL.filter(r => r.origen === "sin_campana" && inMes(r)));
/* ventas = BEC de BIT cruzadas por correo con el lead (2026-10-27); importe en MXN (USD × 18). */
const METRICS = ["leads", "citas", "pvr", "cambio", "inversion", "ventas", "importe"];
const blank = () => ({ leads: 0, citas: 0, pvr: 0, cambio: 0, inversion: 0, ventas: 0, importe: 0 });
function sum(rows) { const o = blank(); rows.forEach(r => METRICS.forEach(m => o[m] += r[m])); return o; }
const byCanal = c => ROWS.filter(r => r.canal === c);
const regSum = rows => rows.reduce((t, r) => t + r.registros, 0);
const regBy = (canal, mes, origen) => regSum(RROWS.filter(r => (!canal || r.canal === canal) && (mes ? r.mes === mes : inMes(r)) && (!origen || r.origen === origen)));
const regTotal = () => regBy(null, null, null);
const parseRows = rows => rows.map(r => ({ mes: r.mes == null ? "" : String(r.mes), canal: r.canal == null ? "" : String(r.canal), origen: r.origen == null ? "" : String(r.origen), dim: r.dim == null ? "" : String(r.dim),
  leads: +r.leads || 0, citas: +r.citas || 0, pvr: +r.pvr || 0, cambio: +r.cambio || 0, inversion: +r.inversion || 0, ventas: +r.ventas || 0, importe: +r.importe || 0 }));

/* ===== Periodo ===== */
const periodBtn = byId("periodBtn"), periodPop = byId("periodPop");
const dDesde = byId("dDesde"), dHasta = byId("dHasta");
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
byId("pApply").addEventListener("click", () => { if (dDesde.value && dHasta.value) applyPeriod(dDesde.value, dHasta.value); });
byId("pQuick1").addEventListener("click", () => applyPeriod(today.slice(0, 7) + "-01", today));
byId("pQuick2").addEventListener("click", () => { const d = new Date(); d.setMonth(d.getMonth() - 2); applyPeriod(iso(d).slice(0, 7) + "-01", today); });
byId("pQuick3").addEventListener("click", () => applyPeriod(MIN_DATE, today));

/* ===== Mes (filtro rápido dentro del periodo) ===== */
const fMes = byId("fMes");
function renderMesButtons() {
  const ms = monthsSel();
  if (state.mes !== "todo" && !ms.some(m => m.key === state.mes)) state.mes = "todo";
  fMes.innerHTML = `<button type="button" data-v="todo">Todo</button>` + ms.map(m => `<button type="button" data-v="${m.key}">${cap(m.short)}</button>`).join("");
}
fMes.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; state.mes = b.dataset.v; save(); applyCanal(); render(); refreshPerfil(false); refreshDiario(false); refreshAds(false); refreshMapa(false); });

/* ===== Reporte Directo / Indirecto: botón maestro; cambia toda la data (regla pendiente de Alin) y el color del reporte ===== */
const rtEl = document.querySelector(".rt") || document.body;
function pintarModo() {
  byId("fModo").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === state.modo)));
  byId("fUnidad").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String((state.f.unidad.length === 1 ? state.f.unidad[0] : "") === b.dataset.v)));
  rtEl.classList.toggle("indirecto", state.modo === "indirecto");
  const ind = state.modo === "indirecto";
  byId("modoNote").textContent = ind
    ? "Indirecto: leads por su fecha de creación; citas agendadas por la fecha programada (BIC) y primeras visitas por la fecha de la visita (BIP). Todo lo que ocurre en el periodo o mes elegido, aunque el lead sea anterior."
    : "Directo: todo sigue al lead por su fecha de creación (cohorte); sus citas y visitas se cuentan aunque ocurran después.";
  byId("noteCohorte").textContent = ind
    ? "Reporte indirecto: los leads se cuentan por su fecha de creación, las citas agendadas por BIC.FechaCitaProg y las primeras visitas por BIP.FechaPrimeraVisita, cada una dentro del periodo y mes elegidos. Las tasas (lead → cita, TAL%) cruzan cosas de distinta fecha; úsalas como ritmo del mes, no como conversión de una cohorte."
    : "El periodo filtra por fecha de creación del lead; sus citas agendadas y visitas se cuentan aunque ocurran después. Los últimos meses siguen madurando y sus tasas subirán.";
}
/* Unidad de negocio junto a Directo / Indirecto (Alin, 2026-10-28: «es un filtro muy importante»): es el filtro `unidad` de la barra, en botones. */
on(byId("fUnidad"), "click", e => { const b = e.target.closest("button"); if (!b) return; state.f.unidad = b.dataset.v ? [b.dataset.v] : []; save(); renderSelects(); paintFilters(); renderTabs(); refresh(false); });
on(byId("fModo"), "click", e => { const b = e.target.closest("button"); if (!b) return; state.modo = b.dataset.v; save(); pintarModo(); loadOptions(false); refresh(false); });
pintarModo();

/* ===== Canal, desglose, perfil ===== */
byId("fCanal").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; state.canal = b.dataset.v; save(); applyCanal(); render(); refreshPerfil(false); refreshDiario(false); refreshReg(false); refreshAds(false); refreshMapa(false); });
const fDim = byId("fDim");
fDim.innerHTML = DESG_DIMS.map(k => `<button type="button" data-v="${k}">${DIMS[k].label}</button>`).join("");
fDim.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; state.dim = b.dataset.v; save(); paintFilters(); refresh(false); refreshDesgDiario(false); });
const fPerfil = byId("fPerfil");
fPerfil.innerHTML = PERFIL_DIMS.map(k => `<button type="button" data-v="${k}">${DIMS[k].label}</button>`).join("") + `<button type="button" data-v="mapa" title="Estado de residencia en mapa">Mapa</button>`; // «Mapa»: vista de mapa del estado de residencia, en lugar de la tabla (Alin, 2026-10-27)
fPerfil.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.v === "mapa") { state.vistaPerfil = "mapa"; state.pdim = "estado"; } else { state.vistaPerfil = "tabla"; state.pdim = b.dataset.v; } save(); paintFilters(); vistaPerfil(); refreshPerfil(false); refreshDiario(false); refreshMapa(false); });
/* Clic en un estado del mapa (Alin, 2026-10-27): filtra TODO el reporte por ese estado de residencia (es el mismo filtro «Estado de
   residencia» de la barra, así que aparece como chip y se quita igual); otro clic en el mismo estado lo quita. */
on(byId("cMapa"), "click", e => {
  const p = e.target.closest("path[data-estado]"); if (!p || !p.dataset.estado) return;
  const v = p.dataset.estado;
  state.f.estado = state.f.estado.length === 1 && state.f.estado[0] === v ? [] : [v];
  save(); renderSelects(); paintFilters(); renderTabs(); refresh(false);
});
/* Tabla o mapa: el mapa ocupa el lugar de la tabla; la tendencia de abajo sigue abierta por estado. */
function vistaPerfil() { const mapa = state.vistaPerfil === "mapa"; byId("vistaTablaPerfil").hidden = mapa; byId("bloqueMapa").hidden = !mapa; }

/* ===== Filtros de varias opciones: botón + desplegable con casillas, «Todas» y «Solo» ===== */
const selVal = o => o.v === "" ? VACIO : o.v, selLabel = (v, k) => v === VACIO ? "(vacío)" : k === "sucursal_real" ? sucName(v) : v;
function selOpts(k) {
  const d = DIMS[k];
  const fuente = OPTIONS_F || OPTIONS; // en cascada (Looker): cada filtro lista solo lo que queda con los demás filtros
  let opts = d.fixed ? d.fixed.map(v => ({ v, n: null })) : ((fuente && fuente[k]) || []).slice(0, d.top || 200);
  if (d.sortKey) opts = opts.slice().sort((a, b) => a.v.localeCompare(b.v, "es", { numeric: true }));
  const faltan = state.f[k].filter(v => !opts.some(o => selVal(o) === v)).map(v => ({ v: v === VACIO ? "" : v, n: null }));
  return faltan.concat(opts);
}
function selResumen(k) { const c = state.f[k]; return c.length === 0 ? "Todas" : c.length === 1 ? selLabel(c[0], k) : `${c.length} elegidas`; }
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
  const opts = selOpts(k).filter(o => !qn || selLabel(selVal(o), k).toLowerCase().includes(qn));
  pop.querySelector(".sel-all").disabled = cur.length === 0;
  /* «Marcar» / «Quitar» actúan sobre lo visible: con una búsqueda (p. ej. «web») marcan todas las coincidencias de un golpe (Alin, 2026-10-22) */
  const vis = opts.map(selVal), faltan = vis.filter(v => !cur.includes(v)).length, sobran = vis.length - faltan;
  const bm = pop.querySelector(".sel-marcar"), bq = pop.querySelector(".sel-quitar");
  bm.textContent = qn ? `Marcar ${faltan}` : `Marcar todas`; bm.disabled = faltan === 0; bm.title = qn ? `Marcar las ${faltan} opciones que coinciden con «${q.trim()}»` : "Marcar todas las opciones";
  bq.textContent = qn ? `Quitar ${sobran}` : `Quitar`; bq.disabled = sobran === 0; bq.title = qn ? `Quitar las ${sobran} marcadas que coinciden con «${q.trim()}»` : "Quitar las marcadas";
  pop.querySelector(".sel-list").innerHTML = opts.map(o => { const v = selVal(o), on = cur.includes(v);
    return `<label class="sel-opt${on ? " on" : ""}"><input type="checkbox" value="${esc(v)}"${on ? " checked" : ""}><b>${esc(selLabel(v, k))}</b>${o.n != null ? `<small>${compact.format(o.n)}</small>` : ""}<button type="button" class="sel-solo" data-v="${esc(v)}" title="Solo esta opción">Solo</button></label>`; }).join("") || `<div class="sel-nada">Sin coincidencias</div>`;
}
function abrirSel(host) {
  if (selAbierto === host) { cerrarSel(); return; }
  cerrarSel();
  const k = host.dataset.k;
  const pop = document.createElement("div"); pop.className = "sel-pop"; pop.setAttribute("role", "listbox"); pop.setAttribute("aria-label", DIMS[k].label);
  pop.innerHTML = `<div class="sel-top"><button type="button" class="sel-all" title="Sin filtro: todas las opciones">Todas</button>${selOpts(k).length > 8 ? `<input type="search" class="sel-q" placeholder="Buscar…" aria-label="Buscar opción">` : ""}<button type="button" class="sel-all sel-marcar">Marcar todas</button><button type="button" class="sel-all sel-quitar">Quitar</button></div><div class="sel-list"></div>`;
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
    const visibles = () => { const qn = ((pop.querySelector(".sel-q") || {}).value || "").trim().toLowerCase(); return selOpts(k).map(selVal).filter(v => !qn || selLabel(v, k).toLowerCase().includes(qn)); };
    if (b.classList.contains("sel-marcar")) { const cur = state.f[k]; visibles().forEach(v => { if (!cur.includes(v)) cur.push(v); }); state.f[k] = cur.slice(0, MAX_VALS_F); }
    else if (b.classList.contains("sel-quitar")) { const vis = new Set(visibles()); state.f[k] = state.f[k].filter(v => !vis.has(v)); }
    else if (b.classList.contains("sel-all")) state.f[k] = []; else if (b.classList.contains("sel-solo")) state.f[k] = [b.dataset.v]; else return;
    pintarSelLista(host); aplicar();
  });
  const q = pop.querySelector(".sel-q"); if (q) { q.addEventListener("input", () => pintarSelLista(host)); q.focus(); }
}
function renderSelects() {
  cerrarSel();
  byId("selects1").innerHTML = FILTER_ROW1.map(selectHtml).join("");
  byId("selects2").innerHTML = FILTER_ROW2.map(selectHtml).join("");
  document.querySelectorAll("#selects1 .sel-btn, #selects2 .sel-btn").forEach(b => b.addEventListener("click", () => abrirSel(b.parentElement)));
}
on(byId("filterNote"), "click", e => {
  const b = e.target.closest(".chip"); if (!b) return;
  if (b.dataset.all) FILTER_DIMS.forEach(k => state.f[k] = []);
  else if (b.dataset.todo) state.f[b.dataset.k] = [];
  else { const cur = state.f[b.dataset.k], i = cur.indexOf(b.dataset.v); if (i >= 0) cur.splice(i, 1); }
  save(); renderSelects(); paintFilters(); renderTabs(); refresh(false);
});
on(document, "click", e => { if (selAbierto && !selAbierto.contains(e.target)) cerrarSel(); });
on(document, "keydown", e => { if (e.key === "Escape") cerrarSel(); });

/* ===== Pestañas de sucursal ===== */
function renderTabs() {
  const host = byId("tabsSuc");
  const list = ((OPTIONS && OPTIONS.sucursal_real) || Object.keys(SUC).map(v => ({ v, n: 0 }))).filter(o => o.v !== "");
  const order = { mx: 0, us: 1, tur: 2 };
  list.sort((a, b) => order[sucInfo(a.v)[1]] - order[sucInfo(b.v)[1]] || (b.n || 0) - (a.n || 0));
  let lastG = null;
  host.innerHTML = `<button type="button" class="tab g-all" data-all="1" aria-pressed="${String(state.sucs.length === 0)}"><b>ALL</b></button>` +
    `<div class="tgroup">Territorio</div>` + Object.keys(TERR).map(k => `<button type="button" class="tab g-terr" data-terr="${k}" aria-pressed="${String(state.terr === k)}" title="${TERR[k][2]}"><b class="ab">${TERR[k][0]}</b><span class="nm">${TERR[k][1]}</span></button>`).join("") +
    list.map(o => { const [ab, g] = sucInfo(o.v); const head = g !== lastG ? `<div class="tgroup">${{ mx: "México", us: "Estados Unidos", tur: "Turismo médico" }[g]}</div>` : ""; lastG = g;
    return head + `<button type="button" class="tab g-${g}" data-v="${esc(o.v)}" aria-pressed="${String(state.sucs.includes(o.v))}"><b class="ab">${ab}</b><span class="nm">${esc(sucName(o.v))}</span></button>`; }).join("");
  host.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => {
    if (b.dataset.all) state.sucs = [];
    else if (b.dataset.terr) state.terr = state.terr === b.dataset.terr ? "" : b.dataset.terr;
    else { const v = b.dataset.v, i = state.sucs.indexOf(v); if (i >= 0) state.sucs.splice(i, 1); else state.sucs.push(v); }
    save(); paintFilters(); renderTabs(); refresh(false);
  }));
}

function paintFilters() {
  byId("fUnidad").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String((state.f.unidad.length === 1 ? state.f.unidad[0] : "") === b.dataset.v)));
  document.querySelectorAll("#fCanal button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === state.canal)));
  fMes.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === state.mes)));
  fDim.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === state.dim)));
  fPerfil.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(state.vistaPerfil === "mapa" ? b.dataset.v === "mapa" : b.dataset.v === state.pdim)));
  periodBtn.textContent = `${fmtDate(state.desde)} – ${fmtDate(state.hasta)} ▾`;
  byId("eyebrow").textContent = `Marketing · ${sucsLabel()}`;
  pintarPliegue();
  document.querySelectorAll('.sel[data-k="sucursal_real"]').forEach(pintarSelBtn);
  const chips = [];
  /* Un filtro con más de 3 valores se resume en un solo chip («Landing: 23 valores»), si no la barra se vuelve enorme (Alin, 2026-10-22) */
  FILTER_DIMS.forEach(k => { const vs = state.f[k];
    if (vs.length > 3) chips.push(`<button type="button" class="chip" data-k="${k}" data-todo="1" title="${esc(vs.map(v => selLabel(v, k)).join(", "))} · clic para quitar este filtro">${DIMS[k].label}: <b>${vs.length} valores</b><i>×</i></button>`);
    else vs.forEach(v => chips.push(`<button type="button" class="chip" data-k="${k}" data-v="${esc(v)}" title="Quitar este filtro">${DIMS[k].label}: <b>${esc(selLabel(v, k))}</b><i>×</i></button>`)); });
  byId("filterNote").innerHTML = chips.length
    ? `<span class="chips-lbl">Filtros activos:</span> ${chips.join("")}${chips.length > 1 ? `<button type="button" class="chip chip-all" data-all="1" title="Quitar todos los filtros">Quitar todos</button>` : ""}`
    : "Sin filtros: se muestran todas las sucursales, campañas y perfiles.";
}

/* ===== Publicidad: inversión real y métricas de atracción de los anuncios ===== */
function renderAds() {
  const t = AROWS.reduce((o, r) => { o.inversion += r.inversion; o.impresiones += r.impresiones; o.alcance += r.alcance; o.clics += r.clics; return o; }, { inversion: 0, impresiones: 0, alcance: 0, clics: 0 });
  const a = sum(ROWS), reg = regTotal();
  /* Con sucursales elegidas, la inversión es la asignada a sus leads (misma que el CPL); impresiones y clics se reparten en esa proporción (estimado). */
  const porSuc = (state.sucs.length > 0 || !!state.terr) && t.inversion > 0, share = porSuc ? Math.min(1, div(a.inversion, t.inversion) || 0) : 1;
  const est = porSuc ? " · estimado" : "";
  const inv = porSuc ? a.inversion : t.inversion, imp = t.impresiones * share, cl = t.clics * share;
  const items = [
    { k: "Inversión", v: inv, f: money, sub: porSuc ? `asignada a ${sucsLabel().toLowerCase()} · ${pct(share)} de ${money(t.inversion)} en estos anuncios` : "total de los anuncios con estos filtros" },
    { k: "Impresiones", v: imp, f: v => nf.format(Math.round(v)), sub: porSuc ? `${pct(share)} de ${compact.format(t.impresiones)}${est}` : t.alcance ? `${nf.format(t.alcance)} de alcance` : "" },
    { k: "Clics de enlace", v: cl, f: v => nf.format(Math.round(v)), sub: `CTR ${isFinite(div(t.clics, t.impresiones)) ? (div(t.clics, t.impresiones) * 100).toFixed(2) + "%" : "—"}${est}` },
    { k: "CPC", v: div(t.inversion, t.clics), f: money, sub: "inversión ÷ clics" },
    { k: "Registros", v: reg, f: nf.format, sub: `de registros_historico${cl ? ` · ${pct(div(reg, cl))} de clics` : ""}` },
    { k: "Leads", v: a.leads, f: nf.format, sub: `de leads (Airtable)${reg ? ` · ${pct(div(a.leads, reg))} de registros` : ""}` },
    { k: "CPL", v: div(a.inversion, a.leads), f: money, sub: "inversión asignada ÷ leads (igual que abajo)" }
  ];
  byId("kpisAds").innerHTML = items.map(it => `<div class="kpi"><span class="k">${it.k}</span><span class="v">${AROWS.length && isFinite(it.v) ? it.f(it.v) : "—"}</span><span class="d">${it.sub || ""}</span></div>`).join("");
  byId("adsHint").textContent = porSuc
    ? `Anuncios de Meta y Google con el periodo, medio, mes y UTM elegidos. La tabla de anuncios no sabe de sucursal: la inversión mostrada es la asignada a los leads de ${sucsLabel().toLowerCase()} y las impresiones y clics se estiman en esa misma proporción. Los filtros de perfil no aplican.`
    : "Anuncios de Meta y Google con el periodo, medio, mes y UTM elegidos. Elige sucursales para ver la parte asignada a ellas. Los filtros de perfil no aplican.";
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
    { k: "Registros", v: reg, f: nf.format, prev: has && preg },
    { k: "Leads", v: a.leads, f: nf.format, prev: has && p.leads, sub: reg ? `${pct(div(a.leads, reg))} de registros` : "" },
    { k: "CPL", v: div(a.inversion, a.leads), f: money, prev: has && div(p.inversion, p.leads), cost: true },
    { k: "Citas agendadas", v: a.citas, f: nf.format, prev: has && p.citas, sub: `${pct(div(a.citas, a.leads))} de leads` },
    { k: "Costo por cita agendada", v: div(a.inversion, a.citas), f: money, prev: has && div(p.inversion, p.citas), cost: true },
    { k: "Primeras visitas", v: a.pvr, f: nf.format, prev: has && p.pvr, sub: `${pct(div(a.pvr, a.citas))} de citas agendadas` },
    { k: "Costo por PVR", v: div(a.inversion, a.pvr), f: money, prev: has && div(p.inversion, p.pvr), cost: true },
    { k: "TAL% · lead → PVR", v: div(a.pvr, a.leads), f: pct, prev: has && div(p.pvr, p.leads) },
    { k: "Ventas (BEC)", v: a.ventas, f: nf.format, prev: has && p.ventas, sub: `${pct(div(a.ventas, a.pvr))} de primeras visitas` },
    { k: "Costo por venta", v: div(a.inversion, a.ventas), f: money, prev: has && div(p.inversion, p.ventas), cost: true },
    { k: "Importe vendido", v: a.importe, f: moneyK, prev: has && p.importe, din: true },
  ].filter(it => !(SIN_MONTOS && (it.cost || it.din))); // nivel «resultados»: sin tarjetas de dinero
  const prevName = pk ? new Date(pk + "-01T12:00:00").toLocaleDateString("es-MX", { month: "short" }).replace(".", "") : "";
  byId("kpis").innerHTML = items.map(it => {
    let d = it.sub || "", cls = "";
    if (it.prev && isFinite(it.prev) && isFinite(it.v)) {
      const ch = it.v / it.prev - 1, up = ch >= 0;
      d = `${up ? "▲" : "▼"} ${Math.abs(ch * 100).toFixed(1)}% vs ${prevName}`;
      if (!it.neutral) cls = (it.cost ? !up : up) ? "good" : "bad";
    }
    return `<div class="kpi${it.cls ? " " + it.cls : ""}"><span class="k">${it.k}</span><span class="v${ROWS.length ? (String(it.f(it.v)).length > 8 ? " muylarga" : String(it.f(it.v)).length > 6 ? " larga" : "") : ""}">${ROWS.length ? it.f(it.v) : "—"}</span><span class="d ${cls}">${d}</span></div>`;
  }).join("");
  /* Fila OLE con el mismo funnel que arriba (Alin, 2026-10-27): registros, leads, citas, PVR y ventas de los leads NO pagados, sin costos. */
  const o = ole(), oReg = regBy(null, null, "sin_campana"), po = pk ? sum(ALL.filter(r => r.origen === "sin_campana" && r.mes === pk)) : null;
  const oleItems = [
    { k: "Registros OLE", v: oReg, f: nf.format, prev: has && regBy(null, pk, "sin_campana"), sub: "sin campaña pagada" },
    { k: "Leads OLE", v: o.leads, f: nf.format, prev: has && po.leads, sub: oReg ? `${pct(div(o.leads, oReg))} de registros` : "" },
    { k: "Citas agendadas OLE", v: o.citas, f: nf.format, prev: has && po.citas, sub: `${pct(div(o.citas, o.leads))} de leads` },
    { k: "Primeras visitas OLE", v: o.pvr, f: nf.format, prev: has && po.pvr, sub: `${pct(div(o.pvr, o.citas))} de citas agendadas` },
    { k: "TAL% OLE", v: div(o.pvr, o.leads), f: pct, prev: has && div(po.pvr, po.leads) },
    { k: "Ventas OLE", v: o.ventas, f: nf.format, prev: has && po.ventas, sub: `${pct(div(o.ventas, o.pvr))} de primeras visitas` }
  ];
  let hostOle = document.getElementById("kpisOle");
  if (!hostOle) { hostOle = document.createElement("section"); hostOle.id = "kpisOle"; hostOle.className = "kpis kpis-ole"; hostOle.setAttribute("aria-label", "OLE"); byId("kpis").insertAdjacentElement("afterend", hostOle); }
  hostOle.innerHTML = oleItems.map(it => {
    let d = it.sub || "", cls = "";
    if (it.prev && isFinite(it.prev) && isFinite(it.v)) { const ch = it.v / it.prev - 1, up = ch >= 0; d = `${up ? "▲" : "▼"} ${Math.abs(ch * 100).toFixed(1)}% vs ${prevName}`; cls = up ? "good" : "bad"; }
    return `<div class="kpi ole"><span class="k">${it.k}</span><span class="v">${ROWS.length ? it.f(it.v) : "—"}</span><span class="d ${cls}">${d}</span></div>`;
  }).join("");
}

/* ===== Tabla genérica de resultados por valor ===== */
/* Columnas de la tabla: etiqueta, valor numérico (para ordenar) y formato. Clic en el encabezado ordena de mayor a menor por esa
   métrica; otro clic, de menor a mayor (Alin, 2026-10-27). */
const COLS_TABLA = [
  { h: "Leads", v: a => a.leads, f: a => nf.format(a.leads) },
  { h: "% leads", v: a => a.leads, f: (a, tot) => `<span class="share">${pct(div(a.leads, tot.leads))}<span class="bar"><i style="width:${(div(a.leads, tot.leads) * 100 || 0).toFixed(1)}%"></i></span></span>` },
  { h: "Citas agendadas", v: a => a.citas, f: a => nf.format(a.citas) },
  { h: "Lead → cita agendada", v: a => div(a.citas, a.leads), f: a => pct(div(a.citas, a.leads)) },
  { h: "PVR", v: a => a.pvr, f: a => nf.format(a.pvr) },
  { h: "TAL%", v: a => div(a.pvr, a.leads), f: a => pct(div(a.pvr, a.leads)) },
  { h: "Ventas", v: a => a.ventas, f: a => nf.format(a.ventas) },
  { h: "PVR → venta", v: a => div(a.ventas, a.pvr), f: a => pct(div(a.ventas, a.pvr)) },
  { h: "Inversión", v: a => a.inversion, f: a => money(a.inversion), din: true },
  { h: "CPL", v: a => div(a.inversion, a.leads), f: a => money(div(a.inversion, a.leads)), din: true, hl: true },
  { h: "Costo/cita agendada", v: a => div(a.inversion, a.citas), f: a => money(div(a.inversion, a.citas)), din: true, hl: true },
  { h: "Costo/PVR", v: a => div(a.inversion, a.pvr), f: a => money(div(a.inversion, a.pvr)), din: true, hl: true },
  { h: "Costo/venta", v: a => div(a.inversion, a.ventas), f: a => money(div(a.inversion, a.ventas)), din: true, hl: true },
  { h: "Importe vendido", v: a => a.importe, f: a => money(a.importe), din: true }
];
const ORDEN_TABLA = {}; // por tabla: { col, desc }
function resultTable(rows, label, nameFn, tablaId) {
  const tot = sum(rows);
  const groups = {};
  rows.forEach(r => { (groups[r.dim] = groups[r.dim] || []).push(r); });
  // Los leads sin dato en la característica (clave vacía) no se listan como fila: son pocos y confunden (Alin, 2026-10-15); siguen en el Total.
  let list = Object.keys(groups).filter(k => k !== "").map(k => ({ k, a: sum(groups[k]) }));
  const ord = ORDEN_TABLA[tablaId];
  if (ord) { const col = COLS_TABLA[ord.col]; const val = x => { const v = col.v(x.a); return isFinite(v) ? v : (ord.desc ? -Infinity : Infinity); }; list.sort((x, y) => (ord.desc ? val(y) - val(x) : val(x) - val(y)) || x.k.localeCompare(y.k, "es")); }
  else if (DIMS[state.pdim] && label === DIMS[state.pdim].label && DIMS[state.pdim].sortKey) list.sort((x, y) => x.k.localeCompare(y.k, "es", { numeric: true }));
  else list.sort((x, y) => y.a.leads - x.a.leads);
  const shown = list.slice(0, 30), rest = list.slice(30);
  if (rest.length) shown.push({ k: `Otros (${rest.length})`, a: sum(rest.flatMap(x => groups[x.k])), raw: true });
  const row = (name, a, cls) => `<tr${cls ? ` class="${cls}"` : ""}><td>${esc(name)}</td>${COLS_TABLA.map(c => `<td class="${c.hl ? "hl " : ""}${c.din ? "din" : ""}">${c.f(a, tot)}</td>`).join("")}</tr>`;
  const th = COLS_TABLA.map((c, i) => `<th class="${c.din ? "din " : ""}ord${ord && ord.col === i ? (ord.desc ? " on desc" : " on asc") : ""}" data-col="${i}" title="Ordenar por ${c.h}">${c.h}</th>`).join("");
  return { html: `<thead><tr><th>${label}</th>${th}</tr></thead>
     <tbody>${shown.map(x => row(x.raw ? x.k : nameFn(x.k), x.a)).join("")}${row("Total", tot, "total")}</tbody>`, n: list.length, rest: rest.length };
}
/* Lo mismo para las tablas que se pintan directo (Origen y Por mes): se reordenan las filas ya pintadas leyendo el número de la celda
   (quita $, % y comas); el Total se queda al final. Se vuelve a aplicar después de cada repintado. (Alin, 2026-10-27: «replícalo en todas») */
const ORDEN_DOM = {};
function aplicarOrdenDom(id) {
  const t = byId(id), ord = ORDEN_DOM[id], tb = t.querySelector("tbody"); if (!tb) return;
  t.querySelectorAll("thead th").forEach((th, i) => { if (i === 0) return; th.classList.add("ord"); th.dataset.col = i; th.classList.toggle("on", !!ord && ord.col === i); th.classList.toggle("desc", !!ord && ord.col === i && ord.desc); th.classList.toggle("asc", !!ord && ord.col === i && !ord.desc); });
  if (!ord) return;
  const num = tr => { const c = tr.children[ord.col]; const v = parseFloat((c ? c.textContent : "").replace(/[^0-9.\-]/g, "")); return isFinite(v) ? v : (ord.desc ? -Infinity : Infinity); };
  const filas = [...tb.querySelectorAll("tr")].filter(tr => !tr.classList.contains("total")), total = tb.querySelector("tr.total");
  filas.sort((x, y) => ord.desc ? num(y) - num(x) : num(x) - num(y)).forEach(tr => tb.appendChild(tr));
  if (total) tb.appendChild(total);
}
["tOrigen", "tMes"].forEach(id => on(byId(id), "click", e => {
  const th = e.target.closest("th.ord"); if (!th) return;
  const col = +th.dataset.col, ord = ORDEN_DOM[id];
  ORDEN_DOM[id] = !ord || ord.col !== col ? { col, desc: true } : ord.desc ? { col, desc: false } : null;
  if (ORDEN_DOM[id]) aplicarOrdenDom(id); else if (id === "tOrigen") renderOrigen(); else renderMes();
}));
/* Clic en un encabezado: ordena esa tabla por esa métrica, de mayor a menor; segundo clic invierte; tercero vuelve al orden normal. */
["tPerfil", "tDesg"].forEach(id => on(byId(id), "click", e => {
  const th = e.target.closest("th.ord"); if (!th) return;
  const col = +th.dataset.col, ord = ORDEN_TABLA[id];
  ORDEN_TABLA[id] = !ord || ord.col !== col ? { col, desc: true } : ord.desc ? { col, desc: false } : null;
  if (id === "tPerfil") renderPerfil(); else renderDesglose();
}));
const monthName = key => { const m = monthsSel().find(x => x.key === key); return m ? cap(m.long) : key; };
const dimName = (dim, k) => dim === "mes" ? monthName(k) : dim === "canal" ? (CH[k] || k) : dim === "sucursal_real" ? sucName(k) : (k || "(vacío)");

function renderDesglose() {
  const d = DIMS[state.dim];
  const t = resultTable(ROWS, d.label, k => dimName(state.dim, k), "tDesg");
  byId("tDesg").innerHTML = t.html;
  byId("desgHint").textContent = `${d.label}, ordenado por leads: ${t.n} valores${t.rest ? ` (se muestran 30 y el resto se agrupa en «Otros»)` : ""}. Los filtros de arriba aplican; la tendencia de abajo se abre por la misma dimensión.`;
}
function renderPerfil() {
  const d = DIMS[state.pdim];
  const t = resultTable(PROWS, d.label, k => dimName(state.pdim, k), "tPerfil");
  byId("tPerfil").innerHTML = t.html;
  if (state.vistaPerfil === "mapa") { byId("perfilHint").textContent = "Mapa: estado de residencia que declaró el lead, en escala de color (México, Estados Unidos y Canadá). Elige la métrica con los botones; pasa el cursor sobre un estado para ver el detalle. Los filtros de arriba aplican."; return; }
  byId("perfilHint").textContent = `CPL, costo por cita agendada y costo por primera visita por ${d.label.toLowerCase()}. Los filtros de arriba aplican; la tendencia de abajo se abre por la misma característica.`;
}


/* ===== Mapa por estado de residencia (Alin, 2026-10-27): escala de color sobre México y EE. UU.; la tabla de paciente no se toca ===== */
const MAPA_MET = { leads: ["Leads", nf.format], citas: ["Citas agendadas", nf.format], pvr: ["Primeras visitas", nf.format], ventas: ["Ventas", nf.format], cpl: ["CPL", money] };
/* nombre en los datos → nombre del trazo */
const MAPA_ALIAS = { "Veracruz de Ignacio de la Llave": "Veracruz", "Michoacán de Ocampo": "Michoacán", "Coahuila de Zaragoza": "Coahuila", "Pensilvania": "Pennsylvania", "Nuevo México": "New Mexico", "Carolina del Norte": "North Carolina", "Carolina del Sur": "South Carolina", "Nueva York": "New York", "Nueva Jersey": "New Jersey", "Distrito Federal": "Ciudad de México", "Estado de México": "México", "Queretaro": "Querétaro", "Yucatan": "Yucatán", "Nuevo Leon": "Nuevo León", "Michoacan": "Michoacán", "San Luis Potosi": "San Luis Potosí", "Mexico": "México" };
const MAPA_DATO = {}; Object.keys(MAPA_ALIAS).forEach(k => { if (!MAPA_DATO[MAPA_ALIAS[k]]) MAPA_DATO[MAPA_ALIAS[k]] = k; }); // trazo → nombre como viene en los datos
const fMapaMet = byId("fMapaMet");
fMapaMet.innerHTML = Object.keys(MAPA_MET).map(k => `<button type="button" data-v="${k}"${k === "cpl" ? ' class="din"' : ""}>${MAPA_MET[k][0]}</button>`).join("");
on(fMapaMet, "click", e => { const b = e.target.closest("button"); if (!b) return; state.mapaMet = b.dataset.v; save(); renderMapa(); });
const mezcla = (a, b, t) => "#" + [0, 1, 2].map(i => Math.round(parseInt(a.slice(1 + i * 2, 3 + i * 2), 16) * (1 - t) + parseInt(b.slice(1 + i * 2, 3 + i * 2), 16) * t).toString(16).padStart(2, "0")).join("");
function renderMapa() {
  if (!hay("perfil") || !document.getElementById("cMapa")) return;
  vistaPerfil();
  const met = state.mapaMet, [metN, fmt] = MAPA_MET[met];
  fMapaMet.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === met)));
  const porEstado = {}, fuera = [], nombreDato = {};
  MAPROWS.forEach(r => { const k = MAPA_ALIAS[r.dim] || r.dim; if (MAPA_PATHS[k]) { porEstado[k] = sum((porEstado[k] ? [porEstado[k]] : []).concat([r])); nombreDato[k] = r.dim; } else fuera.push(r); });
  const sel = state.f.estado.length === 1 ? (MAPA_ALIAS[state.f.estado[0]] || state.f.estado[0]) : null; // estado filtrado desde el mapa (o desde el filtro)
  const val = a => met === "cpl" ? div(a.inversion, a.leads) : a[met];
  const vals = Object.values(porEstado).map(val).filter(v => isFinite(v) && v > 0);
  const vmax = Math.max(1, ...vals), vmin = vals.length ? Math.min(...vals) : 0;
  const esc = v => !isFinite(v) || v <= 0 ? "#eef3fb" : mezcla("#dbe6f8", met === "cpl" ? "#a90707" : "#253f78", Math.sqrt((v - vmin) / Math.max(1e-9, vmax - vmin)));
  const [x0, y0, x1, y1] = MAPA_BOX;
  const paths = Object.keys(MAPA_PATHS).map(n => { const a = porEstado[n], v = a ? val(a) : NaN, nombre = nombreDato[n] || MAPA_DATO[n] || n; // nombre completo, como viene en los datos (Alin, 2026-10-27)
    const tipo = a ? `<div class="tt">${nombre}</div>` + tipRows([["Leads", nf.format(a.leads)], ["Citas agendadas", nf.format(a.citas)], ["Primeras visitas", nf.format(a.pvr)], ["Ventas", nf.format(a.ventas)], SIN_MONTOS ? null : ["Inversión", money(a.inversion)], SIN_MONTOS ? null : ["CPL", money(div(a.inversion, a.leads))]].filter(Boolean)) : `<div class="tt">${nombre}</div><div class="row"><span>Sin leads con estos filtros</span></div>`;
    const tip2 = (!a && MAPA_PAIS[n] === "CA" ? `<div class="tt">${n}</div><div class="row"><span>Canadá: el formulario no guarda la provincia; sus leads van en «Otro pais»</span></div>` : tipo) + (MAPA_PAIS[n] !== "CA" ? `<div class="row"><span>${sel === n ? "Clic para quitar el filtro" : "Clic para filtrar todo el reporte"}</span></div>` : "");
    return `<path d="${MAPA_PATHS[n]}" fill="${esc(v)}" class="${sel === n ? "sel" : ""}${MAPA_PAIS[n] !== "CA" ? " clic" : ""}" data-estado="${esc(MAPA_PAIS[n] === "CA" ? "" : nombre)}" data-tip="${encodeURIComponent(tip2)}"><title>${nombre}</title></path>`; }).join("");
  /* Abreviaturas sobre cada estado (Alin, 2026-10-27); los muy chicos (DC, RI, Tlaxcala…) solo con tooltip, para que no se encimen. */
  const etiq = Object.keys(MAPA_ETIQ).filter(n => MAPA_ETIQ[n][3] >= 180 && MAPA_ETIQ[n][2] >= y0).map(n => { const [ab, cx, cy, area] = MAPA_ETIQ[n]; const v = porEstado[n] ? val(porEstado[n]) : NaN; const osc = isFinite(v) && v > 0 && Math.sqrt((v - vmin) / Math.max(1e-9, vmax - vmin)) > 0.55;
    return `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" class="mapa-et${osc ? " clara" : ""}${area < 450 ? " chica" : ""}">${ab}</text>`; }).join("");
  byId("cMapa").innerHTML = `<svg class="mapa" viewBox="${x0 - 4} ${y0 - 4} ${x1 - x0 + 8} ${y1 - y0 + 8}" role="img" aria-label="${metN} por estado de residencia">${paths}${etiq}</svg>`;
  byId("mapaHintSel").textContent = sel ? `Filtrado por ${sel}: todo el reporte (leads, citas, PVR, ventas, sucursales…) muestra solo ese estado. Clic en el estado o en su chip de la barra para quitarlo.` : "";
  byId("legMapa").innerHTML = vals.length ? `<span class="mapa-esc">${fmt(vmin)} <i style="background:linear-gradient(90deg,#dbe6f8,${met === "cpl" ? "#a90707" : "#253f78"})"></i> ${fmt(vmax)}</span>` : "";
  const top = Object.keys(porEstado).map(n => [n, val(porEstado[n])]).filter(x => isFinite(x[1]) && x[1] > 0).sort((a, b) => met === "cpl" ? a[1] - b[1] : b[1] - a[1]).slice(0, 5);
  const sinMapa = fuera.filter(r => r[met === "cpl" ? "leads" : met] > 0).sort((a, b) => b.leads - a.leads).slice(0, 6).map(r => `${r.dim || "(vacío)"} ${nf.format(r[met === "cpl" ? "leads" : met])}`);
  byId("mapaNote").textContent = `${metN} por estado de residencia que declaró el lead. ${top.length ? (met === "cpl" ? "Menor CPL: " : "Mayores: ") + top.map(x => `${x[0]} ${fmt(x[1])}`).join(", ") + "." : ""}${sinMapa.length ? ` Sin estado en el mapa (Desconocido, vacío y «Otro pais», que incluye Canadá porque el formulario no guarda la provincia): ${sinMapa.join(", ")}.` : ""}`;
}
let mseq = 0;
async function refreshMapa(force) {
  if (!hay("perfil") || !document.getElementById("cMapa")) return;
  const my = ++mseq;
  try {
    const { rows } = await runSql("mapa", force);
    if (my !== mseq || !rows) return;
    MAPROWS = parseRows(rows); renderMapa();
  } catch (e) { /* el mapa conserva lo anterior */ }
}
/* ===== Funnel ===== */
const STAGES = [
  { m: "leads", name: "Leads", sub: "Airtable", cost: "CPL" },
  { m: "citas", name: "Citas agendadas", sub: "en BIC", conv: "de leads", cost: "Costo por cita agendada" },
  { m: "pvr", name: "Primeras visitas", sub: "realizadas", conv: "de citas agendadas", cost: "Costo por PVR" },
  { m: "ventas", name: "Ventas", sub: "BEC en BIT", conv: "de primeras visitas", cost: "Costo por venta" }
];
const legendHtml = chs => chs.map(c => `<span><i class="dot ${c}"></i>${CH[c]}</span>`).join("");
const tipRows = rows => rows.map(r => `<div class="row"><span>${r[0]}</span><b>${r[1]}</b></div>`).join("");
/* Colores de medio copiados de la gráfica «Medio» del Looker (Alin, 2026-10-27); los medios que ahí no salen (pmax, youtube, tiktok,
   display, instagram) toman colores libres de la misma paleta, fijos. */
const MEDIO_COL = { facebook: "#0072f0", google_search: "#7cb342", web: "#5e35b1", "(sin medio)": "#f48fb1", dgen: "#737373", socialmedia: "#f15a60", social_media: "#5a9bd4", google: "#ec407a", web_surrogate: "#7ac36a", presencial: "#f66d00", whatsapp: "#f10096", correo: "#faa75a", x: "#9e67ab", threads: "#d77fb3", "x-test": "#ce7058", pmax: "#00b6cb", youtube: "#ff7043", tiktok: "#03a9f4", display: "#81d4fa", instagram: "#ffa800", demand_gen: "#737373", meta: "#0072f0", otros: "#9aa7bd" };
const medioKey = m => (m == null || m === "" ? "(sin medio)" : String(m));
const medioNombre = m => CH[m] || m;
function renderFunnel() {
  /* Funnel PAGADO por MEDIO (Alin, 2026-10-27: «quiero ver youtube, tiktok, pmax, no solo Meta y Google»): todo lo que viene de campaña
     paid / paid_int / paid_us, un segmento por medio. Leads, citas, PVR, ventas e inversión salen de las filas por medio de la sección de
     costos (CROWS, pagado = 1); registros de RROWS y anuncios de AROWS, ya con medio. Lo no pagado va en el funnel de OLE abajo. */
  const esPagado = r => r.origen !== "sin_campana";
  const R = 46, SW = 14, C = 2 * Math.PI * R, GAP = 3;
  const ring = (inner, label) => `<svg class="donut" viewBox="0 0 120 120" role="img" aria-label="${label}"><g transform="rotate(-90 60 60)">${inner}</g></svg>`;
  const track = `<circle cx="60" cy="60" r="${R}" fill="none" class="ring-track" stroke-width="${SW}"/>`;
  const pendingCard = (n, why) => `<div class="dcard pending"><div class="dname">${n}</div>
      <div class="dslot"><div class="dwrap" style="width:100%">${ring(`<circle cx="60" cy="60" r="${R}" fill="none" class="ring-pending" stroke-width="${SW}"/>`, `${n}: pendiente`)}
        <div class="dcenter"><span class="dval na">—</span></div></div></div><div class="dline">${why}</div></div>`;
  const M = {}; const add = (m, k, v) => { const key = medioKey(m); M[key] = M[key] || { impresiones: 0, clics: 0, inv_ads: 0, registros: 0, leads: 0, citas: 0, pvr: 0, ventas: 0, inversion: 0 }; M[key][k] += v || 0; };
  const porMedio = CROWS.length > 0; // sin filas por medio (nivel «resultados» en el sitio) se parte por Meta / Google / otros
  if (porMedio) CROWS.filter(r => r.pagado === 1 && inMes(r)).forEach(r => ["leads", "citas", "pvr", "ventas", "inversion"].forEach(k => add(r.medio, k, r[k])));
  else ROWS.filter(esPagado).forEach(r => ["leads", "citas", "pvr", "ventas", "inversion"].forEach(k => add(r.canal, k, r[k])));
  RROWS.filter(r => inMes(r) && esPagado(r)).forEach(r => add(porMedio ? r.medio : r.canal, "registros", r.registros));
  AROWS.filter(r => inMes(r)).forEach(r => { const m = porMedio ? r.medio : r.canal; add(m, "impresiones", r.impresiones); add(m, "clics", r.clics); add(m, "inv_ads", r.inversion); });
  const medios = Object.keys(M).filter(m => Object.values(M[m]).some(v => v > 0)).sort((x, y) => (M[y].leads - M[x].leads) || (M[y].registros - M[x].registros) || (M[y].impresiones - M[x].impresiones));
  const col = {}; medios.forEach((m, i) => { col[m] = MEDIO_COL[m] || PAL[(i + 7) % PAL.length]; });
  const T = {}; ["impresiones", "clics", "inv_ads", "registros", "leads", "citas", "pvr", "ventas", "inversion"].forEach(k => { T[k] = medios.reduce((x, m) => x + M[m][k], 0); });
  const a = { leads: T.leads, citas: T.citas, pvr: T.pvr, ventas: T.ventas, inversion: T.inversion, importe: sum(ROWS.filter(esPagado)).importe };
  const regPag = () => T.registros;
  const ST = [
    { k: "impresiones", name: "Impresiones", sub: "de los anuncios", g: "atr", cost: ["CPM", o => div(o.inv_ads, o.impresiones) * 1000] },
    { k: "clics", name: "Clics de enlace", sub: "al sitio", g: "atr", prev: "impresiones", conv: "CTR", cost: ["CPC", o => div(o.inv_ads, o.clics)] },
    { k: "registros", name: "Registros", sub: "formularios", g: "conv", prev: "clics", conv: "de clics", cost: ["Costo por registro", o => div(o.inversion, o.registros)] },
    { k: "leads", name: "Leads", sub: "Airtable", g: "conv", prev: "registros", conv: "de registros", cost: ["CPL", o => div(o.inversion, o.leads)] },
    { k: "citas", name: "Citas agendadas", sub: "en BIC", g: "conv", prev: "leads", conv: "de leads", cost: ["Costo por cita agendada", o => div(o.inversion, o.citas)] },
    { k: "pvr", name: "Primeras visitas", sub: "realizadas", g: "conv", prev: "citas", conv: "de citas agendadas", cost: ["Costo por PVR", o => div(o.inversion, o.pvr)] },
    { k: "ventas", name: "Ventas", sub: "BEC en BIT", g: "conv", prev: "pvr", conv: "de primeras visitas", cost: ["Costo por venta", o => div(o.inversion, o.ventas)] }
  ];
  let html = `<div class="donuts fila"><div class="fdiv"><span>Atracción</span></div>`;
  let grupo = "atr";
  ST.forEach(st => {
    if (st.g !== grupo) { grupo = st.g; html += `<div class="fdiv"><span>Conversión · pagado</span></div>`; }
    if (st.g === "atr" && !T.impresiones) { if (st.k === "impresiones") html += pendingCard("Impresiones y clics", "Sin datos de anuncios para estos filtros"); return; }
    const total = T[st.k];
    const parts = medios.map(m => ({ m, v: M[m][st.k] })).filter(p => p.v > 0);
    let offset = 0, segs = track;
    parts.forEach(p => {
      const frac = div(p.v, total) || 0, gap = parts.length > 1 ? GAP : 0, len = Math.max(0, frac * C - gap), o = M[p.m];
      const tip = `<div class="tt">${st.name} · ${medioNombre(p.m)}</div>` + tipRows([["Volumen", nf.format(p.v)], parts.length > 1 ? ["% del total", pct(frac)] : null,
        st.prev && o[st.prev] ? [st.conv, pct(div(p.v, o[st.prev]))] : null, [st.cost[0], money(st.cost[1](o))]].filter(Boolean));
      segs += `<circle cx="60" cy="60" r="${R}" fill="none" style="stroke:${col[p.m]}" stroke-width="${SW}" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-offset - gap / 2).toFixed(2)}" data-tip="${encodeURIComponent(tip)}"/>`;
      offset += frac * C;
    });
    const split = parts.length > 1 ? `<div class="dsplit">${parts.slice(0, 4).map(p => `<span><i class="dot" style="background:${col[p.m]}"></i>${pct(div(p.v, total))}</span>`).join("")}${parts.length > 4 ? `<span>+${parts.length - 4}</span>` : ""}</div>` : "";
    const prevT = st.prev ? T[st.prev] : 0;
    const conv = st.prev && prevT ? `<div class="dconv">${pct(div(total, prevT))} ${st.conv}</div>` : `<div class="dconv muted">${st.g === "atr" ? "Inicio de la atracción" : "Inicio del funnel"}</div>`;
    const base = st.g === "atr" ? T.impresiones : (T.registros || T.leads);
    const sc = Math.min(1, Math.max(0.42, 1 + 0.35 * Math.log10(div(total, base) || 0.001)));
    html += `<div class="dcard${total ? "" : " pending"}"><div class="dname">${st.name}<small>${st.sub}</small></div>
      <div class="dslot"><div class="dwrap" style="width:${(sc * 100).toFixed(1)}%">${ring(segs, `${st.name}: ${nf.format(total)}`)}
        <div class="dcenter"><span class="dval" style="font-size:${(12 + 7 * sc).toFixed(1)}px">${total ? (st.g === "atr" ? compact.format(total) : nf.format(total)) : "—"}</span></div></div></div>
      ${split}${conv}<div class="dline din">${st.cost[0]} ${total ? money(st.cost[1](T)) : "—"}</div></div>`;
  });
  byId("legFunnel").innerHTML = medios.map(m => `<span><i class="dot" style="background:${col[m]}"></i>${medioNombre(m)}</span>`).join("");
  /* OLE con el mismo funnel que arriba (Alin, 2026-10-27): registros, leads, citas, PVR y ventas de TODO lo no pagado, un segmento por
     medio (web, facebook, instagram, whatsapp…) con los colores de medio del Looker, como el funnel pagado. */
  const o = ole(), oReg = regBy(null, null, "sin_campana");
  const MO = {}; const addO = (m, k, v) => { const key = medioKey(m); MO[key] = MO[key] || { registros: 0, leads: 0, citas: 0, pvr: 0, ventas: 0 }; MO[key][k] += v || 0; };
  if (porMedio) CROWS.filter(r => r.pagado === 0 && inMes(r)).forEach(r => ["leads", "citas", "pvr", "ventas"].forEach(k => addO(r.medio, k, r[k])));
  else ALL.filter(r => r.origen === "sin_campana" && inMes(r)).forEach(r => ["leads", "citas", "pvr", "ventas"].forEach(k => addO(r.canal, k, r[k])));
  RROWS.filter(r => inMes(r) && r.origen === "sin_campana").forEach(r => addO(porMedio ? r.medio : r.canal, "registros", r.registros));
  const mediosO = Object.keys(MO).filter(m => Object.values(MO[m]).some(v => v > 0)).sort((x, y) => (MO[y].leads - MO[x].leads) || (MO[y].registros - MO[x].registros));
  const colO = {}; mediosO.forEach((m, i) => { colO[m] = MEDIO_COL[m] || PAL[(i + 7) % PAL.length]; });
  const TO = {}; ["registros", "leads", "citas", "pvr", "ventas"].forEach(k => { TO[k] = mediosO.reduce((x, m) => x + MO[m][k], 0); });
  const OLE_ST = [["Registros", "formularios", "registros", null, null], ["Leads", "sin campaña pagada", "leads", "registros", "de registros"], ["Citas agendadas", "en BIC", "citas", "leads", "de leads"], ["Primeras visitas", "realizadas", "pvr", "citas", "de citas agendadas"], ["Ventas", "BEC en BIT", "ventas", "pvr", "de primeras visitas"]];
  const legOle = mediosO.map(m => `<span><i class="dot" style="background:${colO[m]}"></i>${medioNombre(m)}</span>`).join("");
  html += `</div><div class="ole-funnel"><div class="fgroup-title">OLE · todo lo NO pagado, por medio</div>${legOle ? `<div class="legend" style="margin-bottom:6px">${legOle}</div>` : ""}<div class="donuts fila">`;
  OLE_ST.forEach(([name, sub, k, prevK, convTxt]) => {
    const total = TO[k];
    const parts = mediosO.map(m => ({ m, v: MO[m][k] })).filter(p => p.v > 0);
    let offset = 0, segs = track;
    parts.forEach(p => { const frac = div(p.v, total) || 0, gap = parts.length > 1 ? GAP : 0, len = Math.max(0, frac * C - gap), om = MO[p.m];
      const tip = `<div class="tt">${name} · ${medioNombre(p.m)} · OLE</div>` + tipRows([["Volumen", nf.format(p.v)], parts.length > 1 ? ["% del total OLE", pct(frac)] : null, prevK && om[prevK] ? [convTxt, pct(div(p.v, om[prevK]))] : null].filter(Boolean));
      segs += `<circle cx="60" cy="60" r="${R}" fill="none" style="stroke:${colO[p.m]}" stroke-width="${SW}" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-offset - gap / 2).toFixed(2)}" data-tip="${encodeURIComponent(tip)}"/>`; offset += frac * C; });
    const sc = Math.min(1, Math.max(0.42, 1 + 0.35 * Math.log10(div(total, TO.registros || TO.leads) || 0.001)));
    const split = parts.length > 1 ? `<div class="dsplit">${parts.slice(0, 4).map(p => `<span><i class="dot" style="background:${colO[p.m]}"></i>${pct(div(p.v, total))}</span>`).join("")}${parts.length > 4 ? `<span>+${parts.length - 4}</span>` : ""}</div>` : "";
    const conv = prevK && TO[prevK] ? `<div class="dconv">${pct(div(total, TO[prevK]))} ${convTxt}</div>` : `<div class="dconv muted">Inicio del funnel</div>`;
    html += `<div class="dcard${total ? "" : " pending"}"><div class="dname">${name}<small>${sub}</small></div>
      <div class="dslot"><div class="dwrap" style="width:${(sc * 100).toFixed(1)}%">${ring(segs, `${name} OLE: ${nf.format(total)}`)}
        <div class="dcenter"><span class="dval" style="font-size:${(12 + 7 * sc).toFixed(1)}px">${nf.format(total)}</span></div></div></div>${split}${conv}</div>`;
  });
  html += `</div><div class="overall"><span>Registro → lead <b>${pct(div(TO.leads, TO.registros))}</b></span><span>Lead → cita agendada <b>${pct(div(TO.citas, TO.leads))}</b></span><span>TAL% <b>${pct(div(TO.pvr, TO.leads))}</b></span><span>PVR → venta <b>${pct(div(TO.ventas, TO.pvr))}</b></span></div>
  </div><div class="overall"><span class="tenue">Pagado: campañas paid, paid_int y paid_us, de todos los medios.</span>${regPag(null) ? `<span>Registro → PVR <b>${pct(div(a.pvr, regPag(null)))}</b></span>` : ""}<span>Lead → cita agendada <b>${pct(div(a.citas, a.leads))}</b></span><span>Cita agendada → PVR <b>${pct(div(a.pvr, a.citas))}</b></span><span>TAL% <b>${pct(div(a.pvr, a.leads))}</b></span><span>PVR → venta <b>${pct(div(a.ventas, a.pvr))}</b></span><span class="din">Inversión asignada <b>${money(a.inversion)}</b></span><span class="din">Importe vendido <b>${money(a.importe)}</b></span></div>`;
  byId("funnel").innerHTML = html;
}

/* ===== Origen de los leads ===== */
function renderOrigen() {
  const tot = sum(ROWS), regT = regTotal();
  const rows = ORIGENES.map(o => ({ o, a: sum(ROWS.filter(r => r.origen === o.k)), reg: regBy(null, null, o.k) })).filter(r => r.a.leads || r.reg).sort((x, y) => y.a.leads - x.a.leads);
  const body = rows.map(({ o, a, reg }) => { const share = div(a.leads, tot.leads), paid = o.k !== "sin_campana"; return `<tr${o.k === "local" ? ' class="hl"' : ""}>
      <td><span class="oname">${o.name}<small>${o.sub}</small></span></td>
      <td>${nf.format(reg)}</td><td>${nf.format(a.leads)}</td>
      <td><span class="share">${pct(share)}<span class="bar"><i style="width:${(share * 100 || 0).toFixed(1)}%"></i></span></span></td>
      <td>${nf.format(a.citas)}</td><td>${nf.format(a.pvr)}</td><td>${pct(div(a.pvr, a.leads))}</td><td>${nf.format(a.ventas)}</td>
      <td class="din">${paid ? money(a.inversion) : "—"}</td><td class="din">${paid ? money(div(a.inversion, a.leads)) : "—"}</td><td class="din">${paid ? money(div(a.inversion, a.pvr)) : "—"}</td><td class="din">${paid ? money(div(a.inversion, a.ventas)) : "—"}</td></tr>`; }).join("");
  byId("tOrigen").innerHTML = `<thead><tr><th>Origen</th><th>Registros</th><th>Leads</th><th>% de leads</th><th>Citas agendadas</th><th>PVRs</th><th>TAL%</th><th>Ventas</th><th class="din">Inversión</th><th class="din">CPL</th><th class="din">Costo/PVR</th><th class="din">Costo/venta</th></tr></thead>
    <tbody>${body}<tr class="total"><td>Total</td><td>${nf.format(regT)}</td><td>${nf.format(tot.leads)}</td><td>100%</td><td>${nf.format(tot.citas)}</td><td>${nf.format(tot.pvr)}</td><td>${pct(div(tot.pvr, tot.leads))}</td><td>${nf.format(tot.ventas)}</td><td class="din">${money(tot.inversion)}</td><td class="din">${money(div(tot.inversion, tot.leads))}</td><td class="din">${money(div(tot.inversion, tot.pvr))}</td><td class="din">${money(div(tot.inversion, tot.ventas))}</td></tr></tbody>`;
  aplicarOrdenDom("tOrigen");
  const suc = state.sucs.length ? sucsLabel() : "", nac = sum(ROWS.filter(r => r.origen === "nacional")), loc = sum(ROWS.filter(r => r.origen === "local"));
  byId("origenHint").textContent = suc ? `Leads de ${suc.toLowerCase()}: las campañas nacionales aportan ${pct(div(nac.leads, tot.leads))} y la campaña local ${pct(div(loc.leads, tot.leads))}.` : "Elige una sucursal en las pestañas para separar su campaña local de las nacionales.";
  byId("origenNote").textContent = suc && localRegions().length ? `«Campaña local» agrupa todo lo etiquetado con región ${localRegions().slice(0, 2).join(" o ")} en campañas pagadas. Si una campaña cambió de segmentación sin cambiar sus UTM, aquí se ve junta.` : "";
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
byId("fWk").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; state.wk = b.dataset.v; save(); renderWeekly(); });
const shortDate = s => new Date(s + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" }).replace(".", "");
function renderLocal() {
  const sec = byId("secLocal");
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
  byId("tLocal").innerHTML = `<thead><tr><th>Métrica</th><th>ADV<small>hasta 9 ago · ${dA} días</small></th><th>OPEN<small>desde 10 ago · ${dO} días</small></th><th>Cambio</th></tr></thead><tbody>${body}</tbody>`;
  byId("localNote").textContent = `Con OPEN, ${pct(div(O.leads, O.leads_all))} de los leads de la campaña son de Monterrey (con ADV ${pct(div(A.leads, A.leads_all))}); el resto se va a otras sucursales. Los totales no son comparables directo porque los periodos duran distinto; usa las filas por día y las tasas. Los leads recientes siguen madurando.`;
}
function renderWeekly() {
  const sec = byId("secWk");
  sec.hidden = !(state.sucs.length && WEEKS.length);
  if (sec.hidden) return;
  document.querySelectorAll("#fWk button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === state.wk)));
  const cfg = wkMetrics[state.wk], host = byId("cWk");
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
  byId("legWk").innerHTML = openIdx > 0 ? `<span><i class="dot" style="background:var(--seg-a)"></i>ADV</span><span><i class="dot" style="background:var(--seg-b)"></i>OPEN</span>` : "";
  byId("wkHint").textContent = `Campaña pagada de Meta con región ${localRegions().slice(0, 2).join(" o ")}, semana por semana (lunes a domingo). La línea punteada es el promedio${openIdx > 0 ? " de cada periodo" : ""}.`;
  const ch = avgs.length > 1 ? div(avgs[1], avgs[0]) - 1 : NaN;
  byId("wkNote").textContent = `${cfg.note}${avgs.length > 1 ? ` Promedio ADV: ${isFinite(avgs[0]) ? cfg.fmt(avgs[0]) : "—"}; promedio OPEN: ${isFinite(avgs[1]) ? cfg.fmt(avgs[1]) : "—"}${isFinite(ch) ? ` (${ch >= 0 ? "+" : "−"}${Math.abs(ch * 100).toFixed(0)}%)` : ""}.` : ""} La última semana puede estar incompleta.`;
  H = W < 520 ? 220 : 240; ih = H - M.t - M.b;
}

/* ===== Registros por mes (apilado) ===== */
const REG_MET = { registros: ["Registros", "#9aa7bd"], leads: ["Leads", "#253f78"], citas: ["Citas agendadas", "#c8a040"], pvr: ["Primeras visitas", "#4a3aa7"], ventas: ["Ventas", "#2e7d32"] };
const fRegMet = byId("fRegMet"), fRegGran = byId("fRegGran");
fRegMet.innerHTML = Object.keys(REG_MET).map(k => `<button type="button" data-v="${k}">${REG_MET[k][0]}</button>`).join("");
fRegMet.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; state.regMet = b.dataset.v; save(); renderReg(); });
fRegGran.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; state.regGran = b.dataset.v; save(); renderReg(); });
/* Tendencia de registros / leads / citas / PVR: una métrica a la vez, barras por día, semana (desde lunes) o mes (Alin, 2026-10-15).
   Registros vienen de registros_historico por día (RDROWS); leads, citas y PVR de las filas diarias del reporte (DROWS). */
function renderReg() {
  if (!hay("reg")) return;
  fRegMet.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === state.regMet)));
  fRegGran.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === state.regGran)));
  const host = byId("cReg"), met = state.regMet, [metN, col] = REG_MET[met];
  const sem = state.regGran === "semana", mes = state.regGran === "mes", gran = mes ? "mes" : sem ? "semana" : "día";
  const key = d => mes ? d.slice(0, 7) + "-01" : sem ? monday(d) : d;
  const map = new Map();
  const add = (d, v) => { const k = key(d); map.set(k, (map.get(k) || 0) + v); };
  if (met === "registros") RDROWS.forEach(r => add(r.dia, r.registros)); else DROWS.forEach(r => add(r.dia, r[met]));
  const pts = [...map.entries()].map(([k, v]) => ({ k, v })).sort((a, b) => a.k < b.k ? -1 : 1);
  byId("regHint").textContent = `${metN} por ${gran}, del ${fmtDate(state.desde)} al ${fmtDate(state.hasta)}, con los filtros de arriba. Las semanas empiezan en lunes.`;
  if (!pts.length) { host.innerHTML = `<p class="hint">Sin datos con estos filtros.</p>`; } else {
    setDims(host); H = W < 520 ? 280 : 340; const mb = 40; ih = H - M.t - mb;
    const top = Math.max(1, ...pts.map(p => p.v)) * 1.08, pw = Math.pow(10, Math.floor(Math.log10(top))), q = top / pw;
    const yMax = ([1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(m => q <= m) || 10) * pw;
    const n = pts.length, step = iw / n, bw = Math.max(1.5, Math.min(64, step * 0.84));
    const x = i => M.l + step * (i + 0.5), y = v => M.t + ih - v / yMax * ih;
    let s = axes(yMax, v => nf.format(v));
    const fx = k => new Date(k + "T12:00:00").toLocaleDateString("es-MX", mes ? { month: "short", year: "numeric" } : { day: "numeric", month: "short" }).replace(".", "");
    const fmtK = k => mes ? cap(new Date(k + "T12:00:00").toLocaleDateString("es-MX", { month: "long", year: "numeric" })) : sem ? `Semana del ${fmtDate(k)}` : fmtDate(k);
    const every = step >= 30 ? 1 : Math.max(1, Math.ceil(n / (W < 420 ? 4 : W < 800 ? 7 : 12)));
    pts.forEach((p, i) => { if (i % every === 0 || i === n - 1) s += `<text x="${x(i)}" y="${H - (every === 1 && step < 64 && i % 2 ? 6 : 20)}" text-anchor="middle">${fx(p.k)}</text>`; });
    pts.forEach((p, i) => {
      if (p.v > 0) s += `<rect x="${(x(i) - bw / 2).toFixed(1)}" y="${y(p.v).toFixed(1)}" width="${bw.toFixed(1)}" height="${(M.t + ih - y(p.v)).toFixed(1)}" fill="${col}" rx="${Math.min(3, bw / 2)}" pointer-events="none"/>`;
      if (p.v > 0 && bw >= 11) s += `<text x="${x(i)}" y="${(y(p.v) - 4).toFixed(1)}" text-anchor="middle" class="lbl${bw < 26 ? " chica" : ""}">${nf.format(p.v)}</text>`;
      s += `<g class="col" data-tip="${encodeURIComponent(`<div class="tt">${fmtK(p.k)}</div>` + tipRows([[metN, nf.format(p.v)]]))}"><rect class="hit" x="${(x(i) - step / 2).toFixed(1)}" y="${M.t}" width="${step.toFixed(1)}" height="${ih}"/></g>`;
    });
    host.innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${metN} por ${gran}">${s}</svg>`;
  }
  const skipped = FILTER_DIMS.filter(k => state.f[k].length && REG_SKIP[k]).map(k => DIMS[k].label);
  byId("regNote").textContent = (state.sucs.length ? "Registros por la sucursal que eligió la persona (el formulario no sabe dónde terminará la visita). " : "") + (state.terr ? "En registros el territorio se aproxima con el país del formulario (no guarda teléfono). " : "") + (skipped.length ? `Los filtros de ${skipped.join(" y ")} no aplican a registros; leads, citas y PVR sí los obedecen.` : "");
}

/* ===== Por hora del día: barras 0–23 de una métrica (Alin, 2026-10-22) ===== */
const fHoraMet = byId("fHoraMet");
fHoraMet.innerHTML = Object.keys(REG_MET).map(k => `<button type="button" data-v="${k}">${REG_MET[k][0]}</button>`).join("");
fHoraMet.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; state.horaMet = b.dataset.v; save(); renderHora(); });
function renderHora() {
  if (!hay("hora")) return;
  fHoraMet.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === state.horaMet)));
  const host = byId("cHora"), met = state.horaMet, [metN, col] = REG_MET[met];
  const vals = Array.from({ length: 24 }, () => 0);
  if (met === "registros") HRROWS.forEach(r => { if (r.hora >= 0 && r.hora < 24) vals[r.hora] += r.registros; });
  else HROWS.forEach(r => { if (r.hora >= 0 && r.hora < 24) vals[r.hora] += r[met]; });
  const total = vals.reduce((a, b) => a + b, 0);
  byId("horaHint").textContent = `${metN} por hora del día (hora de México), del ${fmtDate(state.desde)} al ${fmtDate(state.hasta)}, con los filtros de arriba. ${met === "registros" ? "Hora del formulario." : "Hora en que se creó el lead."}`;
  if (!total) { host.innerHTML = `<p class="hint">Sin datos con estos filtros.</p>`; return; }
  setDims(host); H = W < 520 ? 260 : 300; const mb = 34; ih = H - M.t - mb;
  const top = Math.max(1, ...vals) * 1.08, pw = Math.pow(10, Math.floor(Math.log10(top))), q = top / pw;
  const yMax = ([1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(m => q <= m) || 10) * pw;
  const step = iw / 24, bw = Math.max(2, Math.min(44, step * 0.74)), x = i => M.l + step * (i + 0.5), y = v => M.t + ih - v / yMax * ih;
  let s = axes(yMax, v => nf.format(v));
  vals.forEach((v, h) => {
    if (h % (W < 520 ? 3 : 1) === 0) s += `<text x="${x(h)}" y="${H - 10}" text-anchor="middle">${h}h</text>`;
    if (v > 0) s += `<rect x="${(x(h) - bw / 2).toFixed(1)}" y="${y(v).toFixed(1)}" width="${bw.toFixed(1)}" height="${(M.t + ih - y(v)).toFixed(1)}" fill="${col}" rx="${Math.min(3, bw / 2)}" pointer-events="none"/>`;
    if (v > 0 && bw >= 14) s += `<text x="${x(h)}" y="${(y(v) - 4).toFixed(1)}" text-anchor="middle" class="lbl${bw < 26 ? " chica" : ""}">${nf.format(v)}</text>`;
    s += `<g class="col" data-tip="${encodeURIComponent(`<div class="tt">${h}:00 – ${h}:59</div>` + tipRows([[metN, nf.format(v)], ["% del total", pct(div(v, total))]]))}"><rect class="hit" x="${(x(h) - step / 2).toFixed(1)}" y="${M.t}" width="${step.toFixed(1)}" height="${ih}"/></g>`;
  });
  host.innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${metN} por hora del día">${s}</svg>`;
}
let hseq = 0;
async function refreshHora(force) {
  if (!hay("hora")) return;
  const my = ++hseq;
  try {
    const [a, b] = await Promise.all([runSql("hora", force), runSql("reg_hora", force)]);
    if (my !== hseq) return;
    if (a.rows) HROWS = a.rows.map(r => ({ hora: +r.hora, leads: +r.leads || 0, citas: +r.citas || 0, pvr: +r.pvr || 0, ventas: +r.ventas || 0 }));
    if (b.rows) HRROWS = b.rows.map(r => ({ hora: +r.hora, registros: +r.registros || 0 }));
    renderHora();
  } catch (e) { /* la sección conserva lo anterior */ }
}

/* ===== Costo por resultado por medio: líneas por mes, un medio por línea (solo campañas pagadas) + OLE ===== */
const COSTO_PAL = ["#1a73e8", "#e6007e", "#ff7043", "#5e35b1", "#00acc1", "#fbbc04", "#f06292", "#757575", "#8d6e63", "#3949ab", "#00897b", "#c0ca33", "#ab47bc", "#ef5350", "#26c6da", "#ffa726", "#5c6bc0", "#9ccc65", "#78909c", "#253f78"];
const COSTO_FIJO = MEDIO_COL; // mismos colores de medio que el funnel y el Looker (2026-10-27)
const filasCosto = () => CROWS.filter(r => (state.costoVista === "ole") === (r.pagado === 0));
function gruposCosto() { // medios de la vista elegida (pagado u OLE), ordenados por leads en el periodo
  const tot = {}; filasCosto().forEach(r => tot[r.medio] = (tot[r.medio] || 0) + r.leads);
  const ks = Object.keys(tot).sort((a, b) => tot[b] - tot[a]);
  const usados = new Set(Object.values(COSTO_FIJO)), libres = COSTO_PAL.filter(c => !usados.has(c)); let i = 0;
  return ks.map(k => [k, k, COSTO_FIJO[k] || libres[i++ % libres.length]]);
}
const fCostoVista = byId("fCostoVista");
fCostoVista.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; state.costoVista = b.dataset.v; save(); renderCostos(); });
const COSTO_MET = { leads: ["CPL", "Costo por lead"], citas: ["Costo por cita agendada", "Costo por cita agendada"], pvr: ["Costo por PVR", "Costo por primera visita"], ventas: ["Costo por venta", "Costo por venta"] };
const fCostoMet = byId("fCostoMet");
fCostoMet.innerHTML = Object.keys(COSTO_MET).map(k => `<button type="button" data-v="${k}">${COSTO_MET[k][0]}</button>`).join("");
fCostoMet.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; state.costoMet = b.dataset.v; save(); renderCostos(); });
function renderCostos() {
  if (!hay("costos")) return;
  fCostoMet.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === state.costoMet)));
  fCostoVista.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === state.costoVista)));
  const ole = state.costoVista === "ole", FIL = filasCosto();
  const ms = monthsSel(), host = byId("cCostos"), met = state.costoMet, metN = ole ? (met === "leads" ? "Leads OLE" : met === "citas" ? "Citas agendadas OLE" : "Primeras visitas OLE") : COSTO_MET[met][1], GRUPOS = gruposCosto(); setDims(host);
  fCostoMet.querySelectorAll("button").forEach(b => { const k = b.dataset.v; b.textContent = ole ? (k === "leads" ? "Leads" : k === "citas" ? "Citas agendadas" : "Primeras visitas") : COSTO_MET[k][0]; });
  const cel = (g, mo) => FIL.filter(r => r.medio === g && r.mes === mo.key).reduce((o, r) => { o.n += r[met]; o.inv += r.inversion; return o; }, { n: 0, inv: 0 });
  /* Pagado: costo por resultado. OLE: no hay inversión que repartir, así que la línea es el volumen de resultados. */
  const val = (g, mo) => { const a = cel(g, mo); return ole ? (a.n > 0 ? a.n : NaN) : (a.n > 0 && a.inv > 0 ? a.inv / a.n : NaN); };
  const all = GRUPOS.flatMap(([g]) => ms.map(mo => val(g, mo))).filter(isFinite);
  const yMax = niceMax((all.length ? Math.max(...all) : 1) * 1.15);
  const step = iw / ms.length, x = i => M.l + step * i + step / 2, y = v => M.t + ih - v / yMax * ih;
  let s = axes(yMax, v => ole ? nf.format(v) : "$" + compact.format(v));
  ms.forEach((mo, i) => s += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${cap(mo.short)}</text>`);
  GRUPOS.forEach(([g, , col]) => { let d = "", pen = false; ms.forEach((mo, i) => { const v = val(g, mo); if (!isFinite(v)) { pen = false; return; } d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`; pen = true; });
    s += `<path d="${d}" fill="none" stroke="${col}" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round" pointer-events="none"/>`;
    ms.forEach((mo, i) => { const v = val(g, mo); if (isFinite(v)) s += `<circle fill="${col}" class="mk" cx="${x(i)}" cy="${y(v)}" r="4" pointer-events="none"/>`; }); });
  const unidad = met === "leads" ? "leads" : met === "citas" ? "citas" : "PVR", dinero = v => v < 10 ? "$" + v.toFixed(2) : money(v);
  const uniN = met === "leads" ? "Leads" : met === "citas" ? "Citas" : "PVR", costoN = met === "leads" ? "CPL" : met === "citas" ? "Costo/cita" : "Costo/PVR";
  ms.forEach((mo, i) => { const filas = GRUPOS.map(([g, l, col]) => { const a = cel(g, mo), v = val(g, mo); return { l, col, a, v }; }).filter(f => f.a.n || f.a.inv);
    const tot = filas.reduce((o, f) => { o.n += f.a.n; o.inv += f.a.inv; return o; }, { n: 0, inv: 0 });
    const costo = (n, inv) => n > 0 && inv > 0 ? inv / n : NaN;
    const fila = (l, col, n, inv, cls = "") => `<tr class="${cls}"><td>${col ? `<i class="dot" style="background:${col}"></i>` : ""}${l}</td>${ole ? "" : `<td>${isFinite(costo(n, inv)) ? dinero(costo(n, inv)) : "—"}</td>`}<td>${nf.format(n)}</td><td>${inv ? money(inv) : "—"}</td></tr>`;
    const tip = `<div class="tt">${cap(mo.long)} · ${metN}</div><table class="tip-tabla"><thead><tr><th>Medio</th>${ole ? "" : `<th>${costoN}</th>`}<th>${uniN}</th><th>Inversión</th></tr></thead><tbody>` +
      filas.map(f => fila(f.l, f.col, f.a.n, f.a.inv)).join("") + fila("Total", "", tot.n, tot.inv, "total") + `</tbody></table>`;
    s += `<g class="col" data-tip="${encodeURIComponent(tip)}"><rect class="hit" x="${M.l + step * i}" y="${M.t}" width="${step}" height="${ih}"/><line class="guide" x1="${x(i)}" x2="${x(i)}" y1="${M.t}" y2="${M.t + ih}"/></g>`; });
  host.innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${metN} por mes y medio">${s}</svg>`;
  byId("legCostos").innerHTML = GRUPOS.map(([, l, col]) => `<span><i class="dot" style="background:${col}"></i>${l}</span>`).join("");
  byId("costosHint").textContent = ole
    ? `${metN} por mes, una línea por medio: todo lo que no es campaña pagada, incluso lo que llega sin parámetros («(sin medio)»). Como OLE no tiene inversión que repartir, se muestra el volumen; el detalle sale al pasar el cursor.`
    : `${metN}: inversión asignada ÷ ${met === "leads" ? "leads" : met === "citas" ? "citas agendadas" : "primeras visitas"}, por mes, en MXN. Una línea por medio de las campañas pagadas (campaña que empieza con paid, paid_int o paid_us). Un medio sin inversión en el mes no se dibuja; el detalle sale al pasar el cursor.`;
}

/* ===== Líneas de costo por mes y canal ===== */
function renderLine(elId, legId, metric, label) {
  const chs = channels(), ms = monthsSel(), host = byId(elId); setDims(host);
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
  byId(legId).innerHTML = legendHtml(chs);
}

/* ===== Meta vs Google ===== */
function renderCanal() {
  const m = sum(byCanal("meta")), g = sum(byCanal("google")), t = sum(ROWS.filter(r => r.canal !== "otros"));
  const rm = regBy("meta"), rg = regBy("google"), rt = rm + rg;
  const rows = [
    ["Inversión asignada", x => x.inversion, money], ["Registros", (x, r) => r, nf.format], ["Leads", x => x.leads, nf.format],
    ["Registro → lead", (x, r) => div(x.leads, r), pct, "high"], ["CPL", x => div(x.inversion, x.leads), money, "low"],
    ["Citas agendadas", x => x.citas, nf.format], ["Lead → cita agendada", x => div(x.citas, x.leads), pct, "high"], ["Costo por cita agendada", x => div(x.inversion, x.citas), money, "low"],
    ["PVRs", x => x.pvr, nf.format], ["Cita → PVR", x => div(x.pvr, x.citas), pct, "high"], ["Costo por PVR", x => div(x.inversion, x.pvr), money, "low"],
    ["Ventas", x => x.ventas, nf.format], ["PVR → venta", x => div(x.ventas, x.pvr), pct, "high"], ["Costo por venta", x => div(x.inversion, x.ventas), money, "low"], ["Importe vendido", x => x.importe, money, "high"]
  ];
  const body = rows.map(([label, fn, f, better]) => { const vm = fn(m, rm), vg = fn(g, rg); let bm = "", bg = "";
    if (better === "low") { bm = vm < vg ? "better" : ""; bg = vg < vm ? "better" : ""; }
    if (better === "high") { bm = vm > vg ? "better" : ""; bg = vg > vm ? "better" : ""; }
    return `<tr${better ? ' class="rate"' : ""}><td>${label}</td><td class="${bm}">${f(vm)}</td><td class="${bg}">${f(vg)}</td><td>${f(fn(t, rt))}</td></tr>`; }).join("");
  byId("tCanal").innerHTML = `<thead><tr><th>Métrica</th><th><span class="dot meta"></span>Meta</th><th><span class="dot google"></span>Google</th><th>Total pagado</th></tr></thead><tbody>${body}</tbody>`;
  byId("canalHint").textContent = `Siempre muestra ambos medios con los demás filtros; ● marca el mejor en tasas y costos.`;
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
const MES_MET = { leads: "Leads", citas: "Citas agendadas", pvr: "Primeras visitas", ventas: "Ventas" };
state.mesMet = MES_MET[state.mesMet] ? state.mesMet : "leads";
on(byId("fMesMet"), "click", e => { const b = e.target.closest("button"); if (!b) return; state.mesMet = b.dataset.v; save(); renderMes(); });
function renderMes() {
  const chs = channels(), ms = monthsSel(), met = state.mesMet, metN = MES_MET[met];
  byId("fMesMet").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === met)));
  byId("mesHint").textContent = `${metN} por mes apilados por medio; la tabla trae costos y conversiones de cada cohorte.`;
  const per = ms.map(mo => { const o = {}; chs.forEach(c => o[c] = sum(MROWS.filter(r => r.mes === mo.key && r.canal === c))); o.all = sum(MROWS.filter(r => r.mes === mo.key)); return o; });
  const host = byId("cMes"); setDims(host);
  if (!MROWS.length) {
    const medio = state.canal === "pagado" ? "Meta ni Google" : state.canal === "todos" ? "ningún medio" : CH[state.canal];
    host.innerHTML = `<p class="hint">Sin leads de ${medio} para ${sucsLabel().toLowerCase()} con estos filtros en el periodo. Prueba con ALL, otro medio o quita filtros.</p>`;
    byId("legMes").innerHTML = ""; byId("tMes").innerHTML = ""; return;
  }
  const yMax = niceMax(Math.max(1, ...per.map(p => p.all[met])) * 1.1);
  const step = iw / ms.length, bw = Math.min(64, step * 0.6);
  let s = axes(yMax, v => nf.format(v));
  ms.forEach((mo, i) => {
    const x = M.l + step * i + (step - bw) / 2;
    let yTop = M.t + ih;
    chs.forEach(c => { const v = per[i][c][met]; if (!v) return; const h = v / yMax * ih; yTop -= h; s += `<rect class="f-${c}" x="${x}" y="${yTop}" width="${bw}" height="${h}"/>`; });
    const a = per[i].all;
    const tip = `<div class="tt">${cap(mo.long)} · ${metN}</div>` + tipRows(chs.map(c => [`<i class="dot ${c}"></i>${CH[c]}`, `${nf.format(per[i][c][met])} · ${money(div(per[i][c].inversion, per[i][c][met]))} c/u`])
      .concat([["Leads", nf.format(a.leads)], ["Citas agendadas", `${nf.format(a.citas)} (${pct(div(a.citas, a.leads))})`], ["PVR", `${nf.format(a.pvr)} (${pct(div(a.pvr, a.leads))})`], ["Ventas", nf.format(a.ventas)], ["Costo por PVR", money(div(a.inversion, a.pvr))]]));
    s += `<g class="col" data-tip="${encodeURIComponent(tip)}"><rect class="hit" x="${M.l + step * i}" y="${M.t}" width="${step}" height="${ih}"/></g>`;
    s += `<text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle">${cap(mo.short)}</text>`;
    if (a[met]) s += `<text x="${x + bw / 2}" y="${yTop - 5}" text-anchor="middle" class="lbl">${nf.format(a[met])}</text>`;
  });
  host.innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${metN} por mes">${s}</svg>`;
  byId("legMes").innerHTML = legendHtml(chs);
  const cols = [["Registros", (a, i) => nf.format(i == null ? regSum(RROWS) : regBy(null, ms[i].key))], ["Leads", a => nf.format(a.leads)], ["Citas agendadas", a => nf.format(a.citas)], ["Lead → cita agendada", a => pct(div(a.citas, a.leads))], ["PVR", a => nf.format(a.pvr)], ["TAL%", a => pct(div(a.pvr, a.leads))], ["Ventas", a => nf.format(a.ventas)],
    ["Inversión", a => money(a.inversion)], ["CPL", a => money(div(a.inversion, a.leads))], ["Costo/cita", a => money(div(a.inversion, a.citas))], ["Costo/PVR", a => money(div(a.inversion, a.pvr))], ["Costo/venta", a => money(div(a.inversion, a.ventas))], ["Importe vendido", a => money(a.importe)]].filter(c => !(SIN_MONTOS && /Inversión|CPL|Costo|Importe/.test(c[0])));
  byId("tMes").innerHTML = `<thead><tr><th>Mes</th>${cols.map(c => `<th>${c[0]}</th>`).join("")}</tr></thead><tbody>` +
    ms.map((mo, i) => `<tr${state.mes === mo.key ? ' class="hl"' : ""}><td>${cap(mo.long)}</td>${cols.map(c => `<td>${c[1](per[i].all, i)}</td>`).join("")}</tr>`).join("") +
    `<tr class="total"><td>${state.mes === "todo" ? "Total" : "Total del periodo"}</td>${cols.map(c => `<td>${c[1](sum(MROWS), null)}</td>`).join("")}</tr></tbody>`;
  aplicarOrdenDom("tMes");
}

/* ===== Evolución diaria: tres gráficas pequeñas (leads, citas, PVR), por día o por semana ===== */
const fGran = byId("fGran");
fGran.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; state.gran = b.dataset.v; save(); renderDiario(); });
function monday(d) { const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return iso(x); }
/* Evolución diaria: tres líneas (leads, citas, PVR) por día o semana, todos los pacientes. Alin la pidió de vuelta el 2026-10-15,
   arriba de la tabla de paciente; la gráfica apilada de abajo es otra cosa. Usa las mismas filas diarias (DROWS). */
const fGranEvol = byId("fGranEvol");
fGranEvol.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; state.evolGran = b.dataset.v; save(); renderEvol(); });
function renderEvol() {
  if (!hay("evol")) return;
  fGranEvol.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === state.evolGran)));
  const host = byId("cEvol"), sem = state.evolGran === "semana";
  const map = new Map();
  DROWS.forEach(r => { const k = sem ? monday(r.dia) : r.dia; const o = map.get(k) || { k, leads: 0, citas: 0, pvr: 0, ventas: 0 }; o.leads += r.leads; o.citas += r.citas; o.pvr += r.pvr; o.ventas += r.ventas; map.set(k, o); });
  const pts = [...map.values()].sort((a, b) => a.k < b.k ? -1 : 1);
  const series = [["leads", "Leads", "meta"], ["citas", "Citas agendadas", "google"], ["pvr", "Primeras visitas", "otros"], ["ventas", "Ventas", "a"]];
  if (!pts.length) { host.innerHTML = `<p class="hint">Sin datos con estos filtros.</p>`; return; }
  const fmtK = k => sem ? `Semana del ${fmtDate(k)}` : fmtDate(k);
  host.innerHTML = series.map(([m, label]) => `<div class="mini"><h3>${label}</h3><div id="cEvol-${m}"></div></div>`).join("");
  series.forEach(([m, label, cls]) => {
    const el = byId("cEvol-" + m); setDims(el); H = 180; ih = H - M.t - M.b;
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
/* 20 colores distinguibles (como las gráficas de Looker que usa Alin); el 21.º en adelante se junta en «Otros». */
const PAL = ["#1a73e8", "#7ab83b", "#e6007e", "#ff7043", "#5e35b1", "#00acc1", "#fbbc04", "#f06292", "#757575", "#8d6e63", "#3949ab", "#00897b", "#c0ca33", "#ab47bc", "#ef5350", "#26c6da", "#ffa726", "#5c6bc0", "#9ccc65", "#78909c"];
/* Colores fijos para los valores que ya tienen color en Looker (referencia de Alin, 2026-10-15). */
/* Colores fijos por valor, copiados de las gráficas del Looker «Seguimiento diario» (Alin, 2026-10-27: «copia los colores que
   tenemos en Looker y no dejes que cambien»). Lo que no está aquí toma su color por su lugar en el total histórico (OPTIONS),
   no por el periodo o los filtros, así que tampoco cambia. */
const PAL_FIJA = {
  Azul: "#0072f0", Verde: "#7cb342", LP: "#5e35b1", LS: "#f48fb1", LeadING: "#f10096", "No LeadING": "#00b6cb",
  Blanco: "#e0e0e0", Intermedio: "#1a73e8", Amarillo: "#ffa800",
  "Azul Amarillo": "#ffa800", "Azul Blanco": "#91c3dd", "Azul Intermedio": "#2298ce", "Sin clasificar": "#616161", "Verde Amarillo": "#186602", "Verde Blanco": "#b0eaae", "Verde Intermedio": "#0dcc29",
  "Pareja Heterosexual": "#0072f0", "Pareja Homosexual": "#f10096", Salpingoclasia: "#00b6cb", Soltera: "#f66d00", "Surrogacy Hetero": "#ffa800", "Surrogacy Hombre": "#7cb342", "Surrogacy Hombres": "#5e35b1", "Surrogacy Mujer": "#ec407a", "Surrogacy Mujeres": "#03a9f4",
  "20–24": "#ff7043", "25–29": "#ffa800", "30–34": "#00b6cb", "35–39": "#7cb342", "40–44": "#5e35b1", "45–49": "#03a9f4", "50–54": "#ec407a", "Sin edad": "#737373",
  Nacional: "#03a9f4", Internacional: "#ec407a",
  Desconocido: "#81d4fa", "México": "#7cb342", California: "#f48fb1", "Ciudad de México": "#0072f0", Texas: "#737373", Jalisco: "#f10096", "Veracruz de Ignacio de la Llave": "#5a9bd4", "Nuevo León": "#ec407a", "Otro pais": "#d77fb3", Puebla: "#f66d00", Chihuahua: "#f66d00", Guanajuato: "#03a9f4", Unknown: "#81d4fa", "Baja California": "#ffa800", Florida: "#faa75a", "Coahuila de Zaragoza": "#ce7058", "Michoacán de Ocampo": "#9e67ab", "Querétaro": "#5e35b1", "Quintana Roo": "#7ac36a",
  "Quiero tener un bebé": "#ec407a", "Quiero evaluar mi fertilidad": "#ff7043",
  "segunda-opinion": "#0072f0", "investigando-opciones": "#00b6cb", ingenes: "#ffa800", "informacion-educativa": "#f10096", "agendar-cita": "#f66d00",
  Prelead: "#0072f0", "Lead Completo": "#00b6cb", "Lead Avanzado": "#ffa800", Lead: "#f10096",
  paid: "#f10096", paid_us: "#5a9bd4", organic: "#7cb342", paid_int: "#ffa800", community: "#ce7058", test: "#7ac36a",
  facebook: "#0072f0", google_search: "#7cb342", web: "#5e35b1", dgen: "#737373", socialmedia: "#f15a60", social_media: "#5a9bd4", google: "#ec407a", web_surrogate: "#7ac36a", presencial: "#f66d00", whatsapp: "#f10096", correo: "#faa75a", x: "#9e67ab", threads: "#d77fb3", "x-test": "#ce7058", pmax: "#00b6cb", youtube: "#ff7043", tiktok: "#03a9f4", display: "#81d4fa", instagram: "#ffa800",
  __otros: "#9aa7bd" }; // «Otros» (el resto agrupado) en gris, para no confundirlo con «Otro pais» (Alin, 2026-10-27)
const fDiaMet = byId("fDiaMet");
fDiaMet.innerHTML = MES_MET_KEYS.map(k => `<button type="button" data-v="${k}">${MES_MET[k]}</button>`).join("");
fDiaMet.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; state.diaMet = b.dataset.v; save(); renderDiario(); });
/* Una sola gráfica de barras apiladas: por día / semana / mes, un color por valor de la característica elegida en la tabla
   de paciente (Alin, 2026-10-15: «identificar por día cuántos fueron LS y cuántos LP»). */
/* Gráfica apilada genérica (la usan la tendencia por paciente y la tendencia por campaña). */
const APILADA_SEL = new Map(); // valor resaltado por gráfica (clic en la leyenda)
function renderApilada(c) {
  c.fGran.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === c.gran)));
  c.fMet.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === c.met)));
  const host = byId(c.chart), leg = byId(c.leg), DROWS = c.rows;
  const sem = c.gran === "semana", mes = c.gran === "mes", met = c.met, metN = MES_MET[met];
  const d = DIMS[c.dim], gran = mes ? "mes" : sem ? "semana" : "día";
  byId(c.hint).textContent = `${metN} por ${gran}, apilados por ${d.label.toLowerCase()}, del ${fmtDate(state.desde)} al ${fmtDate(state.hasta)}, con los filtros y el medio elegidos. ${c.nota}`;
  /* valores de la característica, ordenados por total; los que pasan de 7 se juntan en «Otros» */
  const totV = {}; DROWS.forEach(r => { if (r.dim !== "") totV[r.dim] = (totV[r.dim] || 0) + r[met]; }); // sin dato: fuera, como en la tabla
  let vals = Object.keys(totV).filter(k => totV[k] > 0);
  if (d.sortKey) vals.sort((x, y) => x.localeCompare(y, "es", { numeric: true })); else vals.sort((x, y) => totV[y] - totV[x]);
  const MAXV = 20, otros = vals.length > MAXV ? vals.slice(MAXV) : [];
  if (otros.length) vals = vals.slice(0, MAXV).concat(["__otros"]);
  const key = v => otros.includes(v) ? "__otros" : v;
  const name = v => v === "__otros" ? `Otros (${otros.length})` : c.dim === "sucursal_real" && SUC[v] ? SUC[v][0] : dimName(c.dim, v); // sucursales a 3 letras (Alin, 2026-10-15)
  const nameLargo = v => v === "__otros" ? `Otros (${otros.length})` : dimName(c.dim, v);
  /* clic en la leyenda: deja solo ese valor; otro clic lo quita */
  const selV = APILADA_SEL.get(c.chart) || "";
  const globales = (OPTIONS && OPTIONS[c.dim]) || []; // orden histórico de cada valor, estable ante periodo y filtros
  const color = i => { const v = vals[i]; if (PAL_FIJA[v]) return PAL_FIJA[v]; const g = globales.findIndex(o => o.v === v); return PAL[(g >= 0 ? g : i) % PAL.length]; };
  const map = new Map();
  DROWS.forEach(r => { if (r.dim === "") return; const k = mes ? r.dia.slice(0, 7) + "-01" : sem ? monday(r.dia) : r.dia; const o = map.get(k) || { k, by: {}, tot: 0 }; const kv = key(r.dim); o.by[kv] = (o.by[kv] || 0) + r[met]; o.tot += r[met]; map.set(k, o); });
  const pts = [...map.values()].sort((a, b) => a.k < b.k ? -1 : 1);
  const total = pts.reduce((a, p) => a + p.tot, 0);
  leg.innerHTML = vals.map((v, i) => { const t = v === "__otros" ? otros.reduce((a, o) => a + totV[o], 0) : totV[v]; return `<button type="button" class="lg-item${selV === v ? " on" : selV ? " off" : ""}" data-v="${esc(v)}" title="${esc(nameLargo(v))} · ${nf.format(t)} · ${pct(div(t, total))}. Clic para ver solo este valor"><i class="sw" style="background:${color(i)}"></i>${esc(name(v))} <small>${nf.format(t)}</small></button>`; }).join("") + `<span><small>Total ${nf.format(total)}</small></span>`;
  leg.querySelectorAll(".lg-item").forEach(b => b.addEventListener("click", () => { const v = b.dataset.v; APILADA_SEL.set(c.chart, selV === v ? "" : v); c.repintar(); }));
  if (!pts.length) { host.innerHTML = `<p class="hint">Sin datos con estos filtros.</p>`; return; }
  const fmtK = k => mes ? cap(new Date(k + "T12:00:00").toLocaleDateString("es-MX", { month: "long", year: "numeric" })) : sem ? `Semana del ${fmtDate(k)}` : fmtDate(k);
  setDims(host); H = W < 520 ? 300 : 380; const mb = 40; ih = H - M.t - mb;
  const top = Math.max(1, ...pts.map(p => selV ? (p.by[selV] || 0) : p.tot)) * 1.06, pw = Math.pow(10, Math.floor(Math.log10(top))), q = top / pw;
  const yMax = ([1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(m => q <= m) || 10) * pw; // tope ajustado, sin aire de más
  const n = pts.length, step = iw / n, bw = Math.max(1.5, Math.min(64, step * 0.84));
  const x = i => M.l + step * (i + 0.5), y = v => M.t + ih - v / yMax * ih;
  let s = axes(yMax, v => nf.format(v));
  /* Etiquetas del eje: todas si caben (en dos renglones alternados, como Looker); si no, cada N. */
  const fx = k => new Date(k + "T12:00:00").toLocaleDateString("es-MX", mes ? { month: "short", year: "numeric" } : { day: "numeric", month: "short" }).replace(".", "");
  const every = step >= 30 ? 1 : Math.max(1, Math.ceil(n / (W < 420 ? 4 : W < 800 ? 7 : 12)));
  pts.forEach((p, i) => { if (i % every === 0 || i === n - 1) s += `<text x="${x(i)}" y="${H - (every === 1 && step < 64 && i % 2 ? 6 : 20)}" text-anchor="middle">${fx(p.k)}</text>`; });
  pts.forEach((p, i) => {
    let acc = 0;
    vals.forEach((v, j) => { const val = p.by[v] || 0; if (!val || (selV && v !== selV)) return; const y1 = y(acc + val), h = y(acc) - y1;
      s += `<rect x="${(x(i) - bw / 2).toFixed(1)}" y="${y1.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" fill="${color(j)}" stroke="#fff" stroke-width="1" pointer-events="none"/>`;
      if (h >= 12 && bw >= 11) s += `<text x="${x(i)}" y="${(y1 + 12).toFixed(1)}" text-anchor="middle" class="seglbl${bw < 26 ? " chica" : ""}">${nf.format(val)}</text>`;
      acc += val; });
    const tip = `<div class="tt">${fmtK(p.k)} · ${metN}</div>` + tipRows(vals.filter(v => p.by[v]).map((v, j) => [`<i class="dot" style="background:${color(vals.indexOf(v))}"></i>${esc(name(v))}`, `${nf.format(p.by[v])} · ${pct(div(p.by[v], p.tot))}`]).concat([["Total", nf.format(p.tot)]]));
    s += `<g class="col" data-tip="${encodeURIComponent(tip)}"><rect class="hit" x="${(x(i) - step / 2).toFixed(1)}" y="${M.t}" width="${step.toFixed(1)}" height="${ih}"/></g>`;
  });
  host.innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${metN} por ${gran} y ${d.label}">${s}</svg>`;
}
function renderDiario() {
  renderApilada({ rows: DROWS, dim: state.pdim, met: state.diaMet, gran: state.gran, fMet: fDiaMet, fGran, hint: "diarioHint", leg: "diarioLeg", chart: "cDiario", nota: "Cambia la característica con los botones de la tabla de arriba.", repintar: renderDiario });
}
const fDesgMet = byId("fDesgMet"), fDesgGran = byId("fDesgGran");
fDesgMet.innerHTML = MES_MET_KEYS.map(k => `<button type="button" data-v="${k}">${MES_MET[k]}</button>`).join("");
fDesgMet.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; state.desgMet = b.dataset.v; save(); renderDesgTend(); });
fDesgGran.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; state.desgGran = b.dataset.v; save(); renderDesgTend(); });
function renderDesgTend() {
  if (!hay("desg")) return;
  byId("h-desg-tend").textContent = `Tendencia por ${DIMS[state.dim].label.toLowerCase()}`;
  renderApilada({ rows: GROWS, dim: state.dim, met: state.desgMet, gran: state.desgGran, fMet: fDesgMet, fGran: fDesgGran, hint: "desgTendHint", leg: "desgLeg", chart: "cDesgTend", nota: "Cambia la dimensión con los botones de la tabla de arriba; clic en un color de la leyenda para ver solo ese valor.", repintar: renderDesgTend });
}

/* ===== Notas al pie con datos en vivo ===== */
function renderNotes() {
  const a = sum(ROWS);
  const base = "La sucursal es la de la visita cuando la hubo (BIP.nom_suc); si no, la que eligió el lead al registrarse. La cita no aporta sucursal.";
  byId("noteSucursal").textContent = a.pvr
    ? `${base} Con los filtros actuales, ${nf.format(a.cambio)} de ${nf.format(a.pvr)} primeras visitas (${pct(div(a.cambio, a.pvr))}) ocurrieron en una sucursal distinta a la que eligió el lead; por eso los resultados se leen por sucursal real.`
    : base;
}

/* ===== Tooltip ===== */
const tip = byId("tip");
on(document, "mousemove", e => {
  const t = e.target.closest("[data-tip]");
  if (!t) { tip.hidden = true; return; }
  tip.innerHTML = decodeURIComponent(t.dataset.tip); tip.hidden = false;
  const r = tip.getBoundingClientRect();
  tip.style.left = Math.min(e.clientX + 14, window.innerWidth - r.width - 8) + "px";
  tip.style.top = Math.min(e.clientY + 14, window.innerHeight - r.height - 8) + "px";
});

function renderCharts() { renderEvol(); renderDiario(); renderDesgTend(); renderMes(); renderReg(); renderHora(); renderCostos(); renderWeekly(); }
function render() { paintFilters(); renderAds(); renderKpis(); renderFunnel(); renderOrigen(); renderLocal(); renderCanal(); renderDesglose(); renderCharts(); renderNotes(); }
/* Menú lateral plegable (preferencia de pantalla, aparte de los filtros) */
const wrapEl = document.querySelector(".wrap"), sideToggle = byId("sideToggle"), sideEl = document.querySelector(".side");
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
const alternarPliegue = () => { plegado = !plegado; try { localStorage.setItem("reporte-transversal-menu", plegado ? "plegado" : "abierto"); } catch (e) {} pintarPliegue(); clearTimeout(resizeT); resizeT = setTimeout(() => { renderCharts(); medirBarra(); }, 200); };
on(sideToggle, "click", alternarPliegue); on(sideBadge, "click", alternarPliegue);
pintarPliegue();
/* Barra de filtros compacta al hacer scroll (Alin, 2026-10-15): congelada ocupaba demasiado. Al pasar de su sitio solo
   quedan Directo / Indirecto, los chips de filtros activos y el periodo; «Ver filtros» (clic o cursor encima) despliega
   los selectores, y al volver arriba la barra regresa completa. */
const barraEl = document.querySelector(".sticky-filters"), verFiltros = byId("verFiltros"), modoRowEl = document.querySelector(".modo-row"), chipsEl = byId("filterNote");
let compacta = false, filtrosAbiertos = false;
/* Al compactar, la barra sale del flujo (position: fixed) y un espaciador conserva su altura original: así el contenido
   no brinca y el scroll sigue fluido (antes el cambio de altura peleaba con el scroll, Alin 2026-10-15). */
const espacio = document.createElement("div"); espacio.className = "espacio-barra"; if (barraEl) barraEl.insertAdjacentElement("afterend", espacio);
function medirBarra() {
  if (!compacta) return;
  const r = (espacio.offsetHeight ? espacio : barraEl).getBoundingClientRect();
  barraEl.style.left = r.left + "px"; barraEl.style.width = r.width + "px";
}
function pintarBarra() {
  if (compacta && !rtEl.classList.contains("compacta")) {
    const r = barraEl.getBoundingClientRect();
    espacio.style.height = r.height + "px"; espacio.style.display = "block";
    barraEl.style.left = r.left + "px"; barraEl.style.width = r.width + "px";
  } else if (!compacta) { espacio.style.display = "none"; espacio.style.height = "0"; barraEl.style.left = ""; barraEl.style.width = ""; }
  rtEl.classList.toggle("compacta", compacta);
  rtEl.classList.toggle("filtros-abiertos", compacta && filtrosAbiertos);
  verFiltros.setAttribute("aria-expanded", String(compacta && filtrosAbiertos));
  verFiltros.title = filtrosAbiertos ? "Ocultar los filtros" : "Mostrar los filtros";
  verFiltros.firstElementChild.textContent = filtrosAbiertos ? "⌃" : "⌄";
  /* los chips viajan a la fila de arriba cuando la barra está compacta y vuelven abajo cuando no */
  if (compacta && chipsEl.parentElement !== modoRowEl) modoRowEl.insertBefore(chipsEl, modoRowEl.querySelector(".periodo-esq"));
  else if (!compacta && chipsEl.parentElement === modoRowEl) barraEl.appendChild(chipsEl);
}
if (barraEl && "IntersectionObserver" in window) {
  const centinela = document.createElement("div"); centinela.className = "centinela"; barraEl.parentElement.insertBefore(centinela, barraEl);
  const io = new IntersectionObserver(([en]) => { const antes = compacta; compacta = !en.isIntersecting && en.boundingClientRect.top < 0; if (!compacta) filtrosAbiertos = false; if (antes !== compacta) pintarBarra(); }, { threshold: 0 });
  io.observe(centinela);
}
on(verFiltros, "click", () => { filtrosAbiertos = !filtrosAbiertos; pintarBarra(); });
on(window, "resize", medirBarra);
on(barraEl, "mouseenter", () => { if (compacta && !filtrosAbiertos) { filtrosAbiertos = true; pintarBarra(); } });
on(barraEl, "mouseleave", () => { if (compacta && filtrosAbiertos && !selAbierto && periodPop.hidden) { filtrosAbiertos = false; pintarBarra(); } });

/* Botones flotantes: volver al menú (siempre), inicio y salir (solo en el sitio) */
const irMenu = byId("irMenu");
const enSitio = typeof opciones === "object" && !!opciones && !!opciones.sitio;
/* En el artefacto, Inicio y Salir se ven como vista previa (Alin, 2026-10-08) pero no hacen nada: no hay sesión ni lista de reportes. */
[byId("irInicio"), byId("irSalir")].forEach(a => { a.hidden = false; if (!enSitio) { a.setAttribute("href", "#"); a.title = "Solo funciona en el sitio publicado"; a.classList.add("fl-preview"); on(a, "click", e => e.preventDefault()); } });
const pintarFlotante = () => { irMenu.hidden = window.scrollY < 240; };
on(window, "scroll", pintarFlotante); pintarFlotante();
on(irMenu, "click", () => { if (plegado) alternarPliegue(); window.scrollTo({ top: 0, behavior: "smooth" }); });
on(window, "resize", () => { clearTimeout(resizeT); resizeT = setTimeout(renderCharts, 150); });
renderMesButtons(); renderSelects(); renderTabs(); render(); renderPerfil();

/* ===== BigQuery ===== */
const pill = byId("statusPill"), msg = byId("statusMsg"), btn = byId("btnRefresh");
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
    rows.forEach(r => { if (r.k === "sucursal_real" && String(r.v) === "INTERNACIONAL") return; /* sucursal «Internacional» fuera del menú y del filtro (Alin, 2026-10-22); sus leads siguen en ALL */
      (OPTIONS[r.k] = OPTIONS[r.k] || []).push({ v: r.v == null ? "" : String(r.v), n: Number(r.n) || 0 }); });
    renderSelects(); renderTabs();
  } catch (e) { /* los selects se quedan con lo fijo */ }
}
let oseq = 0;
async function loadOptionsF(force) {
  const my = ++oseq;
  try {
    const { rows } = await runSql("opciones_f", force);
    if (my !== oseq || !rows) return;
    OPTIONS_F = {};
    rows.forEach(r => { if (r.k === "sucursal_real" && String(r.v) === "INTERNACIONAL") return;
      (OPTIONS_F[r.k] = OPTIONS_F[r.k] || []).push({ v: r.v == null ? "" : String(r.v), n: Number(r.n) || 0 }); });
    renderSelects();
  } catch (e) { /* los selects se quedan con lo anterior */ }
}
async function refreshReg(force) {
  try { const { rows } = await runSql("registros", force); if (!rows) return;
    RROWS = rows.map(r => ({ mes: String(r.mes), canal: String(r.canal), origen: String(r.origen), medio: medioKey(r.medio), registros: +r.registros || 0 })); render();
  } catch (e) { /* registros se quedan en cero */ }
  if (!hay("reg")) return;
  try { const { rows } = await runSql("reg_diario", force); if (!rows) return;
    RDROWS = rows.map(r => ({ dia: String(r.dia).slice(0, 10), registros: +r.registros || 0 })); renderReg();
  } catch (e) { /* la tendencia conserva lo anterior */ }
}
async function refreshWeekly(force) {
  if (!hay("local") && !hay("wk")) return;
  if (!state.sucs.length || !localRegions().length) { WEEKS = []; renderLocal(); renderWeekly(); return; }
  try { const { rows } = await runSql("semanal", force); if (!rows) return;
    WEEKS = rows.map(r => ({ semana: String(r.semana).slice(0, 10), leads: +r.leads || 0, citas: +r.citas || 0, pvr: +r.pvr || 0, inv_asig: +r.inv_asig || 0, leads_all: +r.leads_all || 0, inv_all: +r.inv_all || 0 })).sort((a, b) => a.semana < b.semana ? -1 : 1);
    renderLocal(); renderWeekly();
  } catch (e) { WEEKS = []; renderLocal(); renderWeekly(); }
}
let aseq = 0;
async function refreshAds(force) {
  if (!hay("ads") || SIN_MONTOS) return;
  const my = ++aseq;
  try {
    const { rows } = await runSql("publicidad", force);
    if (my !== aseq || !rows) return;
    AROWS = rows.map(r => ({ mes: String(r.mes), canal: String(r.canal), medio: medioKey(r.medio), inversion: +r.inversion || 0, impresiones: +r.impresiones || 0, alcance: +r.alcance || 0, clics: +r.clics || 0, visitas: r.visitas == null ? null : +r.visitas }));
    renderAds(); renderFunnel();
  } catch (e) { /* la sección conserva lo anterior */ }
}
let dseq = 0;
async function refreshDiario(force) {
  if (!hay("perfil") && !hay("evol")) return; // la tendencia vive dentro de la tabla de paciente (2026-10-15); Evolución diaria también usa estas filas
  const my = ++dseq;
  try {
    const { rows } = await runSql("diario", force);
    if (my !== dseq || !rows) return;
    DROWS = rows.map(r => ({ dia: String(r.dia).slice(0, 10), dim: r.dim == null ? "" : String(r.dim), leads: +r.leads || 0, citas: +r.citas || 0, pvr: +r.pvr || 0, ventas: +r.ventas || 0 })).sort((a, b) => a.dia < b.dia ? -1 : 1);
    renderEvol(); renderDiario(); renderReg();
  } catch (e) { /* la sección conserva lo anterior */ }
}
let cseq = 0;
async function refreshCostos(force) {
  if (!hay("costos") || SIN_MONTOS) return;
  const my = ++cseq;
  try {
    const { rows } = await runSql("costos", force);
    if (my !== cseq || !rows) return;
    CROWS = rows.map(r => ({ mes: String(r.mes), pagado: +r.pagado || 0, medio: String(r.medio), leads: +r.leads || 0, citas: +r.citas || 0, pvr: +r.pvr || 0, ventas: +r.ventas || 0, inversion: +r.inversion || 0 }));
    renderCostos(); renderFunnel(); // el funnel de OLE se parte por medio con estas filas
  } catch (e) { /* la sección conserva lo anterior */ }
}
let gseq = 0;
async function refreshDesgDiario(force) {
  if (!hay("desg")) return;
  const my = ++gseq;
  try {
    const { rows } = await runSql("desg_diario", force);
    if (my !== gseq || !rows) return;
    GROWS = rows.map(r => ({ dia: String(r.dia).slice(0, 10), dim: r.dim == null ? "" : String(r.dim), leads: +r.leads || 0, citas: +r.citas || 0, pvr: +r.pvr || 0, ventas: +r.ventas || 0 })).sort((a, b) => a.dia < b.dia ? -1 : 1);
    renderDesgTend();
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
  refreshPerfil(force); refreshReg(force); refreshWeekly(force); refreshDiario(force); refreshDesgDiario(force); refreshCostos(force); refreshHora(force); refreshAds(force); loadOptionsF(force); refreshMapa(force);
  try {
    const { rows, at } = await runSql("principal", force);
    if (my !== seq) return;
    if (!rows) throw { code: "empty" };
    ALL = parseRows(rows); applyCanal();
    render();
    setStatus(rows.length ? "live" : "snap", rows.length ? "Al día" : "Sin filas",
      rows.length ? `Datos de BigQuery consultados el ${at.toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}.` : `BigQuery no devolvió leads para ${sucsLabel().toLowerCase()} con estos filtros${state.terr && state.sucs.length ? " (revisa que el territorio y la sucursal sean compatibles)" : ""}.`);
  } catch (err) {
    if (my !== seq) return;
    const code = err && err.code;
    if (err && err.retryable && !retried) { retried = true; setTimeout(() => refresh(force), (err.retryAfterMs || 1500) + Math.random() * 1000); return; }
    const map = {
      sesion: "Tu sesión terminó. Recarga la página y vuelve a entrar.",
      tool_error: `BigQuery rechazó la consulta (${esc((err.message || "").slice(0, 160))}).`,
      timeout: "La consulta tardó más de un minuto; dale a «Actualizar» para intentar de nuevo.",
      empty: "BigQuery no devolvió filas."
    };
    setStatus("err", "Sin conexión", map[code] || `No se pudo consultar BigQuery en este momento${err && (err.message || code) ? ` (${esc(String(err.message || code).slice(0, 200))})` : ""}.`);
  } finally { if (my === seq) btn.disabled = false; }
}
btn.addEventListener("click", () => { retried = false; loadOptions(true); refresh(true); });

btn.hidden = false;
loadOptions(false);
refresh(false);

return () => { vivo = false; clearTimeout(resizeT); escuchas.forEach(([t, ev, fn]) => t.removeEventListener(ev, fn)); };
}
