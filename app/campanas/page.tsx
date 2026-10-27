import type { Metadata } from "next";
import { requerirAcceso } from "@/lib/sesion";
import BarraSitio from "@/components/BarraSitio";
import Tablero from "../transversal/tablero";
import { MARCADO_CAMPANAS } from "../transversal/marcado";

export const metadata: Metadata = { title: "Análisis de campañas" };

// Mismo motor que el transversal (filtros, consultas y pintado); solo cambian las secciones que se muestran.
export default async function Campanas() {
  const { nivel, permiso } = await requerirAcceso("campanas");
  return (<><BarraSitio permiso={permiso} actual="/campanas" /><Tablero marcado={MARCADO_CAMPANAS} nivel={nivel} /></>);
}
