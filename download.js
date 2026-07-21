(function () {
  const fileBase = "file/";
  const versionEl = document.querySelector("[data-release-version]");
  const uploadedEl = document.querySelector("[data-release-uploaded]");

  function command(platform, file) {
    if (platform === "windows") {
      return [
        `Invoke-WebRequest https://peachq.org/file/${file} -OutFile ${file}`,
        `Expand-Archive ${file} -DestinationPath peachq`,
        "cd peachq",
        ".\\q.exe"
      ].join("\n");
    }
    return [
      `curl -LO https://peachq.org/file/${file}`,
      "mkdir -p peachq",
      `tar -xzf ${file} -C peachq`,
      "cd peachq",
      "./q"
    ].join("\n");
  }

  function setText(selector, text) {
    document.querySelectorAll(selector).forEach(el => {
      el.textContent = text;
    });
  }

  function releaseFile(value) {
    if (typeof value === "string") return { name: value };
    if (!value || typeof value !== "object") return null;
    const name = value.name || value.file || value.filename || "";
    if (!name) return null;
    return {
      name,
      bytes: Number.isFinite(value.bytes) ? value.bytes : null,
      sha256: typeof value.sha256 === "string" ? value.sha256 : ""
    };
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return "";
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }
    const digits = unit === 0 || value >= 10 ? 0 : 1;
    return `${value.toFixed(digits)} ${units[unit]}`;
  }

  function setMeta(platform, file) {
    document.querySelectorAll(`[data-release-meta="${platform}"]`).forEach(el => {
      const rows = [];
      const size = formatBytes(file.bytes);
      if (size) rows.push(`Size ${size}`);
      if (file.sha256) {
        const shortHash = file.sha256.length > 18 ? `${file.sha256.slice(0, 12)}...${file.sha256.slice(-6)}` : file.sha256;
        rows.push(`SHA-256 ${shortHash}`);
        el.title = `SHA-256 ${file.sha256}`;
      } else {
        el.removeAttribute("title");
      }
      el.textContent = rows.join(" · ");
      el.hidden = rows.length === 0;
    });
  }

  fetch("file/latest.json", { cache: "no-store" })
    .then(response => response.ok ? response.json() : null)
    .then(release => {
      if (!release || !release.files) return;
      if (release.version && versionEl) {
        versionEl.textContent = release.version;
      }
      if (release.uploaded && uploadedEl) {
        uploadedEl.textContent = release.uploaded;
        uploadedEl.dateTime = release.uploaded;
      }
      ["windows", "mac", "linux"].forEach(platform => {
        const file = releaseFile(release.files[platform]);
        if (!file) return;
        setText(`[data-release-file="${platform}"]`, file.name);
        setMeta(platform, file);
        document.querySelectorAll(`[data-release-link="${platform}"]`).forEach(link => {
          link.href = fileBase + encodeURIComponent(file.name);
        });
        setText(`[data-release-command="${platform}"]`, command(platform, file.name));
      });
    })
    .catch(() => {});
})();
