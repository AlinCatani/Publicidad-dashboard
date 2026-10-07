import type { Metadata } from "next";
import { requerirSesion } from "@/lib/sesion";
import Tablero from "./tablero";

export const metadata: Metadata = { title: "Reporte Transversal+Ole" };

// La página solo exige sesión; los datos los pide el navegador a /api/transversal según los filtros.
export default async function Transversal() {
  await requerirSesion();
  return <Tablero />;
}
