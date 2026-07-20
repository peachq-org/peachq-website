const root = document.documentElement;

/* Light/dark is shared with the MkDocs Material section at /docs and /news.
 *
 * Material is the owner: it stores the choice in localStorage as
 * "<site root>.__palette" holding {index, color:{media,scheme,primary,accent}},
 * where scheme is "default" or "slate". Its own theme code is left untouched;
 * these pages read and write that same entry so a toggle on either half of the
 * site carries to the other.
 *
 * The key is scoped to the site root. Material computes it per page with
 * `new URL("..", location)` varied by depth; from these root-level pages that
 * is simply "/".
 */
const PALETTE_KEY = "/.__palette";

function readPalette() {
  try {
    return JSON.parse(localStorage.getItem(PALETTE_KEY)) || null;
  } catch (e) {
    return null;
  }
}

function currentTheme() {
  const palette = readPalette();
  if (palette && palette.color && palette.color.scheme) {
    return palette.color.scheme === "slate" ? "dark" : "light";
  }
  if (palette && typeof palette.index === "number") {
    return palette.index === 1 ? "dark" : "light";
  }
  // Migrate anyone still carrying the pre-Material key.
  const legacy = localStorage.getItem("peachq-theme");
  if (legacy === "dark" || legacy === "light") {
    return legacy;
  }
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function writeTheme(theme) {
  const existing = readPalette() || {};
  // Preserve whatever Material stored; only the scheme and index change.
  const color = Object.assign(
    { media: "", primary: "indigo", accent: "indigo" },
    existing.color || {}
  );
  color.scheme = theme === "dark" ? "slate" : "default";
  try {
    localStorage.setItem(
      PALETTE_KEY,
      JSON.stringify({ index: theme === "dark" ? 1 : 0, color })
    );
  } catch (e) {
    /* private browsing, quota, etc. -- the page still works, just unremembered */
  }
}

root.dataset.theme = currentTheme();

document.querySelectorAll("[data-theme-toggle]").forEach(btn => {
  // Icon only. The button carries aria-label="Toggle theme" in template.php,
  // so screen readers still get a description without visible text.
  const render = () => {
    const dark = root.dataset.theme === "dark";
    btn.textContent = dark ? "☀" : "◐";
    btn.title = dark ? "Switch to light mode" : "Switch to dark mode";
  };
  render();
  btn.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    writeTheme(root.dataset.theme);
    render();
  });
});

document.querySelectorAll("[data-mobile-menu]").forEach(button => {
  const nav = button.closest(".nav");
  if (!nav) return;
  button.addEventListener("click", () => {
    const open = nav.dataset.open !== "true";
    nav.dataset.open = String(open);
    button.setAttribute("aria-expanded", String(open));
  });
  nav.querySelectorAll(".nav-links a").forEach(link => {
    link.addEventListener("click", () => {
      nav.dataset.open = "false";
      button.setAttribute("aria-expanded", "false");
    });
  });
});

document.querySelectorAll("[data-signup]").forEach(form => {
  form.addEventListener("submit", e => {
    e.preventDefault();
    const button = form.querySelector("button");
    button.textContent = "You’re on the list ✓";
    button.disabled = true;
  });
});

const platformMatch = (() => {
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const text = `${ua} ${platform}`.toLowerCase();
  if (text.includes("win")) return "windows";
  if (text.includes("mac")) return "mac";
  if (text.includes("linux") || text.includes("x11")) return "linux";
  return "";
})();

if (platformMatch) {
  document.documentElement.dataset.platform = platformMatch;
  document.querySelectorAll("[data-platform-card]").forEach(card => {
    const matched = card.dataset.platformCard === platformMatch;
    card.classList.toggle("recommended", matched);
    if (matched) {
      const tag = card.querySelector(".tag");
      if (tag) tag.textContent = "Recommended for you";
    }
  });
  document.querySelectorAll("[data-platform-instructions-for]").forEach(block => {
    block.hidden = block.dataset.platformInstructionsFor !== platformMatch;
  });
}

const chart = document.getElementById("compatChart");
if (chart) {
  const fallbackPoints = [8,12,18,26,33,41,49,58,67,74,81];

  function svgText(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmtPct(value) {
    return `${(Math.round((value || 0) * 10) / 10).toFixed(1)}%`;
  }

  function renderHomeCompat(points, updated = "") {
    const entries = points.length ? points : fallbackPoints.map(score => ({ score }));
    const latest = entries[entries.length - 1].score || 0;
    const scoreLabel = document.getElementById("homeCompatScore");
    if (scoreLabel) {
      scoreLabel.textContent = updated ? `${fmtPct(latest)} current · ${updated}` : `${fmtPct(latest)} current`;
    }
    drawHomeCompat(entries);
  }

  function drawHomeCompat(entries) {
    const W = 720, H = 300, pad = 34;
    const x = i => entries.length > 1 ? pad + i * ((W - pad * 2) / (entries.length - 1)) : W / 2;
    const y = v => H - pad - v * ((H - pad * 2) / 100);
    const path = entries.map((entry,i) => `${i ? "L":"M"} ${x(i)} ${y(entry.score)}`).join(" ");
    const area = `${path} L ${x(entries.length-1)} ${H-pad} L ${x(0)} ${H-pad} Z`;
    const firstDate = entries[0].date || "";
    const latestDate = entries[entries.length - 1].date || "";
    const hoverBands = entries.map((entry, i) => {
      const left = i === 0 ? pad : (x(i - 1) + x(i)) / 2;
      const right = i === entries.length - 1 ? W - pad : (x(i) + x(i + 1)) / 2;
      const title = [entry.date, fmtPct(entry.score), entry.subject].filter(Boolean).join(" · ");
      return `<rect x="${left}" y="${pad}" width="${right - left}" height="${H - pad * 2}" fill="transparent" pointer-events="all"><title>${svgText(title)}</title></rect>`;
    }).join("");
    chart.innerHTML = `
      <defs>
        <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffb38a" stop-opacity=".40"/>
          <stop offset="100%" stop-color="#ffb38a" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${[0,25,50,75,100].map(v=>`<line x1="${pad}" x2="${W-pad}" y1="${y(v)}" y2="${y(v)}" stroke="currentColor" opacity=".09"/>`).join("")}
      <path d="${area}" fill="url(#fill)"/>
      <path d="${path}" fill="none" stroke="#f28b57" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      ${hoverBands}
      ${entries.map((entry,i)=>`<circle cx="${x(i)}" cy="${y(entry.score)}" r="${i===entries.length-1?7:4}" fill="#ffb38a" stroke="#17140b" stroke-width="2" pointer-events="none"/>`).join("")}
      <text x="${pad}" y="${H-20}" fill="currentColor" opacity=".55" font-size="13">first parser</text>
      <text x="${pad}" y="${H-6}" fill="currentColor" opacity=".55" font-size="12">${svgText(firstDate)}</text>
      <text x="${W-pad}" y="${H-20}" text-anchor="end" fill="currentColor" opacity=".55" font-size="13">latest</text>
      <text x="${W-pad}" y="${H-6}" text-anchor="end" fill="currentColor" opacity=".55" font-size="12">${svgText(latestDate)}</text>
    `;
  }

  renderHomeCompat(fallbackPoints.map(score => ({ score })));
  fetch("/data/qdash/data.json", { cache: "no-store" })
    .then(response => response.ok ? response.json() : null)
    .then(data => {
      if (!data) return;
      const trend = Array.isArray(data.evalTrend) ? data.evalTrend : [];
      const points = trend
        .map(point => ({ score: Number(point.evalPct), date: point.date, subject: point.subj }))
        .filter(point => Number.isFinite(point.score));
      if (!points.length && data.tot && data.tot.et) {
        points.push({ score: 100 * data.tot.ep / data.tot.et, date: data.updated || "" });
      }
      renderHomeCompat(points, data.updated || "");
    })
    .catch(() => {});
}

const roadmapVersionExample = document.getElementById("roadmapVersionExample");
const roadmapScoreExample = document.getElementById("roadmapScoreExample");
if (roadmapVersionExample && roadmapScoreExample) {
  function parseReleaseVersion(value) {
    const match = String(value || "").match(/(\d+)\.(\d+)/);
    if (!match) return null;
    const major = Number(match[1]);
    const minor = Number(match[2]);
    if (!Number.isFinite(major) || !Number.isFinite(minor)) return null;
    return {
      version: `${major}.${String(minor).padStart(2, "0")}`,
      score: major < 1 ? Math.max(0, Math.min(99, minor)) : 100
    };
  }

  fetch("/file/latest.json", { cache: "no-store" })
    .then(response => response.ok ? response.json() : null)
    .then(release => {
      const parsed = parseReleaseVersion(release && release.version);
      if (!parsed) return;
      roadmapVersionExample.textContent = parsed.version;
      roadmapScoreExample.textContent = `${parsed.score}%`;
    })
    .catch(() => {});
}
