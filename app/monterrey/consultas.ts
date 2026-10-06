import "server-only";

// Las 3 consultas del tablero, idénticas a las del artefacto «Funnel Ingenes Monterrey».
// Corren en el servidor con la service account tableros-lectura@.
export const START = "2026-05-01", END = "2026-09-30";
/* Origen del lead: región de la campaña pagada (utm region). 'monterrey' = campañas locales de Monterrey. */
const ORIGEN_SQL = (camp: string) => `CASE WHEN NOT STARTS_WITH(LOWER(TRIM(IFNULL(${camp},''))),'paid') THEN 'sin_campana' WHEN LOWER(TRIM(region))='monterrey' THEN 'local' WHEN LOWER(TRIM(region))='nacional' THEN 'nacional' ELSE 'otras' END`;
export const SQL = `WITH ch AS (
  SELECT m, CASE WHEN m IN ('facebook','instagram','socialmedia','social_media') THEN 'meta' ELSE 'google' END c
  FROM UNNEST(['facebook','instagram','socialmedia','social_media','google_search','pmax','dgen','google','youtube','google</em>search','display']) m
),
reg AS (
  SELECT FORMAT_DATE('%Y-%m', Fecha) mes, IFNULL(ch.c,'otros') canal, ${ORIGEN_SQL("campaign")} origen, COUNT(*) registros
  FROM \`gtm-pvkx9p9-ndk3z.looker_dashboard.registros_historico\` r LEFT JOIN ch ON ch.m = LOWER(TRIM(r.medium))
  WHERE Fecha BETWEEN '${START}' AND '${END}' AND LOWER(TRIM(sucursal)) = 'monterrey' GROUP BY 1,2,3
),
fun AS (
  SELECT FORMAT_DATE('%Y-%m', Fecha_Creada) mes, IFNULL(ch.c,'otros') canal, ${ORIGEN_SQL("campaign")} origen, SUM(LEADs) leads, SUM(CITAS) agendas, SUM(PRIMERA) pvr
  FROM \`gtm-pvkx9p9-ndk3z.looker_dashboard.vw_Lead_Citas_PVR\` v LEFT JOIN ch ON ch.m = LOWER(TRIM(v.medium))
  WHERE Fecha_Creada BETWEEN '${START}' AND '${END}' AND LOWER(TRIM(sucursal)) = 'monterrey' GROUP BY 1,2,3
),
gasto AS (
  SELECT FORMAT_DATE('%Y-%m', fecha) mes, IFNULL(ch.c,'otros') canal, ${ORIGEN_SQL("campaing")} origen, SUM(gasto_asignado) inversion
  FROM \`gtm-pvkx9p9-ndk3z.looker_dashboard.costo_por_lead\` g LEFT JOIN ch ON ch.m = LOWER(TRIM(g.medio))
  WHERE tipo_fila='lead' AND fecha BETWEEN '${START}' AND '${END}' AND LOWER(TRIM(sucursal)) = 'monterrey' GROUP BY 1,2,3
)
SELECT COALESCE(r.mes,f.mes) mes, COALESCE(r.canal,f.canal) canal, COALESCE(r.origen,f.origen) origen,
  IFNULL(r.registros,0) registros, IFNULL(f.leads,0) leads, IFNULL(f.agendas,0) agendas, IFNULL(f.pvr,0) pvr, IFNULL(ROUND(g.inversion),0) inversion
FROM reg r FULL JOIN fun f USING(mes,canal,origen)
LEFT JOIN gasto g ON g.mes = COALESCE(r.mes,f.mes) AND g.canal = COALESCE(r.canal,f.canal) AND g.origen = COALESCE(r.origen,f.origen)`;

/* ===== Corte guardado (BigQuery, 5 oct 2026): mes, canal, origen, registros, leads, agendas, pvr, inversión ===== */
export const OPEN_START = "2026-08-10";
const LOCAL_FILTER = (camp: string, med: string) => `STARTS_WITH(LOWER(TRIM(IFNULL(${camp},''))),'paid') AND LOWER(TRIM(region))='monterrey' AND LOWER(TRIM(${med})) IN ('facebook','instagram','socialmedia','social_media')`;
export const LOCAL_SQL = `WITH reg AS (
  SELECT IF(Fecha < '${OPEN_START}','antes','open') periodo, COUNT(*) registros
  FROM \`gtm-pvkx9p9-ndk3z.looker_dashboard.registros_historico\`
  WHERE Fecha BETWEEN '${START}' AND '${END}' AND LOWER(TRIM(sucursal))='monterrey' AND ${LOCAL_FILTER("campaign", "medium")} GROUP BY 1
),
fun AS (
  SELECT IF(Fecha_Creada < '${OPEN_START}','antes','open') periodo, SUM(LEADs) leads, SUM(CITAS) agendas, SUM(PRIMERA) pvr
  FROM \`gtm-pvkx9p9-ndk3z.looker_dashboard.vw_Lead_Citas_PVR\`
  WHERE Fecha_Creada BETWEEN '${START}' AND '${END}' AND LOWER(TRIM(sucursal))='monterrey' AND ${LOCAL_FILTER("campaign", "medium")} GROUP BY 1
),
asig AS (
  SELECT IF(fecha < '${OPEN_START}','antes','open') periodo, SUM(gasto_asignado) inv_asig
  FROM \`gtm-pvkx9p9-ndk3z.looker_dashboard.costo_por_lead\`
  WHERE tipo_fila='lead' AND fecha BETWEEN '${START}' AND '${END}' AND LOWER(TRIM(sucursal))='monterrey' AND ${LOCAL_FILTER("campaing", "medio")} GROUP BY 1
),
tot AS (
  SELECT IF(dia < '${OPEN_START}','antes','open') periodo, SUM(IF(moneda='MXN',costo,costo*18)) inv_total
  FROM \`gtm-pvkx9p9-ndk3z.looker_dashboard.inversion_diaria\`
  WHERE dia BETWEEN '${START}' AND '${END}' AND LOWER(TRIM(region))='monterrey' GROUP BY 1
),
alls AS (
  SELECT IF(Fecha_Creada < '${OPEN_START}','antes','open') periodo, COUNT(*) leads_all
  FROM \`gtm-pvkx9p9-ndk3z.looker_dashboard.leads_historico\`
  WHERE Fecha_Creada BETWEEN '${START}' AND '${END}' AND STARTS_WITH(LOWER(TRIM(IFNULL(campaign,''))),'paid') AND LOWER(TRIM(region))='monterrey' GROUP BY 1
)
SELECT periodo, registros, leads, agendas, pvr, ROUND(inv_asig) inv_asig, ROUND(inv_total) inv_total, leads_all
FROM reg FULL JOIN fun USING(periodo) FULL JOIN asig USING(periodo) FULL JOIN tot USING(periodo) FULL JOIN alls USING(periodo)`;
export const WEEKLY_SQL = `WITH f AS (
  SELECT DATE_TRUNC(Fecha_Creada, WEEK(MONDAY)) semana, SUM(LEADs) leads, SUM(CITAS) agendas, SUM(PRIMERA) pvr
  FROM \`gtm-pvkx9p9-ndk3z.looker_dashboard.vw_Lead_Citas_PVR\`
  WHERE Fecha_Creada BETWEEN '${START}' AND '${END}' AND LOWER(TRIM(sucursal))='monterrey' AND ${LOCAL_FILTER("campaign", "medium")} GROUP BY 1
),
a AS (
  SELECT DATE_TRUNC(fecha, WEEK(MONDAY)) semana, SUM(gasto_asignado) inv_asig
  FROM \`gtm-pvkx9p9-ndk3z.looker_dashboard.costo_por_lead\`
  WHERE tipo_fila='lead' AND fecha BETWEEN '${START}' AND '${END}' AND LOWER(TRIM(sucursal))='monterrey' AND ${LOCAL_FILTER("campaing", "medio")} GROUP BY 1
),
t AS (
  SELECT DATE_TRUNC(dia, WEEK(MONDAY)) semana, SUM(IF(moneda='MXN',costo,costo*18)) inv_total
  FROM \`gtm-pvkx9p9-ndk3z.looker_dashboard.inversion_diaria\`
  WHERE dia BETWEEN '${START}' AND '${END}' AND LOWER(TRIM(region))='monterrey' GROUP BY 1
),
l AS (
  SELECT DATE_TRUNC(Fecha_Creada, WEEK(MONDAY)) semana, COUNT(*) leads_all
  FROM \`gtm-pvkx9p9-ndk3z.looker_dashboard.leads_historico\`
  WHERE Fecha_Creada BETWEEN '${START}' AND '${END}' AND STARTS_WITH(LOWER(TRIM(IFNULL(campaign,''))),'paid') AND LOWER(TRIM(region))='monterrey' GROUP BY 1
)
SELECT CAST(semana AS STRING) semana, IFNULL(leads,0) leads, IFNULL(agendas,0) agendas, IFNULL(pvr,0) pvr,
  IFNULL(ROUND(inv_asig),0) inv_asig, IFNULL(ROUND(inv_total),0) inv_total, IFNULL(leads_all,0) leads_all
FROM t FULL JOIN f USING(semana) FULL JOIN a USING(semana) FULL JOIN l USING(semana) ORDER BY semana`;
