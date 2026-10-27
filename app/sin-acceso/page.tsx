import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/auth";
import { requerirSesion } from "@/lib/sesion";
import { permisoDe } from "@/lib/acceso";
import { TABLEROS } from "@/lib/tableros";

export const metadata: Metadata = { title: "Sin acceso" };

// Quien entra con Google pero no está en la lista (o no tiene ese tablero) cae aquí (2026-10-27).
export default async function SinAcceso() {
  const sesion = await requerirSesion();
  const permiso = await permisoDe(sesion.user?.email);
  const mios = TABLEROS.filter((t) => permiso && permiso.tableros[t.ruta.replace(/^\//, "")]);
  return (
    <main className="contenedor">
      <header className="barra">
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <img src="/ingenes-logo.webp" alt="Instituto Ingenes" />
          <h1>Sin acceso</h1>
        </div>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/entrar" }); }}>
          <span className="tenue">{sesion.user?.email}</span>{" "}
          <button type="submit" className="enlace">Salir</button>
        </form>
      </header>
      <p>Tu cuenta <b>{sesion.user?.email}</b> entró bien, pero no tiene permiso para este reporte.</p>
      <p className="tenue" style={{ marginTop: 8 }}>Pídeselo a Alin o a Juan: ellos dan el acceso por correo y por tablero.</p>
      {mios.length > 0 && (
        <>
          <p style={{ marginTop: 28 }}>Sí puedes ver:</p>
          <ul className="lista" style={{ marginTop: 12 }}>
            {mios.map((t) => (
              <li key={t.ruta}><Link href={t.ruta}>{t.nombre}</Link><p className="tenue">{t.descripcion}</p></li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
