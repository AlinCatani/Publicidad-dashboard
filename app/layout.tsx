import type { Metadata } from "next";
import { Cormorant_Garamond, Quattrocento_Sans } from "next/font/google";
import "./globals.css";

// Mismas fuentes que ingenes.com.
const serif = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600", "700"], style: ["normal", "italic"], variable: "--f-serif" });
const sans = Quattrocento_Sans({ subsets: ["latin"], weight: ["400", "700"], style: ["normal", "italic"], variable: "--f-sans" });

// El título de la pestaña depende del dominio: en reportetransversal.vercel.app el sitio ES el reporte (Alin, 2026-10-15).
export async function generateMetadata(): Promise<Metadata> {
  // Desde el 2026-10-27 la raíz es el reporte en los dos dominios; cada página puede poner su propio título (p. ej. /inversion).
  return {
    title: "Reporte transversal",
    description: "Tableros de publicidad de Ingenes. Solo correos @ingenes.com.",
    robots: { index: false, follow: false },
    // Favicon en .webp (pedido por Alin, 2026-10-07); iOS no lo acepta, por eso el PNG para apple-icon.
    icons: { icon: [{ url: "/icon.webp", type: "image/webp", sizes: "256x256" }], apple: "/apple-icon.png" },
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
