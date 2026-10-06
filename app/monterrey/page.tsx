import type { Metadata } from "next";
import { requerirSesion } from "@/lib/sesion";
import { consultar } from "@/lib/bigquery";
import { SQL, LOCAL_SQL, WEEKLY_SQL } from "./consultas";
import Tablero, { type Datos } from "./tablero";

export const metadata: Metadata = { title: "Funnel Ingenes Monterrey" };

const num = (v: unknown) => Number(v) || 0;

export default async function Monterrey() {
  await requerirSesion();

  const [f, l, s] = await Promise.all([consultar(SQL), consultar(LOCAL_SQL), consultar(WEEKLY_SQL)]);

  // Solo números planos al navegador: los mismos campos que el artefacto.
  const funnel = f.map((r) => ({
    mes: String(r.mes), canal: String(r.canal), origen: String(r.origen),
    registros: num(r.registros), leads: num(r.leads), agendas: num(r.agendas), pvr: num(r.pvr), inversion: num(r.inversion),
  }));
  const vacio = { registros: 0, leads: 0, agendas: 0, pvr: 0, inv_asig: 0, inv_total: 0, leads_all: 0 };
  const local: Datos["local"] = { antes: { ...vacio }, open: { ...vacio } };
  l.forEach((r) => {
    const p = r.periodo === "antes" || r.periodo === "open" ? r.periodo : null;
    if (p) local[p] = {
      registros: num(r.registros), leads: num(r.leads), agendas: num(r.agendas), pvr: num(r.pvr),
      inv_asig: num(r.inv_asig), inv_total: num(r.inv_total), leads_all: num(r.leads_all),
    };
  });
  // Igual que el artefacto: se descartan al final las semanas sin gasto registrado.
  const semanas = s
    .map((r) => ({
      semana: String(r.semana).slice(0, 10), leads: num(r.leads), agendas: num(r.agendas), pvr: num(r.pvr),
      inv_asig: num(r.inv_asig), inv_total: num(r.inv_total), leads_all: num(r.leads_all),
    }))
    .sort((a, b) => (a.semana < b.semana ? -1 : 1));
  while (semanas.length && semanas[semanas.length - 1].inv_total === 0) semanas.pop();

  return <Tablero datos={{ funnel, local, semanas, consultado: new Date().toISOString() }} />;
}
