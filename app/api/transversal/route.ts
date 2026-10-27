import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { nivelPara, permisoDe } from "@/lib/acceso";
import { consultarCon } from "@/lib/bigquery";
import { TIPOS, construirSql, validarEstado, type Tipo } from "@/app/transversal/consultas";

// Campos con dinero: con nivel «resultados» no salen del servidor (2026-10-27). Publicidad y costos no se consultan.
const CAMPOS_DINERO = new Set(["inversion", "inv_asig", "inv_all", "gasto", "costo"]);
const SIN_MONTOS_TIPOS = new Set(["publicidad", "costos"]);

// Datos del Reporte Transversal+Ole. El navegador manda { tipo, estado, force };
// aquí se exige sesión @ingenes.com, permiso para el tablero, se valida el estado y se arma el SQL (consultas.ts).
export async function POST(req: Request) {
  const sesion = await auth();
  if (!sesion?.user?.email?.toLowerCase().endsWith("@ingenes.com")) {
    return NextResponse.json({ code: "sesion", error: "Sin sesión" }, { status: 401 });
  }
  const permiso = await permisoDe(sesion.user.email);
  const nivel = nivelPara(permiso, "transversal") ?? nivelPara(permiso, "campanas");
  if (!nivel) return NextResponse.json({ code: "sin_acceso", error: "Sin permiso para este reporte" }, { status: 403 });
  let cuerpo: Record<string, unknown>;
  try { cuerpo = await req.json(); } catch { return NextResponse.json({ code: "bad_request", error: "Cuerpo inválido" }, { status: 400 }); }
  const tipo = cuerpo.tipo as Tipo;
  const estado = validarEstado(cuerpo.estado);
  if (!TIPOS.includes(tipo) || !estado) return NextResponse.json({ code: "bad_request", error: "Petición inválida" }, { status: 400 });
  if (nivel === "resultados" && SIN_MONTOS_TIPOS.has(tipo)) return NextResponse.json({ rows: [], at: new Date().toISOString() });
  const sql = construirSql(tipo, estado);
  if (!sql) return NextResponse.json({ rows: [], at: new Date().toISOString() });
  try {
    const { filas, en } = await consultarCon(sql, cuerpo.force === true);
    const rows = nivel === "resultados"
      ? (filas as Record<string, unknown>[]).map((f) => { const o: Record<string, unknown> = {}; Object.keys(f).forEach((k) => { if (!CAMPOS_DINERO.has(k)) o[k] = f[k]; }); return o; })
      : filas;
    return NextResponse.json({ rows, at: en });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[transversal]", tipo, msg);
    return NextResponse.json({ code: "tool_error", error: msg.slice(0, 300) }, { status: 502 });
  }
}
