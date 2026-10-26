"use client";

import { useEffect, useRef } from "react";
import { montar } from "./pintar.js";
import { MARCADO_INVERSION } from "./marcado";
import "./inversion.css";

// El marcado y el pintado son los mismos del artefacto (fuente única en esta carpeta).
// Las fuentes (--f-serif / --f-sans) las pone layout.tsx en <html>.
export default function Tablero() {
  const raiz = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = raiz.current;
    if (!el) return;
    el.innerHTML = MARCADO_INVERSION;
    const limpiar = montar(el, { sitio: true });
    return () => { limpiar(); el.innerHTML = ""; };
  }, []);
  return <div ref={raiz} className="pv" />;
}
