import { signOut } from "@/auth";

// Cierra la sesión y vuelve a la pantalla de entrar. Lo usa el botón flotante «Salir» de los tableros.
export async function GET() {
  await signOut({ redirectTo: "/entrar" });
}
