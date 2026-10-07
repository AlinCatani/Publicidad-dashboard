import Link from "next/link";
import { signOut } from "@/auth";
import { requerirSesion } from "@/lib/sesion";
import { TABLEROS } from "@/lib/tableros";

export default async function Inicio() {
  const sesion = await requerirSesion();

  return (
    <main className="contenedor">
      <header className="barra">
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <img src="/ingenes-logo.webp" alt="Instituto Ingenes" />
          <h1>Tableros Ingenes</h1>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/entrar" });
          }}
        >
          <span className="tenue">{sesion.user?.email}</span>{" "}
          <button type="submit" className="enlace">Salir</button>
        </form>
      </header>

      {TABLEROS.length === 0 ? (
        <p className="tenue">Todavía no hay tableros publicados.</p>
      ) : (
        <ul className="lista">
          {TABLEROS.map((t) => (
            <li key={t.ruta}>
              <Link href={t.ruta}>{t.nombre}</Link>
              <p className="tenue">{t.descripcion}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
