import Link from "next/link";
import { signOut } from "@/auth";
import { TABLEROS } from "@/lib/tableros";
import type { Permiso } from "@/lib/acceso";

// Barra de navegación del sitio (Alin, 2026-10-27): arriba de cada reporte, con los tableros que ESA persona puede ver,
// para cambiar de reporte sin pasar por una página de menú. Los administradores ven además «Administración».
export default function BarraSitio({ permiso, actual }: { permiso: Permiso; actual: string }) {
  const mios = TABLEROS.filter((t) => permiso.tableros[t.ruta.replace(/^\//, "")]);
  return (
    <nav className="nav-sitio" aria-label="Reportes">
      <img src="/ingenes-logo.webp" alt="Instituto Ingenes" className="nav-logo" />
      <div className="nav-links">
        {mios.map((t) => (
          <Link key={t.ruta} href={t.ruta} className={actual === t.ruta ? "on" : ""} aria-current={actual === t.ruta ? "page" : undefined}>{t.nombre}</Link>
        ))}
        {permiso.admin && <Link href="/admin" className={`nav-admin${actual === "/admin" ? " on" : ""}`}>Administración</Link>}
      </div>
      <form action={async () => { "use server"; await signOut({ redirectTo: "/entrar" }); }} className="nav-sesion">
        <span className="tenue">{permiso.email}</span>
        <button type="submit" className="enlace">Salir</button>
      </form>
    </nav>
  );
}
