import type { Metadata } from "next";
import { requerirAcceso } from "@/lib/sesion";
import Tablero from "./tablero";
import { MARCADO } from "./marcado";

export const metadata: Metadata = { title: "Reporte Transversal" };

// La página exige sesión y permiso para «transversal» (lista de /admin); los datos los pide el navegador a
// /api/transversal según los filtros. `nivel` = completo | resultados (sin montos); la API lo vuelve a aplicar.
export default async function Transversal() {
  const { nivel } = await requerirAcceso("transversal");
  return <Tablero marcado={MARCADO} nivel={nivel} />;
}
