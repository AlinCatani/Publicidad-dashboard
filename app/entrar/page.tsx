import { signIn } from "@/auth";

export default async function Entrar({ searchParams }: PageProps<"/entrar">) {
  const { error } = await searchParams;

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
          await signIn("google", { redirectTo: "/" });
        }}
      >
        <button type="submit" className="boton">Entrar con Google</button>
      </form>
    </main>
  );
}
