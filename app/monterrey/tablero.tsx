"use client";

import { useEffect } from "react";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { MARCADO } from "./marcado";
import { montar } from "./pintar.js";
import "./monterrey.css";

const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--plex-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--plex-mono" });

type Periodo = { registros: number; leads: number; agendas: number; pvr: number; inv_asig: number; inv_total: number; leads_all: number };
export type Datos = {
  funnel: { mes: string; canal: string; origen: string; registros: number; leads: number; agendas: number; pvr: number; inversion: number }[];
  local: { antes: Periodo; open: Periodo };
  semanas: ({ semana: string } & Omit<Periodo, "registros">)[];
  consultado: string;
};

export default function Tablero({ datos }: { datos: Datos }) {
  useEffect(() => montar(datos), [datos]);
  return <div className={`mty ${sans.variable} ${mono.variable}`} dangerouslySetInnerHTML={{ __html: MARCADO }} />;
}
