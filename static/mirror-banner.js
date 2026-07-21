/* Announces that this copy of the site is a mirror.
 *
 * Some corporate networks -- banks especially -- block domains they have not
 * seen before, which during the preview is most of PeachQ's audience. So the
 * whole site is also served from timestored.com/peachq, a domain those networks
 * already allow. Anyone landing there should know they are on a copy and where
 * the real thing lives.
 *
 * Decided at run time from the hostname rather than by a build flag, so there is
 * exactly one build of the site and it can be dropped anywhere. Loaded by both
 * halves: static/template.php for the PHP pages, overrides/main.html for the
 * MkDocs ones. The styles are inline here for the same reason -- one file to
 * copy, and nothing to keep in sync in two stylesheets.
 */
(function () {
  var CANONICAL_HOST = "peachq.org";
  var host = window.location.hostname;

  // The canonical site and anything local. Everything else is a mirror.
  if (
    host === CANONICAL_HOST ||
    host.endsWith("." + CANONICAL_HOST) ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === ""
  ) {
    return;
  }

  var style = document.createElement("style");
  style.textContent = [
    ".mirror-banner{background:#b3541e;color:#fff;font-size:.9rem;line-height:1.45;",
    "position:relative;z-index:10}",
    ".mirror-banner__inner{max-width:1180px;margin:0 auto;padding:.7rem 1.2rem;",
    "display:flex;align-items:baseline;gap:.6rem;flex-wrap:wrap}",
    ".mirror-banner__label{flex:none;text-transform:uppercase;letter-spacing:.08em;",
    "font-size:.7rem;font-weight:700;padding:.15rem .5rem;border-radius:3px;",
    "background:rgba(255,255,255,.22)}",
    ".mirror-banner a{color:#fff;font-weight:600;text-decoration:underline;",
    "text-underline-offset:2px}"
  ].join("");

  var banner = document.createElement("div");
  banner.className = "mirror-banner";
  banner.innerHTML =
    '<div class="mirror-banner__inner">' +
    '<span class="mirror-banner__label">Mirror</span>' +
    "<span>This is a mirror of PeachQ, hosted for networks that block newer " +
    'domains. The official site is <a href="https://' +
    CANONICAL_HOST +
    '/">' +
    CANONICAL_HOST +
    "</a>.</span></div>";

  function show() {
    document.head.appendChild(style);
    document.body.insertBefore(banner, document.body.firstChild);
  }

  // `defer` on the PHP pages means the body already exists; Material loads its
  // scripts in <head> without it, so that path has to wait.
  if (document.body) {
    show();
  } else {
    document.addEventListener("DOMContentLoaded", show);
  }
})();
