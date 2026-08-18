(function () {
  const data = window.__QDATA__;
  if (!data) return;

  const $ = selector => document.querySelector(selector);
  const pct = (a, b) => b ? (100 * a / b) : 0;
  const fmt = n => (Math.round(n * 10) / 10).toFixed(1);
  const labels = data.labels || {};
  const rows = data.rows || [];
  const trend = data.evalTrend || [];
  const total = data.tot || {};
  const tooltip = document.createElement("div");
  tooltip.className = "compat-tip";
  document.body.appendChild(tooltip);

  function text(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function color(ratio) {
    const r = Math.max(0, Math.min(1, ratio || 0));
    if (r <= 0) return "var(--bg)";
    const sat = 18 + r * 78;
    const light = 96 - r * 15;
    const alpha = 0.35 + r * 0.65;
    return `color-mix(in srgb, var(--bg) ${(1 - r) * 100}%, hsl(22 ${sat}% ${light}% / ${alpha}))`;
  }

  function sourceName(row) {
    if (row.file || row.path || row.id) return row.file || row.path || row.id;
    if (row.pl === "qcmd") return `test/q/${row.t}/${row.s}.qcmd`;
    if (row.pl === "qscript") return `test/qscript/${row.s}.q`;
    if (row.pl === "kwire") return `tools/kdb-conformance/${row.s}`;
    return `${row.t}/${row.s}`;
  }

  function renderKpis() {
    const score = pct(total.ep, total.et);
    const qmatrix = data.qmatrix || {};
    const pillars = data.pillars || {};
    const cards = [
      ["q behaviours", `${fmt(score)}%`, `${total.ep || 0}/${total.et || 0}`, "passing"],
      ["suites green", `${total.green || 0}`, `${total.onGate || total.suites || 0}`, "tracked"],
      ["live IPC", `${pillars.kwire ? pillars.kwire.pass : 0}`, `${pillars.kwire ? pillars.kwire.total : 0}`, "protocol"],
      ["shape cells", `${qmatrix.cellsOk || 0}`, `${qmatrix.cellsTotal || 0}`, "clean"]
    ];
    $("#compatKpis").innerHTML = cards.map(([label, value, denom, meta], i) => `
      <div class="compat-kpi ${i === 0 ? "hero" : ""}">
        <span>${text(label)}</span>
        <strong>${text(value)}</strong>
        <em>${text(denom)} ${text(meta)}</em>
      </div>
    `).join("");
    $("#compatUpdated").textContent = data.updated ? `updated ${data.updated}` : "";
  }

  function renderTrend() {
    const svg = $("#compatTrend");
    const points = trend.length ? trend : [{ evalPct: pct(total.ep, total.et), date: data.updated || "" }];
    const W = 900, H = 320, pad = { l: 44, r: 48, t: 22, b: 36 };
    const x = i => points.length > 1 ? pad.l + (W - pad.l - pad.r) * (i / (points.length - 1)) : W / 2;
    const y = v => pad.t + (H - pad.t - pad.b) * (1 - v / 100);
    const path = points.map((p, i) => `${i ? "L" : "M"} ${x(i).toFixed(1)} ${y(p.evalPct || 0).toFixed(1)}`).join(" ");
    const grid = [0, 25, 50, 75, 100].map(v => `
      <line x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}" class="compat-grid"></line>
      <text x="${W - pad.r + 8}" y="${y(v) + 4}" class="compat-axis">${v}%</text>
    `).join("");
    const step = Math.max(1, Math.ceil(points.length / 8));
    const labelsSvg = points.map((p, i) => (i % step === 0 || i === points.length - 1)
      ? `<text x="${x(i)}" y="${H - 12}" text-anchor="middle" class="compat-axis">${text(String(p.date || "").slice(5))}</text>`
      : "").join("");
    const hoverBands = points.map((p, i) => {
      const left = i === 0 ? pad.l : (x(i - 1) + x(i)) / 2;
      const right = i === points.length - 1 ? W - pad.r : (x(i) + x(i + 1)) / 2;
      const title = [p.date, `${fmt(p.evalPct || 0)}%`, p.subj].filter(Boolean).join(" - ");
      return `<rect x="${left}" y="${pad.t}" width="${right - left}" height="${H - pad.t - pad.b}" fill="transparent" pointer-events="all"><title>${text(title)}</title></rect>`;
    }).join("");
    const dots = points.map((p, i) => {
      const title = [p.date, `${fmt(p.evalPct || 0)}%`, p.subj].filter(Boolean).join(" - ");
      return `<g><circle cx="${x(i)}" cy="${y(p.evalPct || 0)}" r="13" fill="transparent"><title>${text(title)}</title></circle><circle cx="${x(i)}" cy="${y(p.evalPct || 0)}" r="${i === points.length - 1 ? 5 : 3}" class="compat-dot" pointer-events="none"></circle></g>`;
    }).join("");
    const last = points[points.length - 1] || {};
    svg.innerHTML = `
      ${grid}
      <path d="${path}" class="compat-line"></path>
      ${hoverBands}
      ${dots}
      ${labelsSvg}
      <text x="${x(points.length - 1) + 8}" y="${y(last.evalPct || 0) + 4}" class="compat-last">${fmt(last.evalPct || 0)}%</text>
    `;
  }

  function groupedRows() {
    const map = {};
    for (const row of rows) {
      const key = row.t || "other";
      const group = map[key] || (map[key] = { key, ep: 0, et: 0, suites: 0, green: 0, rows: [] });
      group.ep += row.ep || 0;
      group.et += row.et || 0;
      group.suites += 1;
      if (row.st === "PASS") group.green += 1;
      group.rows.push(row);
    }
    return Object.values(map).sort((a, b) => pct(b.ep, b.et) - pct(a.ep, a.et));
  }

  function rowMatches(row, filter) {
    if (!filter) return true;
    const haystack = `${labels[row.t] || row.t} ${row.s} ${row.pl} ${row.st} ${sourceName(row)}`.toLowerCase();
    return haystack.includes(filter);
  }

  function renderHeat(filter = "") {
    const lower = filter.trim().toLowerCase();
    const groups = groupedRows()
      .map(group => ({ ...group, rows: group.rows.filter(row => rowMatches(row, lower)) }))
      .filter(group => group.rows.length);
    $("#compatHeat").innerHTML = groups.map(group => {
      const gp = pct(group.rows.reduce((a, r) => a + (r.ep || 0), 0), group.rows.reduce((a, r) => a + (r.et || 0), 0));
      const cells = group.rows
        .sort((a, b) => pct(b.ep, b.et) - pct(a.ep, a.et))
        .map(row => {
          const score = pct(row.ep, row.et);
          const source = sourceName(row);
          return `<button class="compat-cell" style="background:${color(score / 100)}"
            data-area="${text(labels[row.t] || row.t)}"
            data-suite="${text(row.s)}"
            data-score="${row.et ? fmt(score) + "%" : "-"}"
            data-status="${text(row.st || "")}"
            data-pillar="${text(row.pl || "")}"
            data-source="${text(source)}"
            aria-label="${text(row.s)} ${row.et ? fmt(score) + "%" : "-"}"></button>`;
        }).join("");
      return `<section class="compat-group">
        <div class="compat-group-head">
          <h3>${text(labels[group.key] || group.key)}</h3>
          <span style="background:${color(gp / 100)}">${fmt(gp)}%</span>
          <em>${group.rows.length} suites</em>
        </div>
        <div class="compat-cells">${cells}</div>
      </section>`;
    }).join("");
  }

  function renderTable(filter = "") {
    const lower = filter.trim().toLowerCase();
    const visible = rows.filter(row => rowMatches(row, lower)).sort((a, b) => pct(b.ep, b.et) - pct(a.ep, a.et));
    const table = $("#compatTable");
    table.tHead.innerHTML = "<tr><th>Area</th><th>Suite</th><th>Eval</th><th>Status</th><th>Pillar</th></tr>";
    table.tBodies[0].innerHTML = visible.map(row => {
      const score = pct(row.ep, row.et);
      return `<tr>
        <td>${text(labels[row.t] || row.t)}</td>
        <td><strong>${text(row.s)}</strong><small>${text(sourceName(row))}</small></td>
        <td><span class="compat-bar"><i style="width:${Math.max(0, Math.min(100, score))}%"></i></span>${row.et ? fmt(score) + "%" : "-"}</td>
        <td><span class="compat-status">${text(String(row.st || "").toLowerCase())}</span></td>
        <td>${text(row.pl)}</td>
      </tr>`;
    }).join("");
  }

  function renderQmatrix() {
    const qmatrix = data.qmatrix || {};
    const rows = (data.qmxRows || []).slice().sort((a, b) => pct(b.ok, b.tot) - pct(a.ok, a.tot)).slice(0, 48);
    $("#compatQmatrix").innerHTML = `
      <div class="chart-meta"><strong>Op-shape robustness</strong><span>${qmatrix.cellsOk || 0}/${qmatrix.cellsTotal || 0} cells clean</span></div>
      <div class="compat-mini-cells">
        ${rows.map(row => `<span style="background:${color(pct(row.ok, row.tot) / 100)}" data-area="Op-shape robustness" data-suite="${text(row.op)}" data-score="${row.ok}/${row.tot}" data-status="${text(row.st || "")}" data-pillar="qmatrix" data-source="tools/qmatrix/${text(row.op)}" aria-label="${text(row.op)} ${row.ok}/${row.tot}"></span>`).join("")}
      </div>
    `;
  }

  function showTip(target) {
    tooltip.innerHTML = `<strong>${text(target.dataset.area)}</strong>
      <span>${text(target.dataset.suite)} - ${text(target.dataset.score)}</span>
      <code>${target.dataset.source}</code>
      <em>${text(target.dataset.status.toLowerCase())} - ${text(target.dataset.pillar)}</em>`;
    const rect = target.getBoundingClientRect();
    tooltip.style.left = `${rect.left + rect.width / 2}px`;
    tooltip.style.top = `${rect.top - 10}px`;
    tooltip.classList.add("show");
  }

  function hideTip() {
    tooltip.classList.remove("show");
  }

  function bindTips(root) {
    root.addEventListener("mouseover", event => {
      const target = event.target.closest("[data-source]");
      if (target) showTip(target);
    });
    root.addEventListener("mouseout", event => {
      if (event.target.closest("[data-source]")) hideTip();
    });
    root.addEventListener("focusin", event => {
      const target = event.target.closest("[data-source]");
      if (target) showTip(target);
    });
    root.addEventListener("focusout", hideTip);
  }

  function applyFilter() {
    const value = $("#compatFilter").value;
    renderHeat(value);
    renderTable(value);
  }

  function setView(view) {
    const heat = view === "heat";
    $("#compatHeat").classList.toggle("hidden", !heat);
    $("#compatTableWrap").classList.toggle("hidden", heat);
    $("#compatViewHeat").setAttribute("aria-pressed", heat);
    $("#compatViewTable").setAttribute("aria-pressed", !heat);
    if (!heat) renderTable($("#compatFilter").value);
  }

  renderKpis();
  renderTrend();
  renderHeat();
  renderTable();
  renderQmatrix();
  bindTips($("#compatHeat"));
  bindTips($("#compatQmatrix"));
  $("#compatFilter").addEventListener("input", applyFilter);
  $("#compatViewHeat").addEventListener("click", () => setView("heat"));
  $("#compatViewTable").addEventListener("click", () => setView("table"));
}());
