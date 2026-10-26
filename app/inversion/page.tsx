import type { Metadata } from "next";
import { requerirSesion } from "@/lib/sesion";
import Tablero from "./tablero";

export const metadata: Metadata = { title: "Presupuesto vs inversión" };

// Presupuesto autorizado contra gasto real (Meta + Google + donación), con el formato del Sheet «Presupuesto / Publicidad».
// Mismo pintado que el artefacto de claude.ai; aquí los datos llegan por /api/inversion.
export default async function Inversion() {
  await requerirSesion();
  return <Tablero />;
}
