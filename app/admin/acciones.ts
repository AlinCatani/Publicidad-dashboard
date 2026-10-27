"use server";

import { revalidatePath } from "next/cache";
import { requerirAdmin } from "@/lib/sesion";
import { guardarAcceso, leerAcceso, TABLERO_IDS, type Nivel, type Usuario } from "@/lib/acceso";

// Acciones de /admin. Todas exigen administrador y vuelven a leer la lista fresca antes de escribir,
// para no pisar un cambio que Juan haya hecho un segundo antes.

const normaliza = (e: string) => e.trim().toLowerCase();
const esIngenes = (e: string) => /^[^@\s]+@ingenes\.com$/.test(e);

async function conLista(fn: (usuarios: Usuario[]) => Usuario[] | Promise<Usuario[]>) {
  await requerirAdmin();
  const acceso = await leerAcceso(true);
  const usuarios = await fn(acceso.usuarios.map((u) => ({ ...u, tableros: { ...u.tableros } })));
  await guardarAcceso({ ...acceso, usuarios });
  revalidatePath("/admin");
}

/* Alta: acepta varios correos separados por coma, espacio o salto de línea (p. ej. la lista de Juan pegada). */
export async function agregarUsuarios(form: FormData): Promise<void> {
  const texto = String(form.get("correos") ?? "");
  const tableros = TABLERO_IDS.filter((t) => form.get(`t_${t}`) === "on");
  const nivel: Nivel = form.get("nivel") === "resultados" ? "resultados" : "completo";
  const correos = Array.from(new Set(texto.split(/[\s,;<>]+/).map(normaliza).filter(esIngenes)));
  if (!correos.length) return;
  await conLista((usuarios) => {
    correos.forEach((email) => {
      const perm: Record<string, Nivel> = {}; tableros.forEach((t) => { perm[t] = nivel; });
      const i = usuarios.findIndex((u) => u.email === email);
      if (i >= 0) usuarios[i] = { ...usuarios[i], activo: true, tableros: { ...usuarios[i].tableros, ...perm } };
      else usuarios.push({ email, nombre: "", admin: false, activo: true, tableros: perm });
    });
    return usuarios;
  });
}

/* Cambia un tablero de un usuario: "" = sin acceso, o un nivel. */
export async function fijarTablero(form: FormData): Promise<void> {
  const email = normaliza(String(form.get("email") ?? ""));
  const tablero = String(form.get("tablero") ?? "");
  const valor = String(form.get("nivel") ?? "");
  if (!TABLERO_IDS.includes(tablero)) return;
  await conLista((usuarios) => {
    const u = usuarios.find((x) => x.email === email); if (!u) return usuarios;
    if (valor === "completo" || valor === "resultados") u.tableros[tablero] = valor; else delete u.tableros[tablero];
    return usuarios;
  });
}

export async function fijarCampo(form: FormData): Promise<void> {
  const email = normaliza(String(form.get("email") ?? ""));
  const campo = String(form.get("campo") ?? "");
  const valor = String(form.get("valor") ?? "");
  const yo = await requerirAdmin();
  await conLista((usuarios) => {
    const u = usuarios.find((x) => x.email === email); if (!u) return usuarios;
    if (campo === "nombre") u.nombre = valor.slice(0, 80);
    if (campo === "admin") u.admin = valor === "1";
    if (campo === "activo") u.activo = valor === "1";
    // Un administrador no puede quitarse a sí mismo el acceso: que lo haga otro.
    if (u.email === yo.email) { u.admin = true; u.activo = true; }
    return usuarios;
  });
}

export async function quitarUsuario(form: FormData): Promise<void> {
  const email = normaliza(String(form.get("email") ?? ""));
  const yo = await requerirAdmin();
  if (email === yo.email) return;
  await conLista((usuarios) => usuarios.filter((u) => u.email !== email));
}
