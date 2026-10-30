import "server-only";
import nodemailer from "nodemailer";
import { LOGO_CID } from "@/lib/correo-acceso";
import { LOGO_CORREO_PNG } from "@/lib/logo-correo";

// Envío de correo por Gmail SMTP (2026-10-29), desde acatani@ingenes.com con su contraseña de aplicación — la misma
// que usan las alertas de leads de Automatizaciones/. Variables: CORREO_USUARIO y CORREO_CLAVE, en ../.env.local y
// en Vercel; nunca en el código. Sin ellas no se envía nada y quien llama lo reporta como «sin configurar».

// Resultado del último aviso de /growth: lo deja la acción en una cookie de un minuto y lo lee la página.
// Un archivo "use server" solo puede exportar funciones, por eso vive aquí.
export const COOKIE_AVISO = "growth_aviso";
export type ResultadoAviso = { enviados: string[]; fallidos: string[]; sinConfigurar: boolean };

export const correoConfigurado = () => !!(process.env.CORREO_USUARIO && process.env.CORREO_CLAVE);

let transporte: nodemailer.Transporter | null = null;
function smtp() {
  transporte ??= nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: process.env.CORREO_USUARIO, pass: process.env.CORREO_CLAVE },
  });
  return transporte;
}

export async function enviarCorreo(m: { para: string; asunto: string; html: string; texto: string }): Promise<void> {
  if (!correoConfigurado()) throw new Error("Falta CORREO_USUARIO o CORREO_CLAVE");
  await smtp().sendMail({
    from: { name: "Reportes de Atracción · Ingenes", address: process.env.CORREO_USUARIO! },
    to: m.para,
    subject: m.asunto,
    html: m.html,
    text: m.texto,
    attachments: m.html.includes(`cid:${LOGO_CID}`)
      ? [{ filename: "ingenes.png", content: Buffer.from(LOGO_CORREO_PNG, "base64"), contentType: "image/png", cid: LOGO_CID }]
      : [],
  });
}
