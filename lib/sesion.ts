import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Segunda barrera, en el servidor, dentro de cada página. El proxy puede
// saltarse por un matcher mal escrito; esto no.
export async function requerirSesion() {
  const sesion = await auth();
  if (!sesion?.user?.email?.toLowerCase().endsWith("@ingenes.com")) {
    redirect("/entrar");
  }
  return sesion;
}
