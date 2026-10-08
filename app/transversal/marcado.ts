// Marcado del Reporte Transversal+Ole, portado de la v14 del artefacto (2026-10-06).
// Solo estructura y textos: ningún número ni consulta.
export const MARCADO = `<div class="wrap">
  <aside class="side">
    <button type="button" class="side-toggle" id="sideToggle" aria-expanded="true" aria-controls="tabsSuc" title="Plegar el menú de sucursales"><span aria-hidden="true">‹</span><span class="st-label">Plegar menú</span></button>
    <img class="logo" src="/ingenes-logo.webp" alt="Instituto Ingenes">
    <nav class="tabs" id="tabsSuc" aria-label="Sucursal"></nav>
  </aside>
  <div class="main">
  <header>
    <div class="brand">
      <div>
        <p class="eyebrow" id="eyebrow">Marketing · Fertilidad</p>
        <h1>Reporte transversal</h1>
        <p class="sub">Desde las impresiones hasta las primeras visitas</p>
      </div>
    </div>
    <div class="period-wrap">
      <button type="button" class="period" id="periodBtn" aria-haspopup="dialog" aria-expanded="false">—</button>
      <div class="popover" id="periodPop" role="dialog" aria-label="Elegir periodo" hidden>
        <label>Desde <input type="date" id="dDesde"></label>
        <label>Hasta <input type="date" id="dHasta"></label>
        <div class="pop-actions">
          <button type="button" class="btn ghost" id="pQuick1">Este mes</button>
          <button type="button" class="btn ghost" id="pQuick2">Últimos 3 meses</button>
          <button type="button" class="btn ghost" id="pQuick3">Desde marzo</button>
          <button type="button" class="btn" id="pApply">Aplicar</button>
        </div>
        <p class="caveat" style="margin-top:8px">Las fechas son de creación del lead. Los datos empiezan el 1 de marzo de 2026.</p>
      </div>
    </div>
  </header>

  <div class="status" role="status" aria-live="polite">
    <span class="pill snap" id="statusPill">Conectando</span>
    <span class="msg" id="statusMsg">Buscando el conector de BigQuery…</span>
    <button type="button" class="btn" id="btnRefresh" hidden>Actualizar</button>
  </div>

  <section class="panel sticky-filters" aria-label="Filtros">
    <div class="filters">
      <div class="fgroup">
        <span class="flabel" id="lbl-canal">Canal</span>
        <div class="seg" role="group" aria-labelledby="lbl-canal" id="fCanal">
          <button type="button" data-v="pagado">Meta + Google</button>
          <button type="button" data-v="meta" class="logo-btn" title="Solo Meta (Facebook e Instagram), con los demás filtros"><svg class="lg" viewBox="0 0 48 32" aria-hidden="true"><defs><linearGradient id="lgM" x1="0" x2="1"><stop offset="0" stop-color="#0064e0"/><stop offset="1" stop-color="#0082fb"/></linearGradient></defs><path fill="url(#lgM)" d="M12.3 4C6.4 4 1 11.3 1 19.5 1 25.3 3.9 28 7.8 28c2.9 0 5.3-1.6 8.1-6.3l3.2-5.6 3.4 5.9C25.5 27 28 28 31 28c5.1 0 9-3.7 9-9.5C40 10.4 34.7 4 29.7 4c-3.2 0-6 2-9.3 7.2L19 13.5l-1.3-2.2C14.9 6.6 13.6 4 12.3 4zm-.4 4.6c1 0 2.1 1.8 4.6 6.1L18 17l-2.8 4.9c-2 3.4-3.6 4.7-5.3 4.7-2.1 0-3.7-1.5-3.7-5.3 0-6.3 3.5-12.7 5.7-12.7zm18 0c2.4 0 5.9 5 5.9 11.1 0 3.1-1.5 4.6-3.7 4.6-1.9 0-3.3-1.3-5.6-5.2l-3-5.2 1.5-2.4c1.9-3.1 3.5-2.9 4.9-2.9z"/></svg>Meta</button>
          <button type="button" data-v="google" class="logo-btn" title="Solo Google (Search, PMax, YouTube), con los demás filtros"><svg class="lg" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.8-6.8C35.7 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 2.9-2.2 5.4-4.7 7.1l7.6 5.9c4.4-4.1 6.9-10.1 6.9-17.5z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C1 16.4 0 20.1 0 24s1 7.6 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>Google</button>
          <button type="button" data-v="todos">Todos los medios</button>
        </div>
      </div>
      <div class="fgroup">
        <span class="flabel" id="lbl-mes">Mes</span>
        <div class="seg" role="group" aria-labelledby="lbl-mes" id="fMes"></div>
      </div>
      <p class="caveat" id="filterNote" style="margin:0;flex:1 1 200px;text-align:right"></p>
    </div>
    <div class="selects" id="selects1"></div>
    <div class="selects" id="selects2"></div>
  </section>

  <section class="kpis" id="kpis" aria-label="Indicadores principales"></section>

  <section class="panel" aria-labelledby="h-diario">
    <div class="phead">
      <div><h2 id="h-diario">Evolución diaria</h2><p class="hint">Leads, citas agendadas y primeras visitas según la fecha de creación del lead, con los filtros, el canal y el mes elegidos.</p></div>
      <div class="seg" role="group" aria-label="Granularidad" id="fGran"><button type="button" data-v="dia">Por día</button><button type="button" data-v="semana">Por semana</button></div>
    </div>
    <div class="trio" id="cDiario"></div>
  </section>

  <section class="panel" aria-labelledby="h-perfil">
    <div class="phead">
      <div>
        <h2 id="h-perfil">Costo por resultado según el paciente</h2>
        <p class="hint" id="perfilHint">CPL, costo por cita agendada y costo por primera visita, abiertos por la característica que elijas. Los filtros de arriba aplican.</p>
      </div>
    </div>
    <div class="seg" role="group" aria-label="Característica" id="fPerfil" style="margin-bottom:12px"></div>
    <div class="tscroll"><table id="tPerfil"></table></div>
  </section>

  <section class="panel" aria-labelledby="h-funnel">
    <div class="phead">
      <div>
        <h2 id="h-funnel">Funnel por etapa</h2>
        <p class="hint">Cada anillo muestra el total de la etapa y su reparto entre canales; su tamaño baja con el volumen (escala logarítmica). Pasa el cursor sobre un segmento para ver el detalle.</p>
      </div>
      <div class="legend" id="legFunnel"></div>
    </div>
    <div id="funnel"></div>
  </section>

  <section class="panel" aria-labelledby="h-origen">
    <div class="phead">
      <div>
        <h2 id="h-origen">De qué campañas llegan los leads</h2>
        <p class="hint" id="origenHint"></p>
      </div>
    </div>
    <div class="tscroll"><table id="tOrigen"></table></div>
    <p class="caveat" id="origenNote"></p>
  </section>

  <section class="panel" aria-labelledby="h-local" id="secLocal" hidden>
    <div class="phead">
      <div>
        <h2 id="h-local">Campaña local: ADV vs OPEN</h2>
        <p class="hint" id="localHint">Campaña pagada de Meta con la región de la sucursal. La segmentación OPEN inició el 10 de agosto de 2026.</p>
      </div>
    </div>
    <div class="tscroll"><table id="tLocal"></table></div>
    <p class="caveat" id="localNote"></p>
  </section>

  <section class="panel" aria-labelledby="h-wk" id="secWk" hidden>
    <div class="phead">
      <div>
        <h2 id="h-wk">Comportamiento semanal de la campaña local</h2>
        <p class="hint" id="wkHint">Semana por semana (lunes a domingo). La línea punteada es el promedio del periodo.</p>
      </div>
      <div class="legend" id="legWk"></div>
    </div>
    <div class="seg" role="group" aria-label="Métrica" id="fWk" style="margin-bottom:12px">
      <button type="button" data-v="cita">Costo por cita agendada</button>
      <button type="button" data-v="cpl">CPL</button>
      <button type="button" data-v="share">% leads de la sucursal</button>
      <button type="button" data-v="leads">Leads de la sucursal</button>
      <button type="button" data-v="pvr">Primeras visitas</button>
    </div>
    <div id="cWk"></div>
    <p class="caveat" id="wkNote"></p>
  </section>

  <section class="panel" aria-labelledby="h-reg">
    <div class="phead">
      <div><h2 id="h-reg">Registros por mes</h2><p class="hint">Formularios apilados por canal. El tooltip muestra cuántos pasaron a lead.</p></div>
      <div class="legend" id="legReg"></div>
    </div>
    <div id="cReg"></div>
    <p class="caveat" id="regNote"></p>
  </section>

  <section class="panel" aria-labelledby="h-cag">
    <div class="phead">
      <div><h2 id="h-cag">Costo por cita agendada</h2><p class="hint">Inversión asignada ÷ citas agendadas, por mes y canal, en MXN.</p></div>
      <div class="legend" id="legCag"></div>
    </div>
    <div id="cCag"></div>
  </section>

  <section class="panel" aria-labelledby="h-cpvr">
    <div class="phead">
      <div><h2 id="h-cpvr">Costo por primera visita</h2><p class="hint">Inversión asignada ÷ PVRs, por mes y canal, en MXN.</p></div>
      <div class="legend" id="legCpvr"></div>
    </div>
    <div id="cCpvr"></div>
  </section>

  <section class="panel" aria-labelledby="h-canal">
    <div class="phead">
      <div><h2 id="h-canal">Meta vs Google</h2><p class="hint" id="canalHint"></p></div>
    </div>
    <div class="tscroll"><table id="tCanal"></table></div>
  </section>

  <section class="panel" aria-labelledby="h-desg">
    <div class="phead">
      <div>
        <h2 id="h-desg">Desglose por campaña</h2>
        <p class="hint" id="desgHint">Elige por qué dimensión abrir los resultados. Los filtros de arriba aplican.</p>
      </div>
    </div>
    <div class="seg" role="group" aria-label="Dimensión" id="fDim" style="margin-bottom:12px"></div>
    <div class="tscroll"><table id="tDesg"></table></div>
  </section>

  <section class="panel" aria-labelledby="h-mes">
    <div class="phead">
      <div><h2 id="h-mes">Por mes</h2><p class="hint">Leads por mes apilados por canal; la tabla trae costos y conversiones de cada cohorte.</p></div>
      <div class="legend" id="legMes"></div>
    </div>
    <div id="cMes"></div>
    <div class="tscroll" style="margin-top:14px"><table id="tMes"></table></div>
  </section>

  <section class="panel notes" aria-label="Cómo se calculó" id="notes">
    <div><h3>Fuente</h3><p>BigQuery, proyecto <code>gtm-pvkx9p9-ndk3z</code>, vista <code>looker_dashboard.claude_reporte_transversal</code>: una fila por lead, <b>sin nombre, correo ni teléfono</b>. Se consulta en vivo con los filtros elegidos; no hay cortes guardados en esta página.</p></div>
    <div><h3>Qué hay detrás de la vista</h3><p>Leads de <code>leads_historico</code> (Airtable). Citas agendadas de <code>BIC</code> y primeras visitas de <code>BIP</code> (clínica), cruzadas con el lead por correo normalizado, dentro de BigQuery; una cita y una visita por correo, la más reciente. Inversión de <code>inversion_diaria</code>: el gasto de cada día y combinación de campaña, medio, landing, anuncio, mensaje y región se reparte entre los leads de esa misma combinación (inversión asignada). USD × 18.</p></div>
    <div><h3>Sucursal real</h3><p id="noteSucursal">La sucursal es la de la visita cuando la hubo (<code>BIP.nom_suc</code>); si no, la que eligió el lead al registrarse. La cita no aporta sucursal.</p></div>
    <div><h3>TAL%</h3><p>Tasa de asistencia de leads: primeras visitas ÷ leads del periodo. Es la conversión completa de lead a PVR.</p></div>
    <div><h3>Cohorte</h3><p>El periodo filtra por fecha de <b>creación</b> del lead; sus citas agendadas y visitas se cuentan aunque ocurran después. Los últimos meses siguen madurando y sus tasas subirán.</p></div>
    <div><h3>Paciente</h3><p><b>LeadING</b> (Lead Ingenes) = edad mayor de 30 y sin hijos (misma regla que <code>costo_por_lead</code>). <b>Grupo de edad</b> = quinquenios sobre la edad declarada (25–29, 30–34…). Perfil (Azul/Verde), tipo de paciente (LS/LP), score y user persona vienen tal cual del formulario.</p></div>
    <div><h3>Canales</h3><p>Meta: facebook, instagram, socialmedia. Google: google_search, pmax, dgen, google, youtube, display. «Todos los medios» agrega web, orgánico y lo que no trae medio.</p></div>
    <div><h3>Límites del dato</h3><p id="noteLimites">Enero y febrero de 2026 no tienen correo en los leads, así que no cruzan con cita ni visita: por eso el reporte empieza en marzo. El gasto llega hasta la última carga de <code>inversion_diaria</code>. Los leads con <code>posible_duplicado</code> se cuentan.</p></div>
    <div><h3>Registros</h3><p>De <code>registros_historico</code> (formularios enviados). No trae correo ni perfil Azul/Verde, así que no se cruza con citas agendadas y los filtros de perfil y LeadING no le aplican; la sucursal es la que eligió la persona.</p></div>
    <div><h3>Origen y campaña local</h3><p>Origen: «local» = campaña pagada cuya región coincide con la sucursal elegida; «nacional» = región nacional; «otras» = otras regiones; «sin campaña» = sin UTM de pago. La campaña local se mide en Meta; «% leads de la sucursal» = leads de la campaña local que son de esta sucursal ÷ todos los leads que genera esa campaña.</p></div>
    <div><h3>Pendiente</h3><p>Impresiones, alcance, clics, CTR y costo por clic: se cargarán a BigQuery por día y anuncio desde la API de Meta y Google (tabla <code>inversion_y_metricas_anuncio_diaria</code>). Hasta entonces, esas tarjetas y la tabla de atracción de Meta no se muestran.</p></div>
  </section>
  </div>
</div>

<nav class="flotante" id="flotante" aria-label="Atajos">
  <button type="button" class="fl-btn" id="irMenu" hidden title="Volver al inicio y al menú de sucursales">↑ Menú</button>
  <a class="fl-btn" id="irInicio" href="/" hidden title="Ir a la lista de reportes">⌂ Inicio</a>
  <a class="fl-btn fl-salir" id="irSalir" href="/salir" hidden title="Cerrar sesión">Salir</a>
</nav>
<div class="tip" id="tip" hidden></div>`;
