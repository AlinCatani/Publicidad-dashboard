// HTML del reporte «Presupuesto vs inversión». Sin datos: todo se pinta en pintar.js con lo que devuelve /api/inversion.
// El artefacto usa este mismo marcado (armar_presupuesto.py cambia el logo por un data URI).
export const MARCADO_INVERSION = `
  <div class="arriba" id="arriba">
  <header class="cab">
    <div class="marca">
      <img src="/ingenes-logo.webp" alt="Ingenes">
      <div><h1>Presupuesto vs inversión</h1><p>Lo autorizado contra lo gastado, con el gasto leído de BigQuery</p></div>
    </div>
    <button type="button" class="boton" id="actualizar" hidden>Actualizar</button>
  </header>
  <div class="pestanas" role="tablist"><button type="button" class="pestana" role="tab" data-vista="tabla" aria-selected="true">Tabla</button><button type="button" class="pestana" role="tab" data-vista="resumen" aria-selected="false">Resumen</button></div>
  <div class="controles">
    <div class="control"><label for="mes">Mes</label><select id="mes"></select></div>
    <div class="control corte" id="ctl-corte" hidden><label for="corte">Día de corte</label>
      <div class="fila"><input type="range" id="corte" min="1" max="31" value="1"><output id="corte-txt" for="corte">—</output></div>
    </div>
  </div>
  <div class="estado carga" id="estado"><span class="punto"></span><span id="estado-txt">Conectando con BigQuery…</span></div>
  </div>
  <div class="asa" id="asa">▾ Mes, pestañas y estado</div>
  <div id="vista-tabla"><div class="plegar"><span class="dia-ctl"><button type="button" id="dia-ayer" aria-pressed="false" title="Agrega una columna con el acumulado a ayer">Ayer</button><button type="button" id="dia-menos" hidden aria-label="Un día antes">◀</button><button type="button" id="dia-mas" hidden aria-label="Un día después">▶</button></span><button type="button" id="plegar-todo">▸ Colapsar todo</button><button type="button" id="desplegar-todo">▾ Expandir todo</button></div><div class="hoja" id="hoja"><div class="vacio">Esperando datos…</div></div>
  <p class="pie" id="pie"></p></div>
  <div id="vista-resumen" class="resumen" hidden>
    <section class="kpis-mes" id="kpis-mes"></section>
    <section class="secciones" id="secciones"></section>
    <section class="anio" id="anio"><h2>Acumulado del año</h2><div class="vacio">Esperando datos…</div></section>
  </div>
`;
