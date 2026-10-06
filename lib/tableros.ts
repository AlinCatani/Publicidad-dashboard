// Índice de tableros. Cada tablero nuevo = una carpeta en app/ + una fila aquí.
// Solo metadatos: los datos se consultan en vivo desde BigQuery, nunca se escriben aquí.
export type Tablero = { ruta: string; nombre: string; descripcion: string };

export const TABLEROS: Tablero[] = [
  {
    ruta: "/monterrey",
    nombre: "Funnel Ingenes Monterrey",
    descripcion: "Registros, leads, agendas y PVRs de Meta y Google en Monterrey, con su costo por etapa.",
  },
];
