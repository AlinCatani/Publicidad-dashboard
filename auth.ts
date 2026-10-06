import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Único dominio que entra. `hd` en la URL de Google solo filtra la pantalla de
// elección de cuenta y se puede quitar a mano; la regla real es `esIngenes`,
// que corre en el servidor con el perfil que Google firmó.
const DOMINIO = "ingenes.com";

type PerfilGoogle = { email?: string | null; email_verified?: boolean; hd?: string };

export function esIngenes(perfil: PerfilGoogle | undefined): boolean {
  if (!perfil?.email || perfil.email_verified !== true) return false;
  return (
    perfil.hd === DOMINIO &&
    perfil.email.toLowerCase().endsWith(`@${DOMINIO}`)
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: { params: { hd: DOMINIO, prompt: "select_account" } },
    }),
  ],
  pages: { signIn: "/entrar", error: "/entrar" },
  callbacks: {
    // Al iniciar sesión: si devuelve false, no se crea la sesión.
    signIn({ profile }) {
      return esIngenes(profile as PerfilGoogle | undefined);
    },
    // En cada petición que pasa por proxy.ts: sin sesión → a /entrar.
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
});
