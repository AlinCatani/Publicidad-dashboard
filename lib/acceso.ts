import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { TABLEROS } from "@/lib/tableros";

// Quién puede ver qué (decidido por Alin, 2026-10-27): entrar con Google solo dice quién eres; esta lista dice
// si entras y a qué tableros. Quien no está en la lista no entra. Se administra desde /admin, no desde código.
//
// Dónde vive la lista: en Vercel Edge Config (un JSON pequeño en la cuenta de Vercel, sin base de datos ni
// BigQuery) bajo la clave `acceso`. En local, sin Edge Config, en un archivo fuera del repo (ACCESO_ARCHIVO,
// por omisión ../secretos/acceso.json). Nunca hay correos de personas en el repo.
//
// Variables: EDGE_CONFIG (cadena de conexión de lectura, la pone Vercel al conectar el Edge Config al proyecto),
// EDGE_CONFIG_ID y VERCEL_API_TOKEN (para escribir desde /admin), VERCEL_TEAM_ID (equipo ingenes-ads),
// ADMINS (correos separados por coma que siempre son administradores, aunque la lista esté vacía o rota).

export type Nivel = "completo" | "resultados";
export const NIVELES: { id: Nivel; nombre: string; detalle: string }[] = [
  { id: "completo", nombre: "Completo", detalle: "Con montos: inversión, CPL y costos" },
  { id: "resultados", nombre: "Resultados", detalle: "Sin montos: registros, leads, citas, PVR y tasas" },
];
export type Usuario = { email: string; nombre: string; admin: boolean; activo: boolean; tableros: Record<string, Nivel> };
export type Acceso = { usuarios: Usuario[]; actualizado: string };

export const idTablero = (ruta: string) => ruta.replace(/^\//, "");
export const TABLERO_IDS = TABLEROS.map((t) => idTablero(t.ruta));

const normaliza = (email: string) => email.trim().toLowerCase();
const esIngenes = (email: string) => /^[^@\s]+@ingenes\.com$/.test(email);
const admins = () => (process.env.ADMINS ?? "").split(",").map(normaliza).filter(Boolean);

/* ---------- almacén ---------- */

function edgeConfig() {
  const cadena = process.env.EDGE_CONFIG;
  if (!cadena) return null;
  try {
    const u = new URL(cadena);
    const id = u.pathname.replace(/^\//, "");
    const token = u.searchParams.get("token") ?? "";
    return { id: process.env.EDGE_CONFIG_ID || id, lecturaBase: `${u.origin}/${id}`, token };
  } catch {
    return null;
  }
}

const archivoLocal = () => path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.ACCESO_ARCHIVO || "../secretos/acceso.json");

function vacio(): Acceso {
  return { usuarios: [], actualizado: new Date(0).toISOString() };
}

function limpiar(x: unknown): Acceso {
  const o = (x && typeof x === "object" ? x : {}) as Partial<Acceso>;
  const usuarios = (Array.isArray(o.usuarios) ? o.usuarios : [])
    .map((u) => {
      const v = (u && typeof u === "object" ? u : {}) as Partial<Usuario>;
      const email = typeof v.email === "string" ? normaliza(v.email) : "";
      const tableros: Record<string, Nivel> = {};
      Object.entries(v.tableros ?? {}).forEach(([k, n]) => { if (TABLERO_IDS.includes(k) && (n === "completo" || n === "resultados")) tableros[k] = n; });
      return { email, nombre: typeof v.nombre === "string" ? v.nombre.slice(0, 80) : "", admin: v.admin === true, activo: v.activo !== false, tableros };
    })
    .filter((u) => esIngenes(u.email));
  return { usuarios, actualizado: typeof o.actualizado === "string" ? o.actualizado : new Date(0).toISOString() };
}

let memo: { en: number; acceso: Acceso } | null = null;
const MEMO_MS = 30_000;

export async function leerAcceso(fresco = false): Promise<Acceso> {
  if (!fresco && memo && Date.now() - memo.en < MEMO_MS) return memo.acceso;
  let acceso = vacio();
  const ec = edgeConfig();
  try {
    if (ec) {
      const r = await fetch(`${ec.lecturaBase}/item/acceso?token=${encodeURIComponent(ec.token)}`, { cache: "no-store" });
      if (r.ok) acceso = limpiar(await r.json());
      else if (r.status !== 404) console.error("[acceso] lectura Edge Config", r.status);
    } else {
      acceso = limpiar(JSON.parse(await fs.readFile(archivoLocal(), "utf8")));
    }
  } catch (e) {
    const code = (e as NodeJS.ErrnoException)?.code;
    if (code !== "ENOENT") console.error("[acceso] lectura", e instanceof Error ? e.message : e);
  }
  memo = { en: Date.now(), acceso };
  return acceso;
}

export async function guardarAcceso(acceso: Acceso): Promise<void> {
  const limpio = limpiar({ ...acceso, actualizado: new Date().toISOString() });
  const ec = edgeConfig();
  if (ec) {
    const token = process.env.VERCEL_API_TOKEN;
    if (!token) throw new Error("Falta VERCEL_API_TOKEN para escribir el Edge Config");
    const team = process.env.VERCEL_TEAM_ID ? `?teamId=${encodeURIComponent(process.env.VERCEL_TEAM_ID)}` : "";
    const r = await fetch(`https://api.vercel.com/v1/edge-config/${ec.id}/items${team}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ operation: "upsert", key: "acceso", value: limpio }] }),
    });
    if (!r.ok) throw new Error(`Edge Config no aceptó el cambio (${r.status}): ${(await r.text()).slice(0, 200)}`);
  } else {
    const ruta = archivoLocal();
    await fs.mkdir(path.dirname(ruta), { recursive: true });
    await fs.writeFile(ruta, JSON.stringify(limpio, null, 2) + "\n", "utf8");
  }
  memo = { en: Date.now(), acceso: limpio };
}

/* ---------- consultas de permiso ---------- */

export type Permiso = { email: string; admin: boolean; tableros: Record<string, Nivel> };

/* Los ADMINS del entorno siempre entran con todo, aunque la lista esté vacía: así nadie se queda fuera por error. */
export async function permisoDe(email: string | null | undefined): Promise<Permiso | null> {
  if (!email) return null;
  const e = normaliza(email);
  if (!esIngenes(e)) return null;
  const acceso = await leerAcceso();
  const u = acceso.usuarios.find((x) => x.email === e && x.activo);
  const admin = admins().includes(e) || !!u?.admin;
  if (!u && !admin) return null;
  const tableros: Record<string, Nivel> = { ...(u?.tableros ?? {}) };
  if (admin) TABLERO_IDS.forEach((t) => { tableros[t] = "completo"; });
  return { email: e, admin, tableros };
}

export const nivelPara = (p: Permiso | null, tablero: string): Nivel | null => (p ? p.tableros[tablero] ?? null : null);
