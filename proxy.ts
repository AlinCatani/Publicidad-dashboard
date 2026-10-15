import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Primera barrera: toda ruta sin sesión se manda a /entrar.
// No es la única — cada página vuelve a pedir la sesión con `requerirSesion()`.
//
// Dominio propio del reporte (Alin, 2026-10-15): en reportetransversal.vercel.app la raíz ES el
// Reporte Transversal+Ole; se reescribe a /transversal sin cambiar la URL. En publicidad-dashboard
// la raíz sigue siendo la lista de tableros.
const HOST_TRANSVERSAL = /^reportetransversal\./i;

export const proxy = auth((req) => {
  const host = req.headers.get("host") ?? "";
  if (HOST_TRANSVERSAL.test(host) && req.nextUrl.pathname === "/") {
    return NextResponse.rewrite(new URL("/transversal", req.url));
  }
});

// Quedan fuera del proxy: el login, el flujo de Auth.js, lo interno de Next y los archivos
// estáticos de public/ (logo, portada, favicon): la pantalla de entrar los necesita sin sesión.
export const config = {
  matcher: ["/((?!api/auth|entrar|_next/static|_next/image|.*\\.(?:webp|png|jpg|jpeg|svg|ico)$).*)"],
};
