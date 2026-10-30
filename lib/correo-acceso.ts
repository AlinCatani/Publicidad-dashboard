// Correo que avisa a una persona que ya tiene acceso a uno o más tableros (pedido por Alin, 2026-10-29).
// Solo arma el contenido; el envío vive aparte. Look and feel de ingenes.com: logo a color sobre blanco, como el menú
// del sitio (el blanco sobre azul pierde el verde y el azul de la marca), PNG ya recortado y sin transparencia para que
// el modo oscuro de Gmail no lo deje invisible; azul #253f78, filete dorado,
// Cormorant Garamond en títulos y Quattrocento Sans en el cuerpo (Gmail cae a Georgia / Arial).
// HTML de correo: tablas y estilos en línea, porque Gmail y Outlook ignoran <style> y flex/grid.

export type TableroAviso = { nombre: string; descripcion: string; ruta: string; nivel: "completo" | "resultados" };
export type DatosAviso = {
  nombre: string;          // puede venir vacío: entonces se saluda sin nombre
  tableros: TableroAviso[];
  sitio: string;           // p. ej. https://reportetransversal.vercel.app, sin «/» al final
  otorgadoPor?: string;    // nombre de quien dio el acceso
  logoSrc?: string;        // por omisión el logo adjunto (cid:); la vista previa pasa uno propio
};

// El logo va adjunto e incrustado (cid:), no enlazado al sitio: una imagen externa salía rota en Gmail mientras el
// sitio no la publicara, y Outlook bloquea las externas por omisión. El adjunto lo agrega lib/enviar-correo.ts.
export const LOGO_CID = "logo-ingenes";

const AZUL = "#253f78", AZUL_OSC = "#1a2f5c", TINTA = "#0d2247", SUAVE = "#3d558a", ATENUADO = "#6a7894";
const LINEA = "#e3e8ef", FONDO = "#f6f8fb", FONDO_AZUL = "#eef3fb", DORADO = "#c8a040";
const SERIF = `'Cormorant Garamond', Georgia, 'Times New Roman', serif`;
const SANS = `'Quattrocento Sans', Arial, Helvetica, sans-serif`;

const NIVEL = {
  completo: { nombre: "Completo", detalle: "con montos de inversión y costos" },
  resultados: { nombre: "Resultados", detalle: "registros, leads, citas y tasas, sin montos" },
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function correoDeAcceso(d: DatosAviso): { asunto: string; html: string; texto: string } {
  const saludo = d.nombre.trim() ? `Hola, ${d.nombre.trim().split(/\s+/)[0]}` : "Hola";
  const uno = d.tableros.length === 1;
  const asunto = uno ? `Ya tienes acceso a ${d.tableros[0].nombre}` : "Ya tienes acceso a los Reportes de Atracción";
  const quien = d.otorgadoPor ? `${d.otorgadoPor} te dio acceso` : "Se te dio acceso";
  const entrar = uno ? `${d.sitio}${d.tableros[0].ruta}` : d.sitio;

  const filas = d.tableros.map((t) => `
          <tr>
            <td style="padding:16px 18px;border-bottom:1px solid ${LINEA};">
              <a href="${esc(d.sitio + t.ruta)}" style="font-family:${SERIF};font-size:20px;font-weight:700;color:${AZUL};text-decoration:none;">${esc(t.nombre)}</a>
              <div style="font-family:${SANS};font-size:14px;line-height:20px;color:${SUAVE};padding-top:4px;">${esc(t.descripcion)}</div>
              <div style="padding-top:10px;">
                <span style="display:inline-block;font-family:${SANS};font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:${AZUL};background:${FONDO_AZUL};border:1px solid #d3deef;border-radius:999px;padding:3px 10px;">Nivel ${NIVEL[t.nivel].nombre}</span>
                <span style="font-family:${SANS};font-size:12px;color:${ATENUADO};padding-left:6px;">${NIVEL[t.nivel].detalle}</span>
              </div>
            </td>
          </tr>`).join("");

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(asunto)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Quattrocento+Sans:wght@400;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${FONDO};">
<div style="display:none;max-height:0;overflow:hidden;">${esc(quien)}. Entra con tu cuenta de Google de Ingenes.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${FONDO};">
  <tr><td align="center" style="padding:32px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid ${LINEA};border-radius:14px;overflow:hidden;">

      <tr><td style="height:6px;line-height:6px;font-size:0;background:${AZUL};">&nbsp;</td></tr>
      <tr><td style="background:#ffffff;padding:24px 32px 20px;">
        <img src="${esc(d.logoSrc ?? `cid:${LOGO_CID}`)}" width="200" height="76" alt="Instituto Ingenes" style="display:block;border:0;width:200px;height:76px;">
      </td></tr>
      <tr><td style="height:3px;line-height:3px;font-size:0;background:${DORADO};">&nbsp;</td></tr>

      <tr><td style="padding:34px 32px 8px;">
        <div style="font-family:${SANS};font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${DORADO};">Reportes de Atracción</div>
        <h1 style="margin:8px 0 0;font-family:${SERIF};font-size:34px;line-height:38px;font-weight:700;color:${AZUL};">Ya tienes acceso</h1>
        <p style="margin:18px 0 0;font-family:${SANS};font-size:16px;line-height:24px;color:${TINTA};">${esc(saludo)}:</p>
        <p style="margin:10px 0 0;font-family:${SANS};font-size:16px;line-height:24px;color:${TINTA};">${esc(quien)} ${uno ? "a este tablero" : "a estos tableros"} de Publicidad de Ingenes. Los datos se leen en vivo, así que siempre ves lo más reciente.</p>
      </td></tr>

      <tr><td style="padding:22px 32px 4px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINEA};border-radius:10px;border-collapse:separate;">${filas}
        </table>
      </td></tr>

      <tr><td align="center" style="padding:28px 32px 6px;">
        <a href="${esc(entrar)}" style="display:inline-block;font-family:${SANS};font-size:16px;font-weight:700;color:#ffffff;background:${AZUL};border:1px solid ${AZUL_OSC};border-radius:999px;padding:14px 34px;text-decoration:none;">Entrar ${uno ? "al tablero" : "a los tableros"}</a>
      </td></tr>

      <tr><td style="padding:22px 32px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${FONDO_AZUL};border-radius:10px;">
          <tr><td style="padding:16px 18px;font-family:${SANS};font-size:14px;line-height:21px;color:${SUAVE};">
            <strong style="color:${AZUL};">Cómo entrar:</strong> usa el botón «Continuar con Google» y elige tu cuenta <strong>@ingenes.com</strong>. No hace falta contraseña nueva. Con una cuenta personal no vas a poder entrar.
          </td></tr>
        </table>
      </td></tr>

      <tr><td style="padding:18px 32px 26px;border-top:1px solid ${LINEA};font-family:${SANS};font-size:12px;line-height:18px;color:${ATENUADO};">
        Este acceso es personal: por favor no reenvíes el enlace. Si crees que te llegó por error, responde a este correo.<br>
        Instituto de Infertilidad y Genética · Publicidad
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

  const texto = [
    `${saludo}:`,
    ``,
    `${quien} ${uno ? "a este tablero" : "a estos tableros"} de Publicidad de Ingenes:`,
    ...d.tableros.map((t) => `- ${t.nombre} (nivel ${NIVEL[t.nivel].nombre}): ${d.sitio}${t.ruta}`),
    ``,
    `Cómo entrar: «Continuar con Google» con tu cuenta @ingenes.com.`,
    ``,
    `Este acceso es personal: por favor no reenvíes el enlace.`,
  ].join("\n");

  return { asunto, html, texto };
}
