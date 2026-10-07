import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { consultarCon } from "@/lib/bigquery";
import { TIPOS, construirSql, validarEstado, type Tipo } from "@/app/transversal/consultas";

// Datos del Reporte Transversal+Ole. El navegador manda { tipo, estado, force };
// aquí se exige sesión @ingenes.com, se valida el estado y se arma el SQL (consultas.ts).
export async function POST(req: Request) {
  const sesion = await auth();
  if (!sesion?.user?.email?.toLowerCase().endsWith("@ingenes.com")) {
    return NextResponse.json({ code: "sesion", error: "Sin sesión" }, { status: 401 });
  }
  let cuerpo: Record<string, unknown>;
  try { cuerpo = await req.json(); } catch { return NextResponse.json({ code: "bad_request", error: "Cuerpo inválido" }, { status: 400 }); }
  const tipo = cuerpo.tipo as Tipo;
  const estado = validarEstado(cuerpo.estado);
  if (!TIPOS.includes(tipo) || !estado) return NextResponse.json({ code: "bad_request", error: "Petición inválida" }, { status: 400 });
  const sql = construirSql(tipo, estado);
  if (!sql) return NextResponse.json({ rows: [], at: new Date().toISOString() });
  try {
    const { filas, en } = await consultarCon(sql, cuerpo.force === true);
    return NextResponse.json({ rows: filas, at: en });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[transversal]", tipo, msg);
    return NextResponse.json({ code: "tool_error", error: msg.slice(0, 300) }, { status: 502 });
  }
}
