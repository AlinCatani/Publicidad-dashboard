"use client";

import { useEffect, useRef } from "react";
import { Cormorant_Garamond, Quattrocento_Sans } from "next/font/google";
import { MARCADO } from "./marcado";
import { montar } from "./pintar.js";
import "./transversal.css";

// Mismas fuentes que ingenes.com: Cormorant Garamond en títulos, Quattrocento Sans en texto.
const serif = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--f-serif" });
const sans = Quattrocento_Sans({ subsets: ["latin"], weight: ["400", "700"], style: ["normal", "italic"], variable: "--f-sans" });

export default function Tablero() {
  const raiz = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = raiz.current;
    if (!el) return;
    el.innerHTML = MARCADO;
    const limpiar = montar(el);
    return () => { limpiar(); el.innerHTML = ""; };
  }, []);
  return <div ref={raiz} className={`rt ${serif.variable} ${sans.variable}`} />;
}
