// Marcado del tablero, portado del artefacto. Solo estructura y textos: ningún número.
export const MARCADO = `<div class="wrap">
  <header>
    <div>
      <p class="eyebrow">Ingenes · Sucursal Monterrey</p>
      <h1>Funnel de marketing a primera visita</h1>
      <p class="sub">Registros, leads, agendamientos y PVRs de Meta y Google, con su costo por etapa.</p>
    </div>
    <div class="period" id="periodLabel">1 may – 30 sep 2026</div>
  </header>

  <div class="status" role="status" aria-live="polite">
    <span class="pill live" id="statusPill">Al día</span>
    <span class="msg" id="statusMsg"></span>
    
  </div>

  <div class="filters" aria-label="Filtros">
    <div class="fgroup">
      <span class="flabel" id="lbl-canal">Canal</span>
      <div class="seg" role="group" aria-labelledby="lbl-canal" id="fCanal">
        <button type="button" id="c-ambos" data-v="ambos">Meta + Google</button>
        <button type="button" id="c-meta" data-v="meta"><span class="dot meta"></span>Meta</button>
        <button type="button" id="c-google" data-v="google"><span class="dot google"></span>Google</button>
      </div>
    </div>
    <div class="fgroup">
      <span class="flabel" id="lbl-mes">Mes</span>
      <div class="seg" role="group" aria-labelledby="lbl-mes" id="fMes"></div>
    </div>
  </div>

  <section class="kpis" id="kpis" aria-label="Indicadores principales"></section>

  <section class="panel" aria-labelledby="h-funnel">
    <div class="phead">
      <div>
        <h2 id="h-funnel">Funnel por etapa</h2>
        <p class="hint">Cada anillo muestra el total de la etapa y su reparto entre canales; su tamaño se reduce conforme cae el volumen (escala logarítmica, no proporcional). Pasa el cursor sobre un segmento para ver el detalle.</p>
      </div>
      <div class="legend" id="legFunnel"></div>
    </div>
    <div id="funnel"></div>
  </section>

  <section class="panel" aria-labelledby="h-origen">
    <div class="phead">
      <div>
        <h2 id="h-origen">De qué campañas llegan los leads de Monterrey</h2>
        <p class="hint" id="origenHint"></p>
      </div>
    </div>
    <div class="tscroll"><table id="tOrigen"></table></div>
    <p class="caveat">Campañas Monterrey agrupa todo lo etiquetado con <code>region=monterrey</code> (cuenta MX_MÉXICO): incluye las dos campañas locales del periodo, la original y Monterrey_OPEN. Comparten los mismos UTM, solo cambió la segmentación, así que no se pueden separar con estos datos.</p>
  </section>

  <section class="panel" aria-labelledby="h-local">
    <div class="phead">
      <div>
        <h2 id="h-local">Campaña Monterrey: antes vs OPEN</h2>
        <p class="hint">Campaña local de Meta (<code>region=monterrey</code>). La segmentación OPEN inició el 10 de agosto. Esta sección no cambia con los filtros.</p>
      </div>
    </div>
    <div class="tscroll"><table id="tLocal"></table></div>
    <p class="caveat" id="localNote"></p>
  </section>

  <section class="panel" aria-labelledby="h-wk">
    <div class="phead">
      <div>
        <h2 id="h-wk">Comportamiento semanal: segmentada vs OPEN</h2>
        <p class="hint">Campaña local de Meta, semana por semana (lunes a domingo). La línea cambia de color el 10 de agosto, cuando inició OPEN; la línea punteada es el promedio de cada periodo.</p>
      </div>
      <div class="legend"><span><i class="dot" style="background:var(--seg-a)"></i>Segmentada</span><span><i class="dot" style="background:var(--seg-b)"></i>OPEN</span></div>
    </div>
    <div class="seg" role="group" aria-label="Métrica" id="fWk" style="margin-bottom:12px">
      <button type="button" id="wk-agenda" data-v="agenda">Costo por agenda</button>
      <button type="button" id="wk-cpl" data-v="cpl">CPL</button>
      <button type="button" id="wk-share" data-v="share">% leads de Monterrey</button>
      <button type="button" id="wk-leads" data-v="leads">Leads de Monterrey</button>
    </div>
    <div id="cWk"></div>
    <p class="caveat" id="wkNote"></p>
  </section>

  <section class="panel" aria-labelledby="h-reg">
    <div class="phead">
      <div><h2 id="h-reg">Registros por mes</h2><p class="hint">Apilados por canal. El tooltip muestra cuántos pasaron a lead.</p></div>
      <div class="legend" id="legReg"></div>
    </div>
    <div id="cReg"></div>
  </section>

  <section class="panel" aria-labelledby="h-leads">
    <div class="phead">
      <div><h2 id="h-leads">Leads por mes</h2><p class="hint">Apilados por canal. El tooltip muestra el CPL y cuántos agendaron.</p></div>
      <div class="legend" id="legLeads"></div>
    </div>
    <div id="cLeads"></div>
  </section>

  <section class="panel" aria-labelledby="h-cag">
    <div class="phead">
      <div><h2 id="h-cag">Costo por agenda</h2><p class="hint">Inversión asignada ÷ agendamientos, en MXN.</p></div>
      <div class="legend" id="legCag"></div>
    </div>
    <div id="cCag"></div>
  </section>

  <section class="panel" aria-labelledby="h-cpvr">
    <div class="phead">
      <div><h2 id="h-cpvr">Costo por primera visita</h2><p class="hint">Inversión asignada ÷ PVRs, en MXN.</p></div>
      <div class="legend" id="legCpvr"></div>
    </div>
    <div id="cCpvr"></div>
  </section>

  <section class="panel" aria-labelledby="h-canal">
    <div class="phead">
      <div>
        <h2 id="h-canal">Meta vs Google</h2>
        <p class="hint" id="canalHint"></p>
      </div>
    </div>
    <div class="tscroll"><table id="tCanal"></table></div>
  </section>

  <section class="panel" aria-labelledby="h-mes">
    <div class="phead">
      <div><h2 id="h-mes">Detalle mensual</h2><p class="hint" id="mesHint"></p></div>
    </div>
    <div class="tscroll"><table id="tMes"></table></div>
  </section>

  <section class="panel notes" aria-label="Cómo se calcula">
    <div><h3>Fuente</h3><p>BigQuery, proyecto <code>gtm-pvkx9p9-ndk3z</code>, dataset <code>looker_dashboard</code>. Registros de <code>registros_historico</code>. Leads, agendas y PVRs de <code>vw_Lead_Citas_PVR</code> (lead cruzado por email con citas <code>BIC</code> y primeras visitas <code>BIP</code>). Sucursal = Monterrey.</p></div>
    <div><h3>Canales</h3><p>Meta: facebook, instagram, socialmedia. Google: google_search, pmax, dgen, youtube, display. Web, orgánico y otros medios no entran en el funnel: <span id="otrosNote"></span>.</p></div>
    <div><h3>Inversión</h3><p>Inversión asignada de la vista <code>costo_por_lead</code>: el gasto de cada combinación de campaña, anuncio y región se reparte entre sus leads. Solo cuenta el gasto que generó leads de Monterrey.</p></div>
    <div><h3>Lectura por cohorte</h3><p>Agendas y PVRs se cuentan sobre los leads creados en cada mes. Los meses recientes, sobre todo septiembre, todavía están madurando y sus tasas subirán.</p></div>
    <div><h3>Pendiente</h3><p>Impresiones y clics no están en BigQuery: se conectan desde Meta Ads y Google Ads. Asistencias no tiene fuente propia: <code>BIP</code> solo trae primeras visitas realizadas, así que PVR es la etapa de asistencia.</p></div>
  </section>
</div>

<div class="tip" id="tip" hidden></div>`;
