import type { Metadata } from "next";
import { requerirSesion } from "@/lib/sesion";
import Tablero from "../transversal/tablero";
import { MARCADO_CAMPANAS } from "../transversal/marcado";

export const metadata: Metadata = { title: "Análisis de campañas" };

// Mismo motor que el transversal (filtros, consultas y pintado); solo cambian las secciones que se muestran.
export default async function Campanas() {
  await requerirSesion();
  return <Tablero marcado={MARCADO_CAMPANAS} />;
}
