import { existsSync } from "node:fs";
import { signIn } from "@/auth";

// Foto de portada opcional: public/portada.webp. Si no está, queda el degradado azul.
const HAY_PORTADA = existsSync("public/portada.webp");

const GOOGLE_G = (
  <svg className="g" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.8-6.8C35.7 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 2.9-2.2 5.4-4.7 7.1l7.6 5.9c4.4-4.1 6.9-10.1 6.9-17.5z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C1 16.4 0 20.1 0 24s1 7.6 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
);

export default async function Entrar({ searchParams }: PageProps<"/entrar">) {
  const { error, callbackUrl } = await searchParams;
  // Volver a la página que se pidió, pero solo dentro del sitio (nunca a otro dominio).
  let destino = "/";
  try {
    const u = new URL(String(callbackUrl ?? "/"), "http://x");
    if (u.pathname.startsWith("/") && !u.pathname.startsWith("//")) destino = u.pathname;
  } catch {}

  return (
    <main className="entrar">
      <section className="portada" aria-hidden="true">
        {HAY_PORTADA && <img src="/portada.webp" alt="" />}
      </section>
      <section className="panel">
        <img src="/ingenes-logo.webp" alt="Instituto Ingenes" />
        <h1>Reportes de Atracción</h1>
        {error && (
          <p className="aviso">
            {error === "AccessDenied" ? "Esa cuenta no es @ingenes.com." : "No se pudo iniciar sesión. Intenta de nuevo."}
          </p>
        )}
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: destino });
          }}
        >
          <button type="submit" className="boton">{GOOGLE_G}Entrar con Google</button>
        </form>
        <p className="nota">Solo con correo @ingenes.com.</p>
      </section>
    </main>
  );
}
