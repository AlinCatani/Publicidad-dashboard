import "server-only";
import { BigQuery } from "@google-cloud/bigquery";

// Cliente de BigQuery con la service account de solo lectura tableros-lectura@.
// - En Vercel: BQ_CREDENCIALES trae el JSON de la llave (variable de entorno).
// - En local:  BQ_KEYFILE apunta a secretos/tableros-lectura.json.
const PROYECTO = "gtm-pvkx9p9-ndk3z";

let cliente: BigQuery | null = null;

function bigquery(): BigQuery {
  if (cliente) return cliente;
  const json = process.env.BQ_CREDENCIALES;
  const archivo = process.env.BQ_KEYFILE;
  if (json) cliente = new BigQuery({ projectId: PROYECTO, credentials: JSON.parse(json) });
  else if (archivo) cliente = new BigQuery({ projectId: PROYECTO, keyFilename: archivo });
  else throw new Error("Falta BQ_CREDENCIALES o BQ_KEYFILE: el sitio no tiene con qué leer BigQuery.");
  return cliente;
}

// Memoria de 5 minutos por consulta: recargar la página no vuelve a cobrar BigQuery.
// `forzar` la salta (botón «Actualizar» de un tablero) y guarda el resultado nuevo.
const MEMORIA_MS = 5 * 60 * 1000;
const memoria = new Map<string, { hasta: number; filas: Record<string, unknown>[]; en: string }>();

export async function consultarCon(sql: string, forzar = false): Promise<{ filas: Record<string, unknown>[]; en: string }> {
  const guardado = memoria.get(sql);
  if (!forzar && guardado && guardado.hasta > Date.now()) return { filas: guardado.filas, en: guardado.en };
  const [filas] = await bigquery().query({ query: sql, location: "US" });
  const en = new Date().toISOString();
  memoria.set(sql, { hasta: Date.now() + MEMORIA_MS, filas, en });
  return { filas, en };
}

export async function consultar(sql: string): Promise<Record<string, unknown>[]> {
  return (await consultarCon(sql)).filas;
}
