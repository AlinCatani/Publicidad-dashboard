import "server-only";

// Las 4 consultas del reporte «Presupuesto vs inversión». Corren en el servidor con tableros-lectura@;
// el navegador solo manda { tipo, mes }. Leen el dataset claude_vistas (presupuesto autorizado, gasto de
// anuncios Meta + Google y gasto de la cuenta de donación). El artefacto transpila este archivo y arma el
// mismo SQL en el navegador para mandarlo al conector de BigQuery (armar_presupuesto.py).

export const ANIO = "2026";
const V = "`gtm-pvkx9p9-ndk3z.claude_vistas.";
const ADS = V + "inversion_y_metricas_anuncio_diaria`", DON = V + "inversion_donacion_gestantes_diaria`", PRES = V + "presupuesto_autorizado`";

export const TIPOS = ["presupuesto", "fechas", "anio", "mes"] as const;
export type Tipo = (typeof TIPOS)[number];

/* El mes viene del navegador: solo pasa AAAA-MM. */
export function validarMes(m: unknown): string | null {
  return typeof m === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? m : null;
}

export function construirSql(tipo: Tipo, mes: string | null): string | null {
  if (tipo === "presupuesto") return `SELECT FORMAT_DATE('%Y-%m', mes) mes, seccion, nivel, IFNULL(grupo,'') grupo, etiqueta, presupuesto_dia, presupuesto_mes, IFNULL(nota,'') nota
FROM ${PRES} WHERE mes >= '${ANIO}-01-01' ORDER BY mes, seccion, nivel, grupo, etiqueta`;
  if (tipo === "fechas") return `SELECT 'ads' fuente, CAST(MAX(dia) AS STRING) hasta FROM ${ADS} UNION ALL SELECT 'don', CAST(MAX(dia) AS STRING) FROM ${DON}`;
  if (tipo === "anio") return `SELECT FORMAT_DATE('%Y-%m', dia) mes, 'ads' fuente, cuenta, IFNULL(campana,'') campana, '' landing, '' mensaje, '' region, ROUND(SUM(costo)) costo
FROM ${ADS} WHERE dia >= '${ANIO}-01-01' GROUP BY 1,2,3,4
UNION ALL
SELECT FORMAT_DATE('%Y-%m', dia), 'don', cuenta, '', IFNULL(landing,''), IFNULL(mensaje,''), IFNULL(region,''), ROUND(SUM(costo))
FROM ${DON} WHERE dia >= '${ANIO}-01-01' GROUP BY 1,2,3,4,5,6,7`;
  if (tipo === "mes") { const m = validarMes(mes); if (!m) return null; return `SELECT CAST(dia AS STRING) dia, 'ads' fuente, cuenta, IFNULL(campana,'') campana, '' landing, '' mensaje, '' region, ROUND(SUM(costo)) costo
FROM ${ADS} WHERE dia BETWEEN '${m}-01' AND LAST_DAY(DATE '${m}-01') GROUP BY 1,2,3,4
UNION ALL
SELECT CAST(dia AS STRING), 'don', cuenta, '', IFNULL(landing,''), IFNULL(mensaje,''), IFNULL(region,''), ROUND(SUM(costo))
FROM ${DON} WHERE dia BETWEEN '${m}-01' AND LAST_DAY(DATE '${m}-01') GROUP BY 1,2,3,4,5,6,7`; }
  return null;
}
