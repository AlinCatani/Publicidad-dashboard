// Pintado del tablero, portado tal cual del artefacto «Funnel Ingenes Monterrey».
// Diferencia única: los datos llegan como argumento (consultados en el servidor),
// en vez de venir escritos en el código. Devuelve una función que limpia los eventos.
export function montar({ funnel, local, semanas, consultado }) {
  const OPEN_START = "2026-08-10";
  let DATA = null, DATA_O = null;
  const ORIGENES = [
    { k: "local", name: "Campañas Monterrey", sub: "región monterrey" },
    { k: "nacional", name: "Campañas nacionales", sub: "región nacional" },
    { k: "otras", name: "Campañas de otras regiones", sub: "otras ciudades, Texas, turismo" },
    { k: "sin_campana", name: "Sin campaña pagada", sub: "orgánico o sin UTM" }
  ];

  const MONTHS = [
    { key: "2026-05", short: "May", long: "mayo" },
    { key: "2026-06", short: "Jun", long: "junio" },
    { key: "2026-07", short: "Jul", long: "julio" },
    { key: "2026-08", short: "Ago", long: "agosto" },
    { key: "2026-09", short: "Sep", long: "septiembre" }
  ];
  const METRICS = ["registros", "leads", "agendas", "pvr", "inversion"];
  const CH = { meta: "Meta", google: "Google" };

  function buildData(rows) {
    const blank = () => { const o = {}; METRICS.forEach(m => o[m] = MONTHS.map(() => 0)); return o; };
    const d = {}, dO = {};
    ["meta", "google", "otros"].forEach(c => { d[c] = blank(); dO[c] = {}; ORIGENES.forEach(o => dO[c][o.k] = blank()); });
    rows.forEach(r => {
      const i = MONTHS.findIndex(mo => mo.key === r.mes);
      const c = d[r.canal] ? r.canal : "otros";
      const o = dO[c][r.origen] ? r.origen : "sin_campana";
      if (i < 0) return;
      METRICS.forEach(m => { const v = Number(r[m]) || 0; d[c][m][i] += v; dO[c][o][m][i] += v; });
    });
    DATA_O = dO;
    return d;
  }
  function aggO(chs, origen, idxs) {
    const o = {};
    METRICS.forEach(m => { o[m] = 0; chs.forEach(c => idxs.forEach(i => { o[m] += DATA_O[c][origen][m][i]; })); });
    return o;
  }

  /* ===== Formato ===== */
  const nf = new Intl.NumberFormat("es-MX");
  const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
  const compact = new Intl.NumberFormat("es-MX", { notation: "compact", maximumFractionDigits: 1 });
  const pct = v => isFinite(v) ? (v * 100).toLocaleString("es-MX", { maximumFractionDigits: 1 }) + "%" : "—";
  const money = v => isFinite(v) ? mxn.format(v) : "—";
  const div = (a, b) => b ? a / b : NaN;
  /* ===== Estado ===== */
  const state = { canal: "ambos", mes: "todo" };
  try { const s = JSON.parse(localStorage.getItem("funnel-mty") || "{}"); if (s.canal) state.canal = s.canal; if (s.mes) state.mes = s.mes; } catch (e) {}
  const save = () => { try { localStorage.setItem("funnel-mty", JSON.stringify(state)); } catch (e) {} };
  const channels = () => state.canal === "ambos" ? ["meta", "google"] : [state.canal];
  const monthIdx = () => state.mes === "todo" ? MONTHS.map((_, i) => i) : [Number(state.mes)];
  function agg(chs, idxs) {
    const o = {};
    METRICS.forEach(m => { o[m] = 0; chs.forEach(c => idxs.forEach(i => { o[m] += DATA[c][m][i]; })); });
    return o;
  }

  /* ===== Filtros ===== */
  const fMes = document.getElementById("fMes");
  fMes.innerHTML = `<button type="button" id="m-todo" data-v="todo">Todo</button>` +
    MONTHS.map((m, i) => `<button type="button" id="m-${i}" data-v="${i}">${m.short}</button>`).join("");
  function bindSeg(el, key) {
    el.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      state[key] = b.dataset.v; save(); render();
    });
  }
  bindSeg(document.getElementById("fCanal"), "canal");
  bindSeg(fMes, "mes");

  /* ===== KPIs ===== */
  function renderKpis() {
    const chs = channels(), idxs = monthIdx();
    const a = agg(chs, idxs);
    const single = idxs.length === 1 && idxs[0] > 0;
    const p = single ? agg(chs, [idxs[0] - 1]) : null;
    const items = [
      { k: "Inversión asignada", v: a.inversion, f: money, prev: p && p.inversion, neutral: true },
      { k: "Registros", v: a.registros, f: nf.format, prev: p && p.registros },
      { k: "Leads", v: a.leads, f: nf.format, prev: p && p.leads, sub: `${pct(div(a.leads, a.registros))} de registros` },
      { k: "CPL", v: div(a.inversion, a.leads), f: money, prev: p && div(p.inversion, p.leads), cost: true },
      { k: "Agendamientos", v: a.agendas, f: nf.format, prev: p && p.agendas, sub: `${pct(div(a.agendas, a.leads))} de leads` },
      { k: "Costo por agenda", v: div(a.inversion, a.agendas), f: money, prev: p && div(p.inversion, p.agendas), cost: true },
      { k: "PVRs", v: a.pvr, f: nf.format, prev: p && p.pvr, sub: `${pct(div(a.pvr, a.agendas))} de agendas` },
      { k: "Costo por PVR", v: div(a.inversion, a.pvr), f: money, prev: p && div(p.inversion, p.pvr), cost: true }
    ];
    const prevName = single ? MONTHS[idxs[0] - 1].short.toLowerCase() : "";
    document.getElementById("kpis").innerHTML = items.map(it => {
      let d = it.sub || "", cls = "";
      if (it.prev) {
        const ch = it.v / it.prev - 1, up = ch >= 0;
        d = `${up ? "▲" : "▼"} ${Math.abs(ch * 100).toFixed(1)}% vs ${prevName}`;
        if (!it.neutral) cls = (it.cost ? !up : up) ? "good" : "bad";
      }
      return `<div class="kpi"><span class="k">${it.k}</span><span class="v">${it.f(it.v)}</span><span class="d ${cls}">${d}</span></div>`;
    }).join("");
  }

  /* ===== Funnel ===== */
  const STAGES = [
    { m: "registros", name: "Registros", sub: "formularios", cost: ["Costo por registro", "registros"] },
    { m: "leads", name: "Leads", sub: "Meta y Google", conv: "de registros", cost: ["CPL", "leads"] },
    { m: "agendas", name: "Agendamientos", sub: "citas programadas", conv: "de leads", cost: ["Costo por agenda", "agendas"] },
    { m: "pvr", name: "PVRs", sub: "primeras visitas", conv: "de agendas", cost: ["Costo por PVR", "pvr"] }
  ];
  const legendHtml = chs => chs.map(c => `<span><i class="dot ${c}"></i>${CH[c]}</span>`).join("");
  const tipRows = rows => rows.map(r => `<div class="row"><span>${r[0]}</span><b>${r[1]}</b></div>`).join("");

  function renderFunnel() {
    const chs = channels(), idxs = monthIdx();
    const per = {}; chs.forEach(c => per[c] = agg([c], idxs));
    const a = agg(chs, idxs);
    const R = 46, SW = 14, C = 2 * Math.PI * R, GAP = 3;
    const ring = (inner, label) => `<svg class="donut" viewBox="0 0 120 120" role="img" aria-label="${label}">
        <g transform="rotate(-90 60 60)">${inner}</g></svg>`;
    let html = `<div class="fgroup-title">Atracción</div><div class="donuts">`;
    ["Impresiones", "Clics"].forEach(n => {
      html += `<div class="dcard pending">
        <div class="dname">${n}</div>
        <div class="dslot"><div class="dwrap" style="width:100%">${ring(`<circle cx="60" cy="60" r="${R}" fill="none" class="ring-pending" stroke-width="${SW}"/>`, `${n}: pendiente`)}
          <div class="dcenter"><span class="dval na">—</span></div></div></div>
        <div class="dline">Pendiente: conectar Meta Ads y Google Ads</div>
      </div>`;
    });
    html += `</div><div class="fgroup-title">Conversión</div><div class="donuts">`;
    let prevM = null;
    STAGES.forEach(st => {
      const total = a[st.m];
      let offset = 0, segs = `<circle cx="60" cy="60" r="${R}" fill="none" class="ring-track" stroke-width="${SW}"/>`;
      const parts = chs.map(c => ({ c, v: per[c][st.m] })).filter(p => p.v > 0);
      parts.forEach(p => {
        const frac = div(p.v, total) || 0;
        const gap = parts.length > 1 ? GAP : 0;
        const len = Math.max(0, frac * C - gap);
        const tip = `<div class="tt">${st.name} · ${CH[p.c]}</div>` + tipRows([
          ["Volumen", nf.format(p.v)],
          chs.length > 1 ? ["% del total", pct(frac)] : null,
          prevM ? ["Conversión", pct(div(p.v, per[p.c][prevM]))] : null,
          [st.cost[0], money(div(per[p.c].inversion, p.v))]
        ].filter(Boolean));
        segs += `<circle cx="60" cy="60" r="${R}" fill="none" class="s-${p.c}" stroke-width="${SW}"
          stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-offset - gap / 2).toFixed(2)}"
          data-tip="${encodeURIComponent(tip)}"/>`;
        offset += frac * C;
      });
      const split = chs.length > 1 ? `<div class="dsplit">${chs.map(c => `<span><i class="dot ${c}"></i>${pct(div(per[c][st.m], total))}</span>`).join("")}</div>` : "";
      const conv = prevM ? `<div class="dconv">${pct(div(total, a[prevM]))} ${st.conv}</div>` : `<div class="dconv muted">Inicio del funnel</div>`;
      /* Tamaño del anillo en escala logarítmica respecto a registros: muestra la caída sin que las etapas finales desaparezcan. */
      const sc = Math.min(1, Math.max(0.42, 1 + 0.35 * Math.log10(div(total, a.registros) || 0.001)));
      html += `<div class="dcard">
        <div class="dname">${st.name}<small>${st.sub}</small></div>
        <div class="dslot"><div class="dwrap" style="width:${(sc * 100).toFixed(1)}%">${ring(segs, `${st.name}: ${nf.format(total)}`)}
          <div class="dcenter"><span class="dval" style="font-size:${(12 + 7 * sc).toFixed(1)}px">${nf.format(total)}</span></div></div></div>
        ${split}${conv}
        <div class="dline">${st.cost[0]} ${money(div(a.inversion, total))}</div>
      </div>`;
      prevM = st.m;
    });
    html += `</div>`;
    html += `<div class="overall"><span>Registro → PVR <b>${pct(div(a.pvr, a.registros))}</b></span><span>Lead → PVR <b>${pct(div(a.pvr, a.leads))}</b></span><span>Inversión asignada <b>${money(a.inversion)}</b></span></div>`;
    document.getElementById("funnel").innerHTML = html;
    document.getElementById("legFunnel").innerHTML = legendHtml(chs);
  }

  /* ===== Meta vs Google ===== */
  function renderCanal() {
    const idxs = monthIdx();
    const m = agg(["meta"], idxs), g = agg(["google"], idxs), t = agg(["meta", "google"], idxs);
    const rows = [
      ["Inversión asignada", x => x.inversion, money],
      ["Registros", x => x.registros, nf.format],
      ["Leads", x => x.leads, nf.format],
      ["Registro → lead", x => div(x.leads, x.registros), pct, "high"],
      ["CPL", x => div(x.inversion, x.leads), money, "low"],
      ["Agendamientos", x => x.agendas, nf.format],
      ["Lead → agenda", x => div(x.agendas, x.leads), pct, "high"],
      ["Costo por agenda", x => div(x.inversion, x.agendas), money, "low"],
      ["PVRs", x => x.pvr, nf.format],
      ["Agenda → PVR", x => div(x.pvr, x.agendas), pct, "high"],
      ["Costo por PVR", x => div(x.inversion, x.pvr), money, "low"]
    ];
    const body = rows.map(([label, fn, f, better]) => {
      const vm = fn(m), vg = fn(g);
      let bm = "", bg = "";
      if (better === "low") { bm = vm < vg ? "better" : ""; bg = vg < vm ? "better" : ""; }
      if (better === "high") { bm = vm > vg ? "better" : ""; bg = vg > vm ? "better" : ""; }
      return `<tr${better ? ' class="rate"' : ""}><td>${label}</td><td class="${bm}">${f(vm)}</td><td class="${bg}">${f(vg)}</td><td>${f(fn(t))}</td></tr>`;
    }).join("");
    document.getElementById("tCanal").innerHTML =
      `<thead><tr><th>Métrica</th><th><span class="dot meta"></span>Meta</th><th><span class="dot google"></span>Google</th><th>Total</th></tr></thead><tbody>${body}</tbody>`;
    const per = state.mes === "todo" ? "mayo a septiembre" : MONTHS[Number(state.mes)].long;
    document.getElementById("canalHint").textContent = `Periodo: ${per}. Siempre muestra ambos canales; ● marca el mejor en tasas y costos.`;
  }

  /* ===== Origen de los leads ===== */
  function renderOrigen() {
    const chs = channels(), idxs = monthIdx();
    const tot = agg(chs, idxs);
    const rows = ORIGENES.map(o => ({ o, a: aggO(chs, o.k, idxs) })).filter(r => r.a.leads || r.a.registros).sort((x, y) => y.a.leads - x.a.leads);
    const body = rows.map(({ o, a }) => {
      const share = div(a.leads, tot.leads);
      const paid = o.k !== "sin_campana";
      return `<tr${o.k === "nacional" ? ' class="hl"' : ""}>
        <td><span class="oname">${o.name}<small>${o.sub}</small></span></td>
        <td>${nf.format(a.leads)}</td>
        <td><span class="share">${pct(share)}<span class="bar"><i style="width:${(share * 100 || 0).toFixed(1)}%"></i></span></span></td>
        <td>${nf.format(a.agendas)}</td>
        <td>${nf.format(a.pvr)}</td>
        <td>${pct(div(a.pvr, a.leads))}</td>
        <td>${paid ? money(a.inversion) : "—"}</td>
        <td>${paid ? money(div(a.inversion, a.leads)) : "—"}</td>
        <td>${paid ? money(div(a.inversion, a.pvr)) : "—"}</td>
      </tr>`;
    }).join("");
    document.getElementById("tOrigen").innerHTML =
      `<thead><tr><th>Origen</th><th>Leads</th><th>% de leads</th><th>Agendas</th><th>PVRs</th><th>Lead → PVR</th><th>Inversión</th><th>CPL</th><th>Costo/PVR</th></tr></thead>
       <tbody>${body}<tr class="total"><td>Total</td><td>${nf.format(tot.leads)}</td><td>100%</td><td>${nf.format(tot.agendas)}</td><td>${nf.format(tot.pvr)}</td><td>${pct(div(tot.pvr, tot.leads))}</td><td>${money(tot.inversion)}</td><td>${money(div(tot.inversion, tot.leads))}</td><td>${money(div(tot.inversion, tot.pvr))}</td></tr></tbody>`;
    const per = state.mes === "todo" ? "mayo a septiembre" : MONTHS[Number(state.mes)].long;
    const canal = state.canal === "ambos" ? "Meta + Google" : CH[state.canal];
    const nac = aggO(chs, "nacional", idxs);
    document.getElementById("origenHint").textContent = `${canal}, ${per}. Las campañas nacionales aportan ${pct(div(nac.leads, tot.leads))} de los leads de Monterrey.`;
  }

  /* ===== Campaña Monterrey: antes vs OPEN ===== */
  const LOCAL_PERIODS = {
    antes: { label: "Antes", range: "1 may – 9 ago", days: 101 },
    open: { label: "OPEN", range: "10 ago – 30 sep", days: 52 }
  };
  /* Corte guardado (BigQuery, 5 oct 2026) */
  function renderLocal() {
    const A = LOCAL.antes, O = LOCAL.open, dA = LOCAL_PERIODS.antes.days, dO = LOCAL_PERIODS.open.days;
    /* dir: "up" = subir es bueno, "down" = bajar es bueno, null = neutral */
    const rows = [
      ["Inversión total de la campaña", x => x.inv_total, money, null],
      ["Inversión diaria promedio", (x, d) => x.inv_total / d, money, null, true],
      ["Leads de la campaña (todas las sucursales)", x => x.leads_all, nf.format, null],
      ["Leads que son de Monterrey", x => div(x.leads, x.leads_all), pct, "up", true],
      ["Registros de Monterrey", x => x.registros, nf.format, null],
      ["Leads de Monterrey", x => x.leads, nf.format, null],
      ["Leads de Monterrey por día", (x, d) => x.leads / d, v => v.toLocaleString("es-MX", { maximumFractionDigits: 1 }), "up", true],
      ["CPL (inversión asignada)", x => div(x.inv_asig, x.leads), money, "down"],
      ["Costo por lead de Monterrey (inversión total)", x => div(x.inv_total, x.leads), money, "down", true],
      ["Lead → agenda", x => div(x.agendas, x.leads), pct, "up"],
      ["Lead → PVR", x => div(x.pvr, x.leads), pct, "up"],
      ["PVRs", x => x.pvr, nf.format, null],
      ["Costo por PVR (inversión asignada)", x => div(x.inv_asig, x.pvr), money, "down"],
      ["Costo por PVR (inversión total)", x => div(x.inv_total, x.pvr), money, "down", true]
    ];
    const body = rows.map(([label, fn, f, dir, sub]) => {
      const va = fn(A, dA), vo = fn(O, dO);
      const ch = div(vo, va) - 1;
      let cls = "", txt = "—";
      if (isFinite(ch)) {
        txt = `${ch >= 0 ? "▲" : "▼"} ${Math.abs(ch * 100).toFixed(0)}%`;
        if (dir && Math.abs(ch) >= 0.005) cls = ((dir === "up") === (ch >= 0)) ? "good" : "bad";
      }
      return `<tr${sub ? ' class="sub"' : ""}><td>${label}</td><td>${f(va)}</td><td>${f(vo)}</td><td class="chg ${cls}">${txt}</td></tr>`;
    }).join("");
    document.getElementById("tLocal").innerHTML =
      `<thead><tr><th>Métrica</th><th>Antes<small>${LOCAL_PERIODS.antes.range} · ${dA} días</small></th><th>OPEN<small>${LOCAL_PERIODS.open.range} · ${dO} días</small></th><th>Cambio</th></tr></thead><tbody>${body}</tbody>`;
    const shA = pct(div(A.leads, A.leads_all)), shO = pct(div(O.leads, O.leads_all));
    document.getElementById("localNote").textContent =
      `Con OPEN, solo ${shO} de los leads de la campaña son de Monterrey (antes ${shA}); el resto se va a otras sucursales. Por eso el costo con inversión total sube mucho más que el CPL asignado. ` +
      `Los totales no son comparables directo porque los periodos duran distinto; usa las filas por día y las tasas. Los leads de OPEN tienen menos de 8 semanas, así que su conversión a agenda y PVR todavía puede subir.`;
  }

  /* ===== Comportamiento semanal: segmentada vs OPEN ===== */
  const WK_METRICS = {
    agenda: { title: "Costo por agenda", fmt: money, axis: v => "$" + compact.format(v),
      val: w => w.inv_asig > 0 && w.agendas > 0 ? w.inv_asig / w.agendas : NaN,
      avg: ws => { const i = ws.filter(w => w.inv_asig > 0); return div(i.reduce((s, w) => s + w.inv_asig, 0), i.reduce((s, w) => s + w.agendas, 0)); },
      note: "Costo por agenda = inversión asignada ÷ agendamientos de leads creados esa semana. Con pocas agendas por semana la línea brinca mucho; guíate por los promedios." },
    cpl: { title: "CPL", fmt: money, axis: v => "$" + compact.format(v),
      val: w => w.inv_asig > 0 && w.leads > 0 ? w.inv_asig / w.leads : NaN,
      avg: ws => { const i = ws.filter(w => w.inv_asig > 0); return div(i.reduce((s, w) => s + w.inv_asig, 0), i.reduce((s, w) => s + w.leads, 0)); },
      note: "CPL = inversión asignada ÷ leads de Monterrey de esa semana." },
    share: { title: "% de leads de la campaña que son de Monterrey", fmt: pct, axis: v => Math.round(v * 100) + "%",
      val: w => w.leads_all > 0 ? w.leads / w.leads_all : NaN,
      avg: ws => div(ws.reduce((s, w) => s + w.leads, 0), ws.reduce((s, w) => s + w.leads_all, 0)),
      note: "Del total de leads que genera la campaña local en todas las sucursales, qué parte eligió Monterrey." },
    leads: { title: "Leads de Monterrey", fmt: v => nf.format(Math.round(v)), axis: v => nf.format(v),
      val: w => w.leads, avg: ws => div(ws.reduce((s, w) => s + w.leads, 0), ws.length),
      note: "Leads de Monterrey generados por la campaña local cada semana. La primera semana solo tiene 3 días (1 al 3 de mayo)." }
  };
  state.wk = state.wk || "agenda";
  try { const s = JSON.parse(localStorage.getItem("funnel-mty") || "{}"); if (s.wk && WK_METRICS[s.wk]) state.wk = s.wk; } catch (e) {}
  document.getElementById("fWk").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    state.wk = b.dataset.v; save(); renderWeekly();
  });
  const shortDate = iso => { const d = new Date(iso + "T12:00:00"); return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" }).replace(".", ""); };

  function renderWeekly() {
    document.querySelectorAll("#fWk button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === state.wk)));
    const cfg = WK_METRICS[state.wk];
    const host = document.getElementById("cWk");
    setDims(host); H = W < 520 ? 240 : 270; ih = H - M.t - M.b;
    const ws = WEEKS.filter(w => w.semana < "2026-09-28");
    const openIdx = ws.findIndex(w => w.semana >= OPEN_START);
    const vals = ws.map(cfg.val);
    const before = ws.slice(0, openIdx), after = ws.slice(openIdx);
    const avgA = cfg.avg(before), avgB = cfg.avg(after);
    const yMax = niceMax(Math.max(...vals.filter(isFinite), avgA || 0, avgB || 0) * 1.12);
    const step = iw / ws.length;
    const x = i => M.l + step * i + step / 2;
    const y = v => M.t + ih - v / yMax * ih;
    let s = axes(yMax, cfg.axis);
    /* zona OPEN + marcador del cambio */
    const xs = M.l + step * openIdx;
    s += `<rect x="${xs}" y="${M.t}" width="${W - M.r - xs}" height="${ih}" class="open-zone"/>`;
    s += `<line x1="${xs}" x2="${xs}" y1="${M.t - 6}" y2="${M.t + ih}" class="open-mark"/>`;
    s += `<text x="${xs + 6}" y="${M.t + 6}" class="lbl">Inicia OPEN · 10 ago</text>`;
    /* etiquetas del eje x */
    const every = W < 520 ? 4 : W < 820 ? 3 : 2;
    ws.forEach((w, i) => {
      if (i % every === 0 || i === openIdx) s += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${i === 0 ? "1 may" : shortDate(w.semana)}</text>`;
    });
    /* promedios por periodo */
    const avgLine = (v, i0, i1, cls) => isFinite(v) ? `<line x1="${x(i0) - step / 2}" x2="${x(i1) + step / 2}" y1="${y(v)}" y2="${y(v)}" class="avg ${cls}"/>` : "";
    s += avgLine(avgA, 0, openIdx - 1, "s-a") + avgLine(avgB, openIdx, ws.length - 1, "s-b");
    /* líneas: cortan donde no hay dato */
    const path = (i0, i1) => {
      let d = "", pen = false;
      for (let i = i0; i <= i1; i++) {
        if (!isFinite(vals[i])) { pen = false; continue; }
        d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(vals[i]).toFixed(1)}`; pen = true;
      }
      return d;
    };
    s += `<path d="${path(0, openIdx - 1)}" fill="none" class="s-a" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round" pointer-events="none"/>`;
    s += `<path d="${path(openIdx, ws.length - 1)}" fill="none" class="s-b" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round" pointer-events="none"/>`;
    /* puente punteado entre la última semana segmentada y la primera OPEN */
    if (isFinite(vals[openIdx - 1]) && isFinite(vals[openIdx]))
      s += `<line x1="${x(openIdx - 1)}" y1="${y(vals[openIdx - 1])}" x2="${x(openIdx)}" y2="${y(vals[openIdx])}" class="bridge-line"/>`;
    /* puntos + hover por semana */
    ws.forEach((w, i) => {
      const isOpen = i >= openIdx, v = vals[i];
      const end = new Date(w.semana + "T12:00:00"); end.setDate(end.getDate() + 6);
      const tip = `<div class="tt">Semana del ${i === 0 ? "1 may" : shortDate(w.semana)} · ${isOpen ? "OPEN" : "Segmentada"}</div>` + tipRows([
        [cfg.title, isFinite(v) ? cfg.fmt(v) : "Sin inversión registrada"],
        ["Leads de Monterrey", nf.format(w.leads)],
        ["Agendas", nf.format(w.agendas)],
        ["% leads de Monterrey", pct(div(w.leads, w.leads_all))],
        ["Inversión asignada", w.inv_asig > 0 ? money(w.inv_asig) : "—"]
      ]);
      s += `<g class="col" data-tip="${encodeURIComponent(tip)}">
        <rect class="hit" x="${M.l + step * i}" y="${M.t}" width="${step}" height="${ih}"/>
        <line class="guide" x1="${x(i)}" x2="${x(i)}" y1="${M.t}" y2="${M.t + ih}"/>
        ${isFinite(v) ? `<circle class="${isOpen ? "f-b" : "f-a"} mk" cx="${x(i)}" cy="${y(v)}" r="4.5"/>` : `<text x="${x(i)}" y="${M.t + ih - 6}" text-anchor="middle" class="gap-mark">sin dato</text>`}
      </g>`;
    });
    /* etiquetas de promedio a la derecha de cada tramo */
    if (isFinite(avgA)) s += `<text x="${x(openIdx - 1) + step / 2 - 4}" y="${y(avgA) - 6}" text-anchor="end" class="lbl">Prom. ${cfg.fmt(avgA)}</text>`;
    if (isFinite(avgB)) s += `<text x="${W - M.r - 2}" y="${y(avgB) - 6}" text-anchor="end" class="lbl">Prom. ${cfg.fmt(avgB)}</text>`;
    host.innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${cfg.title} semanal, segmentada contra OPEN">${s}</svg>`;
    const ch = div(avgB, avgA) - 1;
    document.getElementById("wkNote").textContent = `${cfg.note} Promedio segmentada: ${isFinite(avgA) ? cfg.fmt(avgA) : "—"}; promedio OPEN: ${isFinite(avgB) ? cfg.fmt(avgB) : "—"}${isFinite(ch) ? ` (${ch >= 0 ? "+" : "−"}${Math.abs(ch * 100).toFixed(0)}%)` : ""}. Las semanas del 1 y 8 de junio no tienen inversión registrada en BigQuery.`;
  }

  /* ===== Gráficas ===== */
  function niceMax(v) {
    if (!v) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }
  function topRoundedRect(x, y, w, h, r) {
    r = Math.min(r, h, w / 2);
    return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
  }
  /* Las gráficas se dibujan al ancho real de su contenedor (1 unidad = 1 px) para que el texto no se escale. */
  let W = 560, H = 240, iw = 0, ih = 0;
  const M = { l: 56, r: 20, t: 22, b: 28 };
  function setDims(el) {
    W = Math.max(300, Math.round(el.clientWidth || 560));
    H = W < 520 ? 220 : 240;
    iw = W - M.l - M.r; ih = H - M.t - M.b;
  }
  function axes(yMax, fmt) {
    let s = "";
    for (let i = 0; i <= 4; i++) {
      const v = yMax * i / 4, y = M.t + ih - ih * i / 4;
      s += `<line class="${i === 0 ? "base" : "gridl"}" x1="${M.l}" x2="${W - M.r}" y1="${y}" y2="${y}"/>`;
      s += `<text x="${M.l - 8}" y="${y + 4}" text-anchor="end">${fmt(v)}</text>`;
    }
    return s;
  }

  const STACKS = {
    registros: {
      el: "cReg", leg: "legReg", title: "Registros",
      tip: (chs, i, total) => tipRows(
        chs.map(c => [`<i class="dot ${c}"></i>${CH[c]}`, `${nf.format(DATA[c].registros[i])} → ${nf.format(DATA[c].leads[i])} leads`])
          .concat([["Pasaron a lead", pct(div(chs.reduce((s, c) => s + DATA[c].leads[i], 0), total))]]))
    },
    leads: {
      el: "cLeads", leg: "legLeads", title: "Leads",
      tip: (chs, i, total) => {
        const inv = chs.reduce((s, c) => s + DATA[c].inversion[i], 0), ag = chs.reduce((s, c) => s + DATA[c].agendas[i], 0);
        return tipRows(
          chs.map(c => [`<i class="dot ${c}"></i>${CH[c]}`, `${nf.format(DATA[c].leads[i])} · CPL ${money(div(DATA[c].inversion[i], DATA[c].leads[i]))}`])
            .concat([["CPL total", money(div(inv, total))], ["Agendaron", `${nf.format(ag)} (${pct(div(ag, total))})`]]));
      }
    }
  };
  function renderStack(metric) {
    const cfg = STACKS[metric];
    const host = document.getElementById(cfg.el);
    setDims(host);
    const chs = channels(), sel = state.mes === "todo" ? null : Number(state.mes);
    const totals = MONTHS.map((_, i) => chs.reduce((s, c) => s + DATA[c][metric][i], 0));
    const yMax = niceMax(Math.max(...totals, 1) * 1.1);
    const band = iw / MONTHS.length, bw = Math.min(56, band * 0.5);
    const y = v => M.t + ih - v / yMax * ih;
    let s = axes(yMax, v => nf.format(v));
    MONTHS.forEach((mo, i) => {
      const cx = M.l + band * i + band / 2, x = cx - bw / 2;
      let base = 0, bars = "";
      chs.forEach((c, j) => {
        const v = DATA[c][metric][i];
        const y0 = y(base), y1 = y(base + v);
        const h = Math.max(0, y0 - y1 - (j > 0 ? 2 : 0));
        bars += j === chs.length - 1
          ? `<path class="f-${c}" d="${topRoundedRect(x, y1, bw, h, 4)}"/>`
          : `<rect class="f-${c}" x="${x}" y="${y1}" width="${bw}" height="${h}"/>`;
        base += v;
      });
      const tip = `<div class="tt">${cfg.title} · ${mo.long}</div>` + cfg.tip(chs, i, totals[i]);
      s += `<g class="col${sel !== null && sel !== i ? " dim" : ""}" data-tip="${encodeURIComponent(tip)}">
        <rect class="hit" x="${M.l + band * i}" y="${M.t}" width="${band}" height="${ih}"/>
        ${bars}
        <text class="lbl" x="${cx}" y="${y(totals[i]) - 6}" text-anchor="middle">${nf.format(totals[i])}</text>
        <text x="${cx}" y="${H - 8}" text-anchor="middle">${mo.short}</text>
      </g>`;
    });
    host.innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${cfg.title} por mes por canal">${s}</svg>`;
    document.getElementById(cfg.leg).innerHTML = legendHtml(chs);
  }

  const COSTS = {
    agendas: { el: "cCag", leg: "legCag", title: "Costo por agenda" },
    pvr: { el: "cCpvr", leg: "legCpvr", title: "Costo por PVR" }
  };
  function renderCost(metric) {
    const cfg = COSTS[metric];
    setDims(document.getElementById(cfg.el));
    const chs = channels(), sel = state.mes === "todo" ? null : Number(state.mes);
    const series = chs.map(c => ({ c, v: MONTHS.map((_, i) => div(DATA[c].inversion[i], DATA[c][metric][i])) }));
    const finite = series.flatMap(s => s.v).filter(isFinite);
    const yMax = niceMax(Math.max(...finite, 1) * 1.15);
    const band = iw / MONTHS.length;
    const x = i => M.l + band * i + band / 2;
    const y = v => M.t + ih - v / yMax * ih;
    let s = axes(yMax, v => v === 0 ? "$0" : "$" + compact.format(v));
    MONTHS.forEach((mo, i) => {
      const totInv = chs.reduce((s, c) => s + DATA[c].inversion[i], 0), totN = chs.reduce((s, c) => s + DATA[c][metric][i], 0);
      const tip = `<div class="tt">${cfg.title} · ${mo.long}</div>` + tipRows(series.map(se => [`<i class="dot ${se.c}"></i>${CH[se.c]}`, money(se.v[i])])
        .concat(chs.length > 1 ? [["Total", money(div(totInv, totN))]] : []));
      s += `<g class="col" data-tip="${encodeURIComponent(tip)}">
        <rect class="hit" x="${M.l + band * i}" y="${M.t}" width="${band}" height="${ih}"/>
        <line class="guide" x1="${x(i)}" x2="${x(i)}" y1="${M.t}" y2="${M.t + ih}"/>
        <text x="${x(i)}" y="${H - 8}" text-anchor="middle"${sel === i ? ' class="lbl"' : ""}>${mo.short}</text>
      </g>`;
    });
    const li = sel !== null ? sel : MONTHS.length - 1;
    series.forEach(se => {
      const pts = se.v.map((v, i) => isFinite(v) ? [x(i), y(v)] : null);
      const d = pts.map((p, i) => p ? `${i && pts[i - 1] ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}` : "").join("");
      s += `<path d="${d}" fill="none" class="s-${se.c}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" pointer-events="none"/>`;
      pts.forEach((p, i) => { if (p) s += `<circle class="f-${se.c} mk" cx="${p[0]}" cy="${p[1]}" r="${sel === i ? 6 : 4}" pointer-events="none"/>`; });
      if (isFinite(se.v[li])) {
        const above = se.v[li] >= Math.max(...series.map(o => o.v[li]).filter(isFinite));
        s += `<text class="lbl" x="${x(li)}" y="${y(se.v[li]) + (above ? -12 : 20)}" text-anchor="middle" pointer-events="none">${money(se.v[li])}</text>`;
      }
    });
    document.getElementById(cfg.el).innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${cfg.title} por mes por canal">${s}</svg>`;
    document.getElementById(cfg.leg).innerHTML = legendHtml(chs);
  }

  /* ===== Detalle mensual ===== */
  function renderMes() {
    const chs = channels();
    const cols = [
      ["Inversión", a => money(a.inversion)],
      ["Registros", a => nf.format(a.registros)],
      ["Leads", a => nf.format(a.leads)],
      ["Reg → lead", a => pct(div(a.leads, a.registros))],
      ["CPL", a => money(div(a.inversion, a.leads))],
      ["Agendas", a => nf.format(a.agendas)],
      ["Lead → agenda", a => pct(div(a.agendas, a.leads))],
      ["Costo/agenda", a => money(div(a.inversion, a.agendas))],
      ["PVRs", a => nf.format(a.pvr)],
      ["Agenda → PVR", a => pct(div(a.pvr, a.agendas))],
      ["Costo/PVR", a => money(div(a.inversion, a.pvr))]
    ];
    const sel = state.mes === "todo" ? null : Number(state.mes);
    const rows = MONTHS.map((mo, i) => {
      const a = agg(chs, [i]), cl = sel === i ? ' class="sel"' : "";
      return `<tr><td${cl}>${mo.long[0].toUpperCase() + mo.long.slice(1)}</td>${cols.map(c => `<td${cl}>${c[1](a)}</td>`).join("")}</tr>`;
    }).join("");
    const t = agg(chs, MONTHS.map((_, i) => i));
    document.getElementById("tMes").innerHTML =
      `<thead><tr><th>Mes</th>${cols.map(c => `<th>${c[0]}</th>`).join("")}</tr></thead>
       <tbody>${rows}<tr class="total"><td>Total</td>${cols.map(c => `<td>${c[1](t)}</td>`).join("")}</tr></tbody>`;
    document.getElementById("mesHint").textContent = (state.canal === "ambos" ? "Meta + Google combinados." : `Solo ${CH[state.canal]}.`) + " Septiembre sigue madurando.";
    const o = agg(["otros"], MONTHS.map((_, i) => i));
    document.getElementById("otrosNote").textContent = `${nf.format(o.registros)} registros y ${nf.format(o.pvr)} PVRs en el periodo`;
  }

  /* ===== Tooltip ===== */
  const tip = document.getElementById("tip");
  const onMove = e => {
    const el = e.target.closest && e.target.closest("[data-tip]");
    if (!el) { tip.hidden = true; return; }
    tip.innerHTML = decodeURIComponent(el.dataset.tip);
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    let left = e.clientX + 14, top = e.clientY + 14;
    if (left + r.width > window.innerWidth - 8) left = e.clientX - r.width - 14;
    if (top + r.height > window.innerHeight - 8) top = e.clientY - r.height - 14;
    tip.style.left = Math.max(8, left) + "px"; tip.style.top = Math.max(8, top) + "px";
  };
  const onLeave = () => { tip.hidden = true; };
  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerleave", onLeave);

  /* ===== Render ===== */
  function render() {
    document.querySelectorAll("#fCanal button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === state.canal)));
    document.querySelectorAll("#fMes button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === state.mes)));
    document.getElementById("periodLabel").textContent = state.mes === "todo" ? "1 may – 30 sep 2026" : `${MONTHS[Number(state.mes)].long} 2026`;
    renderKpis(); renderFunnel(); renderOrigen(); renderLocal(); renderCharts(); renderCanal(); renderMes();
  }
  function renderCharts() { renderWeekly(); renderStack("registros"); renderStack("leads"); renderCost("agendas"); renderCost("pvr"); }
  let resizeT = null, lastW = 0;
  const onResize = () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      const w = document.getElementById("cReg").clientWidth;
      if (w !== lastW) { lastW = w; renderCharts(); }
    }, 150);
  };
  window.addEventListener("resize", onResize);
  DATA = buildData(funnel);
  let LOCAL = local;
  let WEEKS = semanas;
  render();
  document.getElementById("statusMsg").textContent =
    `Datos de BigQuery consultados el ${new Date(consultado).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}.`;
  return () => {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerleave", onLeave);
    window.removeEventListener("resize", onResize);
    clearTimeout(resizeT);
  };
}
