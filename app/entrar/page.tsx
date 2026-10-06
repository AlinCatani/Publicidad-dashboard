import { signIn } from "@/auth";

export default async function Entrar({ searchParams }: PageProps<"/entrar">) {
  const { error, callbackUrl } = await searchParams;
  // Volver a la página que se pidió, pero solo dentro del sitio (nunca a otro dominio).
  let destino = "/";
  try {
    const u = new URL(String(callbackUrl ?? "/"), "http://x");
    if (u.pathname.startsWith("/") && !u.pathname.startsWith("//")) destino = u.pathname;
  } catch {}

  return (
    <main className="contenedor centrado">
      <h1>Tableros Ingenes</h1>
      <p className="tenue">Solo con correo @ingenes.com.</p>
      {error && (
        <p className="aviso">
          {error === "AccessDenied"
            ? "Esa cuenta no es @ingenes.com."
            : "No se pudo iniciar sesión. Intenta de nuevo."}
        </p>
      )}
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: destino });
        }}
      >
        <button type="submit" className="boton">Entrar con Google</button>
      </form>
    </main>
  );
}
