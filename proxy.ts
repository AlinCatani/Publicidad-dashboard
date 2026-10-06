// Primera barrera: toda ruta sin sesión se manda a /entrar.
// No es la única — cada página vuelve a pedir la sesión con `requerirSesion()`.
export { auth as proxy } from "@/auth";

export const config = {
  matcher: ["/((?!api/auth|entrar|_next/static|_next/image|favicon.ico).*)"],
};
