import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tableros Ingenes",
  description: "Tableros de publicidad de Ingenes. Solo correos @ingenes.com.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
