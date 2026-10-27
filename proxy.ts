import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Primera barrera: toda ruta sin sesión se manda a /entrar.
// No es la única — cada página vuelve a pedir la sesión con `requerirSesion()`.
//
// La raíz ES el Reporte Transversal en los dos dominios (Alin, 2026-10-27; antes solo en
// reportetransversal.vercel.app): se reescribe a /transversal sin cambiar la URL. La lista de
// tableros ya no se muestra; /monterrey se eliminó del sitio y /campanas e /inversion quedan ocultos
// (Alin, 2026-10-27): mandan a la raíz. Presupuesto vs inversión se sigue viendo en su artefacto.
const OCULTOS = /^\/(monterrey|campanas|inversion)(\/|$)/i;

export const proxy = auth((req) => {
  const ruta = req.nextUrl.pathname;
  if (ruta === "/") return NextResponse.rewrite(new URL("/transversal", req.url));
  if (OCULTOS.test(ruta)) return NextResponse.redirect(new URL("/", req.url));
});

// Quedan fuera del proxy: el login, el flujo de Auth.js, lo interno de Next y los archivos
// estáticos de public/ (logo, portada, favicon): la pantalla de entrar los necesita sin sesión.
export const config = {
  matcher: ["/((?!api/auth|entrar|_next/static|_next/image|.*\\.(?:webp|png|jpg|jpeg|svg|ico)$).*)"],
};
