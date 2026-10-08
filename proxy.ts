// Primera barrera: toda ruta sin sesión se manda a /entrar.
// No es la única — cada página vuelve a pedir la sesión con `requerirSesion()`.
export { auth as proxy } from "@/auth";

// Quedan fuera del proxy: el login, el flujo de Auth.js, lo interno de Next y los archivos
// estáticos de public/ (logo, portada, favicon): la pantalla de entrar los necesita sin sesión.
export const config = {
  matcher: ["/((?!api/auth|entrar|_next/static|_next/image|.*\\.(?:webp|png|jpg|jpeg|svg|ico)$).*)"],
};
