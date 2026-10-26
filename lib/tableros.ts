// Índice de tableros. Cada tablero nuevo = una carpeta en app/ + una fila aquí.
// Solo metadatos: los datos se consultan en vivo desde BigQuery, nunca se escriben aquí.
export type Tablero = { ruta: string; nombre: string; descripcion: string };

export const TABLEROS: Tablero[] = [
  {
    ruta: "/monterrey",
    nombre: "Funnel Ingenes Monterrey",
    descripcion: "Registros, leads, agendas y PVRs de Meta y Google en Monterrey, con su costo por etapa.",
  },
  {
    ruta: "/transversal",
    nombre: "Reporte Transversal",
    descripcion: "De las impresiones a las primeras visitas, por sucursal real, campaña y perfil del paciente, con todos los medios y sucursales.",
  },
  {
    ruta: "/campanas",
    nombre: "Análisis de campañas",
    descripcion: "Meta vs Google, etapa por etapa, con los mismos filtros del transversal.",
  },
  {
    ruta: "/inversion",
    nombre: "Presupuesto vs inversión",
    descripcion: "Lo autorizado contra lo gastado en Meta, Google y donación, con el formato del Sheet de presupuesto: por campaña, por corte semanal y por día.",
  },
];
