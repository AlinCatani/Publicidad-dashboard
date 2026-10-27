import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { nivelPara, permisoDe } from "@/lib/acceso";
import { consultarCon } from "@/lib/bigquery";
import { TIPOS, construirSql, validarMes, type Tipo } from "@/app/inversion/consultas";

// Datos del reporte «Presupuesto vs inversión». El navegador manda { tipo, mes, force };
// aquí se exige sesión @ingenes.com, se valida y se arma el SQL (consultas.ts).
export async function POST(req: Request) {
  const sesion = await auth();
  if (!sesion?.user?.email?.toLowerCase().endsWith("@ingenes.com")) {
    return NextResponse.json({ code: "sesion", error: "Sin sesión" }, { status: 401 });
  }
  if (!nivelPara(await permisoDe(sesion.user.email), "inversion")) return NextResponse.json({ code: "sin_acceso", error: "Sin permiso para este reporte" }, { status: 403 });
  let cuerpo: Record<string, unknown>;
  try { cuerpo = await req.json(); } catch { return NextResponse.json({ code: "bad_request", error: "Cuerpo inválido" }, { status: 400 }); }
  const tipo = cuerpo.tipo as Tipo;
  if (!TIPOS.includes(tipo)) return NextResponse.json({ code: "bad_request", error: "Petición inválida" }, { status: 400 });
  const mes = tipo === "mes" ? validarMes(cuerpo.mes) : null;
  if (tipo === "mes" && !mes) return NextResponse.json({ code: "bad_request", error: "Mes inválido" }, { status: 400 });
  const sql = construirSql(tipo, mes);
  if (!sql) return NextResponse.json({ code: "bad_request", error: "Petición inválida" }, { status: 400 });
  try {
    const { filas, en } = await consultarCon(sql, cuerpo.force === true);
    return NextResponse.json({ rows: filas, at: en });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[inversion]", tipo, msg);
    return NextResponse.json({ code: "tool_error", error: msg.slice(0, 300) }, { status: 502 });
  }
}
