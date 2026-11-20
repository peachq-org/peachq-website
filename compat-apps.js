(function () {
  const root = document.getElementById("compatApps");
  if (!root) return;

  const GRADES = ["Works", "Mostly", "Loads", "Parses", "Broken", "absent"];
  const GUIDES = {"TorQ": "docs/cookbook/torq/", "embedPy": "docs/interfaces/embedpy/"};
  const text = value => String(value == null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const dash = value => !value || value === "-" ? "" : value;

  function tests(value) {
    const m = /^(\d+)\/(\d+)\s*(.*)$/.exec(value || "");
    if (!m) return `<span class="apps-muted">${text(dash(value))}</span>`;
    const ratio = +m[2] ? +m[1] / +m[2] : 0;
    const shown = `${m[1]} / ${m[2]}`;
    if (+m[2] >= 2 && m[1] === m[2] && !m[3]) return `<span class="apps-pass" title="Passes all of its own tests">&#10003; ${shown}</span>`;
    const note = m[3] ? ` title="${text(m[3].replace(/^\(|\)$/g, ""))}"` : "";
    return `<span class="apps-tests"${note}><span>${shown}${m[3] ? "*" : ""}</span><i style="--r:${ratio}"></i></span>`;
  }

  const stars = app => +app.stars || 0;
  const testCount = app => +((/^\d+\/(\d+)/.exec(app.tests || "") || [])[1] || 0);

  function row(app) {
    const guide = GUIDES[app.name];
    const owner = (/github\.com\/([^/]+)/.exec(app.repo || "") || [])[1] || "";
    const runs = app.runs === "yes" && app.grade !== "Works" ? ` title="Its scripted run works; ${text(app.tests)} of its own tests pass."` : "";
    return `<tr id="app-${text(app.name)}" data-grade="${text(app.grade)}">
      <td><a href="${text(app.repo)}" target="_blank" rel="noreferrer"><strong>${text(app.name)}</strong></a>${guide ? ` <a class="apps-guide" href="${guide}">Guide</a>` : ""}</td>
      <td class="apps-author">${owner ? `<a href="https://github.com/${text(owner)}" target="_blank" rel="noreferrer">${text(app.author || owner)}</a>` : ""}</td>
      <td class="apps-about" title="${text(dash(app.about))}">${text(dash(app.about))}</td>
      <td class="apps-stars">${stars(app) ? "&#9733; " + stars(app) : ""}</td>
      <td><span class="apps-grade" data-grade="${text(app.grade)}"${runs}>${text(app.grade)}</span></td>
      <td>${tests(app.tests)}</td>
    </tr>`;
  }

  function render(data) {
    const apps = (data.apps || []).slice().sort((a, b) =>
      stars(b) - stars(a) || testCount(b) - testCount(a) || a.name.localeCompare(b.name));
    const counts = GRADES.map(g => [g, apps.filter(a => a.grade === g).length]).filter(([, n]) => n);
    root.querySelector(".apps-summary").innerHTML = counts.map(([g, n]) =>
      `<span class="apps-grade" data-grade="${text(g)}">${text(g)} ${n}</span>`).join("") +
      (data.updated ? `<em>updated ${text(data.updated)}</em>` : "");
    root.querySelector("tbody").innerHTML = apps.map(row).join("");
    const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) { target.classList.add("apps-target"); target.scrollIntoView({ block: "center" }); }
  }

  fetch("data/apps/apps.json", { cache: "no-cache" })
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(render)
    .catch(() => { root.hidden = true; });
})();
