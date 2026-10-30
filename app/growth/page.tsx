import type { Metadata } from "next";
import { requerirAdmin } from "@/lib/sesion";
import { leerAcceso, NIVELES, TABLERO_IDS, type Nivel } from "@/lib/acceso";
import { TABLEROS } from "@/lib/tableros";
import { agregarUsuarios, fijarCampo, fijarTablero, quitarUsuario } from "./acciones";
import BarraSitio from "@/components/BarraSitio";
import { cookies } from "next/headers";
import { COOKIE_AVISO, type ResultadoAviso } from "@/lib/enviar-correo";
import "./admin.css";

export const metadata: Metadata = { title: "Administración de reportes" };
export const dynamic = "force-dynamic";

// Administración de accesos (Alin, 2026-10-27): por correo, qué tableros ve y con qué nivel. Solo administradores.
export default async function Admin() {
  const yo = await requerirAdmin();
  const acceso = await leerAcceso(true);
  const usuarios = [...acceso.usuarios].sort((a, b) => a.email.localeCompare(b.email));
  const nombreTablero = (id: string) => TABLEROS.find((t) => t.ruta === `/${id}`)?.nombre ?? id;
  const enEdge = !!(process.env.GLOBAL_CONFIG || process.env.EDGE_CONFIG);
  let aviso: ResultadoAviso | null = null;
  try { aviso = JSON.parse((await cookies()).get(COOKIE_AVISO)?.value ?? "null"); } catch { aviso = null; }

  return (
    <><BarraSitio permiso={yo} actual="/growth" />
    <main className="contenedor adm">
      <header className="barra"><h1>Administración de reportes</h1></header>

      <p className="tenue">
        Quien no esté aquí no entra, aunque tenga correo @ingenes.com. <b>Completo</b> ve montos (inversión, CPL, costos);
        <b> Resultados</b> ve registros, leads, citas, PVR y tasas, sin dinero.
        {!enEdge && <> · <span className="aviso">Modo local:</span> los cambios se guardan en un archivo de esta máquina, no en Vercel.</>}
      </p>

      {aviso && (aviso.enviados.length > 0 || aviso.fallidos.length > 0) && (
        <div className={`adm-resultado${aviso.fallidos.length ? " con-fallos" : ""}`}>
          {aviso.enviados.length > 0 && <p>Correo de aviso enviado a {aviso.enviados.join(", ")}.</p>}
          {aviso.fallidos.length > 0 && (
            <p><b>No se envió el aviso</b> a {aviso.fallidos.join(", ")}
              {aviso.sinConfigurar ? " porque el envío de correo no está configurado." : "."} El acceso sí quedó guardado: avísales tú.</p>
          )}
        </div>
      )}

      <section className="adm-alta">
        <h2>Dar acceso</h2>
        <form action={agregarUsuarios} className="adm-form">
          <label>Correos @ingenes.com (uno o varios, separados por coma o salto de línea)
            <textarea name="correos" rows={3} placeholder="nombre@ingenes.com, otro@ingenes.com" required />
          </label>
          <div className="adm-opciones">
            <fieldset>
              <legend>Tableros</legend>
              {TABLERO_IDS.map((t) => (
                <label key={t} className="adm-check"><input type="checkbox" name={`t_${t}`} defaultChecked={t === "transversal"} /> {nombreTablero(t)}</label>
              ))}
            </fieldset>
            <fieldset>
              <legend>Nivel</legend>
              {NIVELES.map((n) => (
                <label key={n.id} className="adm-check"><input type="radio" name="nivel" value={n.id} defaultChecked={n.id === "completo"} /> {n.nombre} <span className="tenue">· {n.detalle}</span></label>
              ))}
            </fieldset>
          </div>
          <label className="adm-check"><input type="checkbox" name="avisar" defaultChecked /> Avisar por correo <span className="tenue">· solo a quien es nuevo o recibe un tablero que no tenía</span></label>
          <button type="submit" className="boton">Agregar</button>
        </form>
      </section>

      <section>
        <h2>Usuarios <span className="tenue">({usuarios.length})</span></h2>
        {usuarios.length === 0 ? (
          <p className="tenue">Todavía no hay nadie en la lista. Los administradores del entorno ({process.env.ADMINS || "sin definir"}) entran siempre.</p>
        ) : (
          <div className="adm-scroll">
            <table className="adm-tabla">
              <thead>
                <tr>
                  <th>Correo</th>
                  <th>Nombre</th>
                  {TABLERO_IDS.map((t) => <th key={t}>{nombreTablero(t)}</th>)}
                  <th>Admin</th>
                  <th>Activo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.email} className={u.activo ? "" : "inactivo"}>
                    <td className="adm-email">{u.email}{u.email === yo.email && <span className="tenue"> (tú)</span>}</td>
                    <td>
                      <form action={fijarCampo} className="adm-inline">
                        <input type="hidden" name="email" value={u.email} /><input type="hidden" name="campo" value="nombre" />
                        <input type="text" name="valor" defaultValue={u.nombre} placeholder="Nombre" maxLength={80} />
                        <button type="submit" className="adm-mini" title="Guardar nombre">✓</button>
                      </form>
                    </td>
                    {TABLERO_IDS.map((t) => (
                      <td key={t}>
                        <form action={fijarTablero} className="adm-inline">
                          <input type="hidden" name="email" value={u.email} /><input type="hidden" name="tablero" value={t} />
                          <select name="nivel" defaultValue={u.tableros[t] ?? ""} className={u.tableros[t] ? `nivel-${u.tableros[t]}` : "nivel-no"}>
                            <option value="">Sin acceso</option>
                            {NIVELES.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                          </select>
                          <button type="submit" className="adm-mini" title="Guardar">✓</button>
                        </form>
                      </td>
                    ))}
                    <td>
                      <form action={fijarCampo} className="adm-inline">
                        <input type="hidden" name="email" value={u.email} /><input type="hidden" name="campo" value="admin" />
                        <input type="hidden" name="valor" value={u.admin ? "0" : "1"} />
                        <button type="submit" className={`adm-toggle${u.admin ? " on" : ""}`} title={u.admin ? "Quitar administrador" : "Hacer administrador"}>{u.admin ? "Sí" : "No"}</button>
                      </form>
                    </td>
                    <td>
                      <form action={fijarCampo} className="adm-inline">
                        <input type="hidden" name="email" value={u.email} /><input type="hidden" name="campo" value="activo" />
                        <input type="hidden" name="valor" value={u.activo ? "0" : "1"} />
                        <button type="submit" className={`adm-toggle${u.activo ? " on" : ""}`} title={u.activo ? "Desactivar (deja de entrar, conserva sus permisos)" : "Activar"}>{u.activo ? "Sí" : "No"}</button>
                      </form>
                    </td>
                    <td>
                      {u.email !== yo.email && (
                        <form action={quitarUsuario} className="adm-inline">
                          <input type="hidden" name="email" value={u.email} />
                          <button type="submit" className="adm-mini adm-borrar" title="Quitar de la lista">×</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="tenue" style={{ marginTop: 12 }}>Última modificación: {acceso.actualizado.startsWith("1970") ? "—" : new Date(acceso.actualizado).toLocaleString("es-MX")}. Un cambio tarda hasta medio minuto en aplicarse a quien ya tiene el reporte abierto.</p>
      </section>
    </main></>
  );
}

export type { Nivel };
