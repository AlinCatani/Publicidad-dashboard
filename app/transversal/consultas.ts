import "server-only";

// Las consultas del Reporte Transversal+Ole, idénticas a las de la v14 del artefacto (2026-10-06).
// Corren en el servidor con la service account tableros-lectura@. El navegador manda solo el
// estado (periodo, canal, mes, dimensiones y filtros); aquí se valida y se arma el SQL, así que
// ningún usuario del sitio puede ejecutar SQL libre ni tocar tablas con datos personales.
//
// Fuentes: la vista `claude_reporte_transversal` (una fila por lead, sin nombre/email/teléfono) y
// `registros_historico` (solo cuentas por mes/canal/origen). Ver ../../../memory/ en dashboards/.

const VIEW = "`gtm-pvkx9p9-ndk3z.looker_dashboard.claude_reporte_transversal`";
const REG = "`gtm-pvkx9p9-ndk3z.looker_dashboard.registros_historico`";
export const MIN_DATE = "2026-03-01";
const META_M = ["facebook", "instagram", "socialmedia", "social_media"];
const GOOGLE_M = ["google_search", "pmax", "dgen", "google", "youtube", "display"];
const inList = (a: string[]) => a.map((m) => `'${m}'`).join(",");
const CANAL_SQL = `CASE WHEN LOWER(TRIM(IFNULL(medium,''))) IN (${inList(META_M)}) THEN 'meta' WHEN LOWER(TRIM(IFNULL(medium,''))) IN (${inList(GOOGLE_M)}) THEN 'google' ELSE 'otros' END`;

/* Región de campaña que corresponde a cada sucursal (valores de utm region, en minúsculas). */
const SUC_REGION: Record<string, string[]> = { "CIUDAD DE MEXICO": ["mexico", "cdmx", "ciudad_de_mexico"], "MONTERREY": ["monterrey", "mty"], "GUADALAJARA": ["guadalajara", "gdl"], "PUEBLA": ["puebla"], "TIJUANA": ["tijuana"], "CANCUN": ["cancun"], "MERIDA": ["merida"], "QUERETARO": ["queretaro"], "VERACRUZ": ["veracruz"], "TOLUCA": ["toluca"], "CIUDAD JUAREZ": ["juarez", "ciudad_juarez", "cd_juarez"], "LEON": ["leon", "bajio"], "MORELIA": ["morelia"], "MEXICALI": ["mexicali"], "CHIHUAHUA": ["chihuahua", "chuhuahua"], "AGUASCALIENTES": ["aguascalientes"], "HERMOSILLO": ["hermosillo"], "MAZATLAN": ["mazatlan"], "PUERTO VALLARTA": ["vallarta", "puerto_vallarta"], "HOUSTON": ["texas", "houston", "usa_south"], "ORANGE COUNTY": ["california", "orange_county"], "NEW YORK": ["newyork", "new_york"], "MIAMI": ["florida", "miami"] };
const localRegions = (sucs: string[]) => { const out: string[] = []; sucs.forEach((suc) => { const base = SUC_REGION[suc] || [suc.toLowerCase().replace(/\s+/g, "_")]; base.concat(base.map((x) => x.replace(/_/g, " "))).forEach((r) => { if (!out.includes(r)) out.push(r); }); }); return out; };
const ORIGEN_SQL = (camp: string, reg: string, loc: string[]) => `CASE WHEN NOT STARTS_WITH(LOWER(TRIM(IFNULL(${camp},''))),'paid') THEN 'sin_campana'${loc.length ? ` WHEN LOWER(TRIM(IFNULL(${reg},''))) IN (${inList(loc)}) THEN 'local'` : ""} WHEN LOWER(TRIM(IFNULL(${reg},''))) = 'nacional' THEN 'nacional' ELSE 'otras' END`;
const SUC_NORM_SQL = (col: string) => `IFNULL(NULLIF(REGEXP_REPLACE(NORMALIZE(UPPER(TRIM(IFNULL(${col},''))), NFD), r'\\pM', ''), ''), 'SIN SUCURSAL')`;
const EDAD_SQL = `CASE WHEN SAFE_CAST(edad AS INT64) IS NULL THEN 'Sin edad' ELSE CONCAT(CAST(DIV(SAFE_CAST(edad AS INT64),5)*5 AS STRING),'–',CAST(DIV(SAFE_CAST(edad AS INT64),5)*5+4 AS STRING)) END`;

/* Dimensiones: la expresión SQL de cada una. Las etiquetas viven en pintar.js. */
const DIMS: Record<string, { sql: string; fixed?: boolean }> = {
  sucursal_real: { sql: "sucursal_real" },
  campaign: { sql: "IFNULL(campaign,'')" },
  medium: { sql: "LOWER(TRIM(IFNULL(medium,'')))" },
  landing: { sql: "IFNULL(landing,'')" },
  region: { sql: "LOWER(TRIM(IFNULL(region,'')))" },
  anuncio: { sql: "IFNULL(anuncio,'')" },
  mensaje: { sql: "IFNULL(mensaje,'')" },
  tipo_de_paciente: { sql: "IFNULL(tipo_de_paciente,'')" },
  perfil: { sql: "IFNULL(perfil,'')" },
  score: { sql: "IFNULL(score,'')" },
  user_persona: { sql: "IFNULL(user_persona,'')" },
  grupo_edad: { sql: EDAD_SQL },
  es_leading: { sql: "IF(es_leading=1,'LeadING','No LeadING')", fixed: true },
  ole: { sql: "IF(STARTS_WITH(LOWER(TRIM(IFNULL(campaign,''))),'paid'),'Con campaña','OLE')", fixed: true }, // OLE = lead orgánico: sin campaña pagada (sin parámetros)
  canal: { sql: CANAL_SQL },
  mes: { sql: "FORMAT_DATE('%Y-%m', fecha)" },
};
const FILTER_DIMS = ["campaign", "medium", "landing", "region", "anuncio", "mensaje", "tipo_de_paciente", "perfil", "score", "user_persona", "grupo_edad", "es_leading", "ole"];
const DESG_DIMS = ["campaign", "medium", "landing", "region", "anuncio", "mensaje", "sucursal_real", "canal", "mes"];
const PERFIL_DIMS = ["tipo_de_paciente", "perfil", "score", "user_persona", "es_leading", "grupo_edad"];
const CANALES = ["pagado", "todos", "meta", "google", "otros"];
export const TIPOS = ["principal", "registros", "semanal", "perfil", "opciones", "diario"] as const;
const VACIO = "__vacio__"; // el select manda esto para «(vacío)»; en SQL es ''
const MAX_SUCS = 40;
const MAX_VALS = 60; // valores por filtro
export type Tipo = (typeof TIPOS)[number];

export type Estado = { desde: string; hasta: string; mes: string; canal: string; dim: string; pdim: string; sucs: string[]; f: Record<string, string[]> };

/* Valida lo que manda el navegador. Devuelve null si no tiene forma de estado. */
export function validarEstado(x: unknown): Estado | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const fecha = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  let desde = fecha(o.desde) ?? MIN_DATE;
  if (desde < MIN_DATE) desde = MIN_DATE;
  let hasta = fecha(o.hasta) ?? new Date().toISOString().slice(0, 10);
  if (hasta < desde) hasta = desde;
  const mes = typeof o.mes === "string" && /^\d{4}-\d{2}$/.test(o.mes) ? o.mes : "todo";
  const canal = typeof o.canal === "string" && CANALES.includes(o.canal) ? o.canal : "pagado";
  const dim = typeof o.dim === "string" && DESG_DIMS.includes(o.dim) ? o.dim : "campaign";
  const pdim = typeof o.pdim === "string" && PERFIL_DIMS.includes(o.pdim) ? o.pdim : "tipo_de_paciente";
  const sucs = Array.isArray(o.sucs) ? (o.sucs as unknown[]).filter((v): v is string => typeof v === "string" && v.length > 0 && v.length <= 60).slice(0, MAX_SUCS) : [];
  const f: Record<string, string[]> = {};
  const fx = o.f && typeof o.f === "object" ? (o.f as Record<string, unknown>) : {};
  const esVal = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 200;
  FILTER_DIMS.forEach((k) => { const v = fx[k]; f[k] = Array.isArray(v) ? (v as unknown[]).filter(esVal).slice(0, MAX_VALS) : esVal(v) ? [v] : []; });
  return { desde, hasta, mes, canal, dim, pdim, sucs, f };
}

const sqlStr = (s: string) => "'" + (s === VACIO ? "" : s).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
const sucsIn = (e: Estado, col: string) => (e.sucs.length ? `${col} IN (${e.sucs.map(sqlStr).join(",")})` : null);
const filtroIn = (k: string, vals: string[]) => `${DIMS[k].sql} IN (${vals.map(sqlStr).join(",")})`;
const channels = (e: Estado) => (e.canal === "pagado" ? ["meta", "google"] : e.canal === "todos" ? ["meta", "google", "otros"] : [e.canal]);
const AGG = `SUM(leads) leads, SUM(citas) citas, SUM(pvr) pvr, SUM(sucursal_cambio) cambio, ROUND(SUM(gasto_mxn_unif)) inversion`;

function whereSql(e: Estado, withCanal: boolean) {
  const w = [`tipo_fila = 'lead'`, `fecha BETWEEN '${e.desde}' AND '${e.hasta}'`];
  const si = sucsIn(e, "sucursal_real"); if (si) w.push(si);
  if (withCanal) { const chs = channels(e); if (chs.length < 3) w.push(`${CANAL_SQL} IN (${inList(chs)})`); if (e.mes !== "todo") w.push(`FORMAT_DATE('%Y-%m', fecha) = '${e.mes}'`); }
  FILTER_DIMS.forEach((k) => { if (e.f[k].length) w.push(filtroIn(k, e.f[k])); });
  return w.join("\n  AND ");
}
const mainSql = (e: Estado) => `SELECT FORMAT_DATE('%Y-%m', fecha) mes, ${CANAL_SQL} canal, ${ORIGEN_SQL("campaign", "region", localRegions(e.sucs))} origen, ${DIMS[e.dim].sql} dim, ${AGG}
FROM ${VIEW}
WHERE ${whereSql(e, false)}
GROUP BY 1,2,3,4`;

/* Registros: misma lógica de filtros sobre registros_historico (sin perfil ni LeadING; sucursal = la elegida). */
const REG_SKIP: Record<string, 1> = { perfil: 1, es_leading: 1 };
function regWhereSql(e: Estado) {
  const w = [`Fecha BETWEEN '${e.desde}' AND '${e.hasta}'`];
  const si = sucsIn(e, SUC_NORM_SQL("sucursal")); if (si) w.push(si);
  const chs = channels(e);
  if (chs.length < 3) w.push(`${CANAL_SQL} IN (${inList(chs)})`);
  FILTER_DIMS.forEach((k) => {
    if (!e.f[k].length || REG_SKIP[k]) return;
    w.push(filtroIn(k, e.f[k]));
  });
  return w.join("\n  AND ");
}
const regSql = (e: Estado) => `SELECT FORMAT_DATE('%Y-%m', Fecha) mes, ${CANAL_SQL} canal, ${ORIGEN_SQL("campaign", "region", localRegions(e.sucs))} origen, COUNT(*) registros
FROM ${REG}
WHERE ${regWhereSql(e)}
GROUP BY 1,2,3`;

/* Semanal de la campaña local (Meta, región de la sucursal): leads de la sucursal vs. todos los leads de esa campaña. */
function weeklySql(e: Estado) {
  const loc = localRegions(e.sucs), suc = sucsIn(e, "sucursal_real");
  if (!loc.length || !suc) return null;
  return `SELECT CAST(DATE_TRUNC(fecha, WEEK(MONDAY)) AS STRING) semana,
  SUM(IF(${suc}, leads, 0)) leads, SUM(IF(${suc}, citas, 0)) citas, SUM(IF(${suc}, pvr, 0)) pvr,
  ROUND(SUM(IF(${suc}, gasto_mxn_unif, 0))) inv_asig, SUM(leads) leads_all, ROUND(SUM(gasto_mxn_unif)) inv_all
FROM ${VIEW}
WHERE tipo_fila = 'lead' AND fecha BETWEEN '${e.desde}' AND '${e.hasta}'
  AND STARTS_WITH(LOWER(TRIM(IFNULL(campaign,''))),'paid') AND LOWER(TRIM(IFNULL(region,''))) IN (${inList(loc)})
  AND ${CANAL_SQL} = 'meta'
GROUP BY 1 ORDER BY 1`;
}
/* Evolución diaria: respeta canal y mes como «perfil». */
const diarioSql = (e: Estado) => `SELECT CAST(fecha AS STRING) dia, SUM(leads) leads, SUM(citas) citas, SUM(pvr) pvr
FROM ${VIEW}
WHERE ${whereSql(e, true)}
GROUP BY 1 ORDER BY 1`;
const perfilSql = (e: Estado) => `SELECT ${DIMS[e.pdim].sql} dim, ${AGG}
FROM ${VIEW}
WHERE ${whereSql(e, true)}
GROUP BY 1`;
const optionsSql = () => ["sucursal_real", ...FILTER_DIMS].filter((k) => !DIMS[k].fixed).map((k) =>
  `SELECT '${k}' k, ${DIMS[k].sql} v, SUM(leads) n FROM ${VIEW} WHERE tipo_fila='lead' AND fecha >= '${MIN_DATE}' GROUP BY 1,2`,
).join("\nUNION ALL\n") + "\nORDER BY k, n DESC";

/* El SQL de cada tipo de consulta. null = no aplica con ese estado (semanal sin sucursal). */
export function construirSql(tipo: Tipo, e: Estado): string | null {
  switch (tipo) {
    case "principal": return mainSql(e);
    case "registros": return regSql(e);
    case "semanal": return weeklySql(e);
    case "perfil": return perfilSql(e);
    case "opciones": return optionsSql();
    case "diario": return diarioSql(e);
  }
}
