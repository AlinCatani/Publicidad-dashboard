import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { nivelPara, permisoDe, type Nivel, type Permiso } from "@/lib/acceso";

// Segunda barrera, en el servidor, dentro de cada página. El proxy puede
// saltarse por un matcher mal escrito; esto no.
export async function requerirSesion() {
  const sesion = await auth();
  if (!sesion?.user?.email?.toLowerCase().endsWith("@ingenes.com")) {
    redirect("/entrar");
  }
  return sesion;
}

// Tercera barrera (2026-10-27): además de la sesión, el correo tiene que estar en la lista de acceso con ese
// tablero. Sin permiso → /sin-acceso. Devuelve el nivel (completo / resultados) para que la página lo aplique.
export async function requerirAcceso(tablero: string): Promise<{ email: string; nivel: Nivel; permiso: Permiso }> {
  const sesion = await requerirSesion();
  const permiso = await permisoDe(sesion.user?.email);
  const nivel = nivelPara(permiso, tablero);
  if (!permiso || !nivel) redirect("/sin-acceso");
  return { email: permiso.email, nivel, permiso };
}

export async function requerirAdmin(): Promise<Permiso> {
  const sesion = await requerirSesion();
  const permiso = await permisoDe(sesion.user?.email);
  if (!permiso?.admin) redirect("/sin-acceso");
  return permiso;
}
