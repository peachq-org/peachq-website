(function () {
  const $ = selector => document.querySelector(selector);
  const data = window.PEACHQ_BENCHMARK;
  if (!data || !Array.isArray(data.solutions) || !data.solutions.length) {
    $("#benchEmpty").classList.remove("hidden");
    $("#benchBody").classList.add("hidden");
    return;
  }

  const queries = data.queries || [];
  const solutions = data.solutions;
  const target = data.target || data.baseline;
  const HEADLINE = ["peachq", "peachq (via DuckDB)"];
  const SERIES_CLASS = { "peachq": "peachq", "peachq (via DuckDB)": "peachq-duckdb" };
  const GAUGE_MAX = 200;
  // Wide enough for DuckDB (100) and Polars (Lazy) (~160) to read beside peachq (~25); l and Rayforce run off-scale.
  const BAR_MAX = 250;
  const threadCounts = [...new Set(solutions.flatMap(s => s.threads))].sort((a, b) => a - b);
  let threads = threadCounts.includes(1) ? 1 : threadCounts[0];

  function text(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const times = id => ((data.times || {})[id] || {})[String(threads)] || null;
  const speed = id => ((data.mph || {})[id] || {})[String(threads)] || null;
  const present = () => solutions.filter(s => times(s.id));
  const isPeachq = id => HEADLINE.includes(id);
  const seriesClass = id => SERIES_CLASS[id] ? ` ${SERIES_CLASS[id]}` : "";
  const label = id => (solutions.find(s => s.id === id) || { label: id }).label;
  const plural = (n, word) => `${n} ${word}${String(n) === "1" ? "" : "s"}`;
  const targetLabel = (name, version) => `${String(name || "").replace(/\s*\(.*\)$/, "")}${version ? ` ${version}` : ""} = 100 MPH`;
  const mph = v => v == null ? "-" : v < 10 ? v.toFixed(1) : Math.round(v).toLocaleString("en-US");
  const answeredOf = s => `${s.answered}/${s.total || queries.length} answered`;
  // Drawn at the rendered width so labels keep their pixel size on a phone instead of shrinking with a fixed viewBox.
  const widthOf = (svg, fallback) => Math.round(svg.getBoundingClientRect().width) || fallback;

  function renderRun() {
    const m = data.machine || {};
    const versions = solutions.filter(s => s.version).map(s => `${s.label} ${s.version}`).join(", ");
    $("#benchMachine").innerHTML = `${text(m.cpu)}, ${text(m.memGB)} GB, ${text(m.os)}. Versions: ${text(versions)}. `
      + "These numbers come from a development laptop and are not comparable with KX's published server results."
      + (data.verified === false ? ' <span class="bench-unverified">Preview, unverified.</span>' : "");
    document.querySelectorAll(".bench-target").forEach(el => { el.textContent = targetLabel(target, data.baselineVersion); });
  }

  function renderThreads() {
    $("#benchThreads").innerHTML = threadCounts.map(t =>
      `<button type="button" data-threads="${t}" aria-pressed="${t === threads}">${plural(t, "thread")}</button>`).join("");
  }

  function renderKpis() {
    const cards = HEADLINE.map(id => {
      const s = solutions.find(x => x.id === id);
      if (!s) return [id, "-", "not in this run"];
      if (!times(id)) return [s.label, "-", `not run at ${plural(threads, "thread")}`];
      const v = speed(id);
      if (!v) return [s.label, "-", "no MPH in this data"];
      return [s.label, `${mph(v.mph)} MPH`, `median ${mph(v.mphMedian)} MPH · ${answeredOf(v)}`];
    });
    cards.push(["solutions", `${present().length}`, `at ${plural(threads, "thread")}`]);
    cards.push(["queries", `${queries.length}`, `${data.size || ""} data, ${data.datadate || ""}`]);
    $("#benchKpis").innerHTML = cards.map(([name, value, denom], i) => `
      <div class="compat-kpi ${i === 0 ? "hero" : ""}">
        <span>${text(name)}</span>
        <strong>${text(value)}</strong>
        <em>${text(denom)}</em>
      </div>
    `).join("");
  }

  function legend(items) {
    return items.map(([id, value]) =>
      `<span><i class="bench-key${seriesClass(id)}"></i>${text(label(id))}${value ? ` <strong>${text(value)}</strong>` : ""}</span>`).join("");
  }

  function renderGauge() {
    const cx = 180, cy = 196, r = 150;
    const at = (v, radius) => {
      const a = Math.PI * (1 - Math.min(v, GAUGE_MAX) / GAUGE_MAX);
      return [cx + radius * Math.cos(a), cy - radius * Math.sin(a)];
    };
    const pt = (v, radius) => at(v, radius).map(n => n.toFixed(1)).join(" ");
    const ticks = [];
    for (let v = 0; v <= GAUGE_MAX; v += 25) {
      const major = v % 50 === 0;
      ticks.push(`<line x1="${at(v, r - (major ? 14 : 8))[0]}" y1="${at(v, r - (major ? 14 : 8))[1]}" x2="${at(v, r)[0]}" y2="${at(v, r)[1]}" class="bench-tick${major ? " major" : ""}"></line>`);
      if (major) {
        const [x, y] = at(v, r - 30);
        ticks.push(`<text x="${x}" y="${y + 4}" text-anchor="middle" class="compat-axis">${v}</text>`);
      }
    }
    const shown = HEADLINE.map(id => [id, speed(id)]).filter(([, v]) => v);
    const needles = shown.map(([id, v]) => {
      const off = v.mph > GAUGE_MAX;
      const [x, y] = at(v.mph, r - 44);
      return `<g><title>${text(label(id))}: ${mph(v.mph)} MPH, median ${mph(v.mphMedian)} MPH, ${answeredOf(v)}</title>
        <line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="bench-needle${seriesClass(id)}"></line>
        ${off ? `<path d="M ${at(GAUGE_MAX, r)[0] + 6} ${cy - 7} l 10 7 l -10 7 z" class="bench-off${seriesClass(id)}"></path>
        <text x="${at(GAUGE_MAX, r)[0] + 4}" y="${cy + 26}" text-anchor="end" class="bench-offtext">${mph(v.mph)} MPH</text>` : ""}</g>`;
    }).join("");
    const empty = shown.length ? "" : `<text x="${cx}" y="${cy - 54}" text-anchor="middle" class="compat-axis">PeachQ not run at ${plural(threads, "thread")}</text>`;
    $("#benchGauge").innerHTML = `
      <path d="M ${pt(0, r)} A ${r} ${r} 0 0 1 ${pt(GAUGE_MAX, r)}" class="bench-track"></path>
      <path d="M ${pt(100, r)} A ${r} ${r} 0 0 1 ${pt(GAUGE_MAX, r)}" class="bench-track faster"></path>
      ${ticks.join("")}
      <line x1="${at(100, r - 18)[0]}" y1="${at(100, r - 18)[1]}" x2="${at(100, r + 6)[0]}" y2="${at(100, r + 6)[1]}" class="bench-hundred"></line>
      <text x="${cx}" y="${cy - r - 14}" text-anchor="middle" class="bench-hundred-label">${text(targetLabel(target, data.baselineVersion))}</text>
      ${empty}${needles}
      <circle cx="${cx}" cy="${cy}" r="7" class="bench-hub"></circle>
      <text x="${cx}" y="${cy + 30}" text-anchor="middle" class="bench-unit">MPH</text>`;
    $("#benchGaugeLegend").innerHTML = legend(shown.map(([id, v]) => [id, `${mph(v.mph)} MPH`]));
  }

  function niceMax(v) {
    const step = [10, 20, 25, 50, 100, 250, 500, 1000].find(s => v / s <= 5) || Math.pow(10, Math.ceil(Math.log10(v / 5)));
    return [step, Math.max(step, Math.ceil(v / step) * step)];
  }

  function renderTrend() {
    const svg = $("#benchTrend");
    const W = widthOf(svg, 640), H = 300, narrow = W < 500;
    const pad = { l: 46, r: narrow ? 50 : 180, t: 34, b: 36 };
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const points = (data.history || []).filter(h => isPeachq(h.solution) && Number(h.threads) === threads
      && (!data.size || h.size === data.size)).sort((a, b) => String(a.date).localeCompare(String(b.date)));
    if (!points.length) {
      svg.innerHTML = `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" class="compat-axis">No PeachQ run recorded at ${plural(threads, "thread")}.</text>`;
      $("#benchTrendLegend").innerHTML = "";
      return;
    }
    const days = [...new Set(points.map(p => p.date))];
    const t0 = Date.parse(days[0]), span = Date.parse(days[days.length - 1]) - t0;
    const x = date => pad.l + (W - pad.l - pad.r) * (span ? (Date.parse(date) - t0) / span : 0.5);
    const [step, top] = niceMax(Math.max(...points.map(p => p.mph)) * 1.15);
    const y = v => pad.t + (H - pad.t - pad.b) * (1 - v / top);
    const grid = [];
    for (let v = 0; v <= top; v += step) {
      grid.push(`<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}" class="${v ? "compat-grid" : "bench-zero"}"></line>
        <text x="${pad.l - 8}" y="${y(v) + 4}" text-anchor="end" class="compat-axis">${v}</text>`);
    }
    grid.push(`<text x="${pad.l - 8}" y="${pad.t - 20}" text-anchor="end" class="compat-axis">MPH</text>`);
    const minGap = 70;
    let lastX = -Infinity;
    const dates = days.map(d => {
      if (x(d) - lastX < minGap && d !== days[days.length - 1]) return "";
      lastX = x(d);
      return `<text x="${x(d)}" y="${H - 12}" text-anchor="middle" class="compat-axis">${text(d)}</text>`;
    }).join("");

    // A series is one target and target version: a new DuckDB version is a break, never a joined line.
    const seriesOf = p => `${p.target}|${p.baselineVersion}|${p.size}`;
    const seriesStarts = points.filter((p, i) => i && seriesOf(p) !== seriesOf(points[i - 1]));
    const breaks = seriesStarts.map(p => `
      <line x1="${x(p.date)}" x2="${x(p.date)}" y1="${pad.t}" y2="${H - pad.b}" class="bench-break"></line>
      <text x="${x(p.date) + 4}" y="${pad.t + 10}" class="compat-axis">${text(targetLabel(p.target, p.baselineVersion))}</text>`).join("");

    const lines = [], dots = [], ends = [];
    HEADLINE.forEach(id => {
      const mine = points.filter(p => p.solution === id);
      if (!mine.length) return;
      const runs = [];
      mine.forEach((p, i) => { if (!i || seriesOf(p) !== seriesOf(mine[i - 1])) runs.push([]); runs[runs.length - 1].push(p); });
      runs.filter(run => run.length > 1).forEach(run => {
        lines.push(`<path d="${run.map((p, i) => `${i ? "L" : "M"} ${x(p.date).toFixed(1)} ${y(p.mph).toFixed(1)}`).join(" ")}" class="bench-line${seriesClass(id)}"></path>`);
      });
      mine.forEach(p => {
        const tip = `${p.date} · ${label(id)} ${p.version} · ${mph(p.mph)} MPH · median ${mph(p.mphMedian)} MPH · `
          + `${answeredOf(p)} · ${targetLabel(p.target, p.baselineVersion)}`;
        dots.push(`<g><circle cx="${x(p.date)}" cy="${y(p.mph)}" r="13" fill="transparent"><title>${text(tip)}</title></circle>
          <circle cx="${x(p.date)}" cy="${y(p.mph)}" r="5" class="bench-dot${seriesClass(id)}" pointer-events="none"></circle></g>`);
      });
      const last = mine[mine.length - 1];
      ends.push({ id, x: x(last.date), y: y(last.mph), v: last.mph });
    });
    ends.sort((a, b) => a.y - b.y);
    ends.forEach((e, i) => { if (i && e.y - ends[i - 1].y < 15) e.y = ends[i - 1].y + 15; });
    const labels = ends.map(e => `<text x="${e.x + 10}" y="${e.y + 4}" class="bench-endlabel${seriesClass(e.id)}">${narrow ? "" : `${text(label(e.id))} `}${mph(e.v)}</text>`).join("");
    svg.innerHTML = `${grid.join("")}${breaks}${lines.join("")}${dots.join("")}${labels}${dates}`;
    $("#benchTrendLegend").innerHTML = legend(HEADLINE.filter(id => ends.some(e => e.id === id)).map(id => [id, ""]));
  }

  function renderBars() {
    const rows = present().map(s => ({ s, v: speed(s.id) })).filter(row => row.v).sort((a, b) => b.v.mph - a.v.mph);
    const svg = $("#benchBars");
    const W = widthOf(svg, 900), rowH = 30, narrow = W < 600;
    const pad = { l: narrow ? 150 : 190, r: narrow ? 74 : 180, t: 28, b: 30 };
    const H = pad.t + pad.b + rowH * Math.max(rows.length, 1);
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    if (!rows.length) { svg.innerHTML = ""; return; }
    const x = v => pad.l + (W - pad.l - pad.r) * Math.min(v, BAR_MAX) / BAR_MAX;
    const grid = [];
    for (let v = 0; v <= BAR_MAX; v += narrow ? 125 : 50) {
      grid.push(`<line x1="${x(v)}" x2="${x(v)}" y1="${pad.t}" y2="${H - pad.b}" class="compat-grid"></line>
        <text x="${x(v)}" y="${H - 10}" text-anchor="middle" class="compat-axis">${v}</text>`);
    }
    const bars = rows.map(({ s, v }, i) => {
      const yy = pad.t + i * rowH, mid = yy + rowH / 2 + 4, off = v.mph > BAR_MAX;
      const end = x(v.mph);
      return `<g><title>${text(s.label)}: ${mph(v.mph)} MPH, median ${mph(v.mphMedian)} MPH, ${answeredOf(v)}</title>
        <text x="${pad.l - 10}" y="${mid}" text-anchor="end" class="bench-label${isPeachq(s.id) ? " peachq" : ""}">${text(s.label)}</text>
        <rect x="${pad.l}" y="${yy + 6}" width="${Math.max(end - pad.l, 2)}" height="${rowH - 12}" rx="3" class="bench-bar${seriesClass(s.id)}"></rect>
        ${off ? `<path d="M ${end + 3} ${yy + 6} l 9 ${(rowH - 12) / 2} l -9 ${(rowH - 12) / 2} z" class="bench-off"></path>` : ""}
        <text x="${end + (off ? 17 : 6)}" y="${mid}" class="compat-axis">${mph(v.mph)} MPH${off && !narrow ? " (off scale)" : ""}</text></g>`;
    }).join("");
    svg.innerHTML = `${grid.join("")}${bars}
      <line x1="${x(100)}" x2="${x(100)}" y1="${pad.t - 6}" y2="${H - pad.b}" class="bench-reference"></line>
      <text x="${x(100)}" y="${pad.t - 12}" text-anchor="middle" class="compat-axis">${text(targetLabel(target, data.baselineVersion))}</text>`;
  }

  const ms = t => t >= 10 ? t.toFixed(0) : t >= 0.01 ? t.toFixed(2) : t.toPrecision(2);

  // "peachq (via DuckDB)" -> peachq / (via DuckDB), "Rayforce Parted" -> Rayforce / Parted: narrower columns.
  function headerLabel(name) {
    const split = name.match(/^(.+?)\s+(\(.*\))$/) || name.match(/^(.+)\s+(\S+)$/);
    return split ? `${text(split[1])}<br><small>${text(split[2])}</small>` : text(name);
  }

  function renderTable() {
    const filter = $("#benchFilter").value.trim().toLowerCase();
    const cols = present();
    const table = $("#benchTable");
    table.tHead.innerHTML = `<tr><th>Query</th>${cols.map(s => `<th class="${isPeachq(s.id) ? "peachq" : ""}">${headerLabel(s.label)}</th>`).join("")}</tr>`;
    table.tBodies[0].innerHTML = queries.map((q, i) => ({ q, i }))
      .filter(({ q }) => !filter || `${q.idx} ${q.description} ${(q.tags || []).join(" ")}`.toLowerCase().includes(filter))
      .map(({ q, i }) => {
        const row = cols.map(s => times(s.id)[i]);
        const best = Math.min(...row.filter(t => t > 0));
        const cells = row.map(t => {
          if (t == null) return '<td class="bench-none">-</td>';
          const shade = t <= best * 1.3 ? " bench-fast" : t > best * 10 ? " bench-slow" : "";
          return `<td class="${t === best ? "bench-best" : ""}${shade}">${ms(t)}</td>`;
        }).join("");
        return `<tr><td><strong>${q.idx}. ${text(q.description)}</strong><small>${text((q.tags || []).join(", "))}</small></td>${cells}</tr>`;
      }).join("");
  }

  function render() {
    renderThreads();
    renderKpis();
    renderGauge();
    renderTrend();
    renderBars();
    renderTable();
  }

  renderRun();
  render();
  $("#benchFilter").addEventListener("input", renderTable);
  let resized;
  window.addEventListener("resize", () => {
    clearTimeout(resized);
    resized = setTimeout(() => { renderTrend(); renderBars(); }, 150);
  });
  $("#benchThreads").addEventListener("click", event => {
    const button = event.target.closest("[data-threads]");
    if (!button) return;
    threads = Number(button.dataset.threads);
    render();
  });
}());
