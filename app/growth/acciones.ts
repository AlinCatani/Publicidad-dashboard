"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { requerirAdmin } from "@/lib/sesion";
import { guardarAcceso, leerAcceso, TABLERO_IDS, type Nivel, type Usuario } from "@/lib/acceso";
import { TABLEROS } from "@/lib/tableros";
import { correoDeAcceso } from "@/lib/correo-acceso";
import { COOKIE_AVISO, correoConfigurado, enviarCorreo, type ResultadoAviso } from "@/lib/enviar-correo";

// Acciones de /admin. Todas exigen administrador y vuelven a leer la lista fresca antes de escribir,
// para no pisar un cambio que Juan haya hecho un segundo antes.

const normaliza = (e: string) => e.trim().toLowerCase();
const esIngenes = (e: string) => /^[^@\s]+@ingenes\.com$/.test(e);

async function conLista(fn: (usuarios: Usuario[]) => Usuario[] | Promise<Usuario[]>) {
  await requerirAdmin();
  const acceso = await leerAcceso(true);
  const usuarios = await fn(acceso.usuarios.map((u) => ({ ...u, tableros: { ...u.tableros } })));
  await guardarAcceso({ ...acceso, usuarios });
  revalidatePath("/growth");
}

/* Alta: acepta varios correos separados por coma, espacio o salto de línea (p. ej. la lista de Juan pegada).
   Con «Avisar por correo» marcado (2026-10-29), a quien es nuevo o recibe un tablero que no tenía le llega el correo
   de lib/correo-acceso.ts con esos tableros. El acceso se guarda primero: si el correo falla, el acceso queda igual
   y /growth muestra a quién no le llegó (cookie de un minuto, no en la URL, porque lleva correos). */
export async function agregarUsuarios(form: FormData): Promise<void> {
  const texto = String(form.get("correos") ?? "");
  const tableros = TABLERO_IDS.filter((t) => form.get(`t_${t}`) === "on");
  const nivel: Nivel = form.get("nivel") === "resultados" ? "resultados" : "completo";
  const avisar = form.get("avisar") === "on";
  const correos = Array.from(new Set(texto.split(/[\s,;<>]+/).map(normaliza).filter(esIngenes)));
  if (!correos.length) return;
  const nuevos: { email: string; nombre: string; tableros: string[] }[] = [];
  await conLista((usuarios) => {
    correos.forEach((email) => {
      const perm: Record<string, Nivel> = {}; tableros.forEach((t) => { perm[t] = nivel; });
      const i = usuarios.findIndex((u) => u.email === email);
      const antes = i >= 0 && usuarios[i].activo ? usuarios[i].tableros : {};
      const ganados = tableros.filter((t) => !antes[t]);
      if (ganados.length) nuevos.push({ email, nombre: i >= 0 ? usuarios[i].nombre : "", tableros: ganados });
      if (i >= 0) usuarios[i] = { ...usuarios[i], activo: true, tableros: { ...usuarios[i].tableros, ...perm } };
      else usuarios.push({ email, nombre: "", admin: false, activo: true, tableros: perm });
    });
    return usuarios;
  });
  if (!avisar || !nuevos.length) return;

  const resultado: ResultadoAviso = { enviados: [], fallidos: [], sinConfigurar: !correoConfigurado() };
  if (resultado.sinConfigurar) resultado.fallidos = nuevos.map((n) => n.email);
  else {
    const sitio = (process.env.SITIO_URL || "https://reportetransversal.vercel.app").replace(/\/$/, "");
    const otorgadoPor = (await auth())?.user?.name ?? undefined;
    await Promise.all(nuevos.map(async (n) => {
      const c = correoDeAcceso({
        nombre: n.nombre, sitio, otorgadoPor,
        tableros: n.tableros.map((id) => {
          const t = TABLEROS.find((x) => x.ruta === `/${id}`)!;
          return { nombre: t.nombre, descripcion: t.descripcion, ruta: t.ruta, nivel };
        }),
      });
      try { await enviarCorreo({ para: n.email, ...c }); resultado.enviados.push(n.email); }
      catch (e) { console.error("[growth] aviso a", n.email, e instanceof Error ? e.message : e); resultado.fallidos.push(n.email); }
    }));
  }
  (await cookies()).set(COOKIE_AVISO, JSON.stringify(resultado), { path: "/growth", maxAge: 60, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
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
