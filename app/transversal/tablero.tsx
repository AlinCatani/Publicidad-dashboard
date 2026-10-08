"use client";

import { useEffect, useRef } from "react";
import { Cormorant_Garamond, Quattrocento_Sans } from "next/font/google";
import { montar } from "./pintar.js";
import "./transversal.css";

// Mismas fuentes que ingenes.com: Cormorant Garamond en títulos, Quattrocento Sans en texto.
const serif = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--f-serif" });
const sans = Quattrocento_Sans({ subsets: ["latin"], weight: ["400", "700"], style: ["normal", "italic"], variable: "--f-sans" });

// `marcado` = el HTML del reporte (MARCADO o MARCADO_CAMPANAS); el pintado es el mismo.
export default function Tablero({ marcado }: { marcado: string }) {
  const raiz = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = raiz.current;
    if (!el) return;
    el.innerHTML = marcado;
    const limpiar = montar(el, { sitio: true });
    return () => { limpiar(); el.innerHTML = ""; };
  }, [marcado]);
  return <div ref={raiz} className={`rt ${serif.variable} ${sans.variable}`} />;
}
