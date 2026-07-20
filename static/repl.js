const output = document.getElementById("replOutput");
const input = document.getElementById("replInput");
const status = document.getElementById("replStatus");
const exampleButtons = Array.from(document.querySelectorAll("[data-example]"));
const bugLink = document.getElementById("replBugLink");
const copyButton = document.getElementById("replCopy");
const shareButton = document.getElementById("replShare");
const expandButton = document.getElementById("replExpand");
const closeButton = document.getElementById("replClose");
const toast = document.getElementById("replToast");
const examplesToggle = document.getElementById("replExamplesToggle");
const examplesMenu = document.getElementById("replExamplesMenu");
const openToggle = document.getElementById("replOpenToggle");
const openMenu = document.getElementById("replOpenMenu");
const richExampleButtons = Array.from(document.querySelectorAll("[data-rich-example]"));
const editorExampleButtons = Array.from(document.querySelectorAll("[data-editor-example]"));
const editor = document.getElementById("replEditor");
const editorHighlight = document.getElementById("replEditorHighlight");
const editorWrap = document.querySelector(".repl-editor-wrap");
const tabsEl = document.getElementById("replTabs");
const exportTabsButton = document.getElementById("replExportTabs");
const importTabsButton = document.getElementById("replImportTabs");
const editorThemeButtons = Array.from(document.querySelectorAll("[data-repl-theme-toggle]"));
const importTabsInput = document.getElementById("replImportInput");
const runLineButton = document.getElementById("replRunLine");
const runSelectionButton = document.getElementById("replRunSelection");
const storageKeys = {
  history: "peachq-repl-history",
  transcript: "peachq-repl-transcript",
  expanded: "peachq-repl-expanded",
  editor: "peachq-repl-editor",
  workspace: "peachq-repl-workspace"
};

const defaultRuntimeScripts = [
  "/wasm/latest/peachq.js",
  "/wasm/latest/openq.js",
  "/wasm/latest/rayforce.js"
];
const factoryNames = ["createPeachQ", "createOpenQ", "createRayforce"];
const sqlTypes = "array binary bit boolean char character clob date decimal double float int integer interval large national nchar nclob numeric object precision real smallint time timestamp varchar varying";
const sqlKeywords = "absolute action add after all allocate alter and any are as asc assertion at authorization before begin between both breadth by call cascade cascaded case cast catalog check close collate collation column commit condition connect connection constraint constraints constructor continue corresponding count create cross cube current current_date current_default_transform_group current_transform_group_for_type current_path current_role current_time current_timestamp current_user cursor cycle data day deallocate declare default deferrable deferred delete depth deref desc describe descriptor deterministic diagnostics disconnect distinct do domain drop dynamic each else elseif end end-exec equals escape except exception exec execute exists exit external fetch first for foreign found from free full function general get global go goto grant group grouping handle having hold hour identity if immediate in indicator initially inner inout input insert intersect into is isolation join key language last lateral leading leave left level like limit local localtime localtimestamp locator loop map match method minute modifies module month names natural nesting new next no none not of old on only open option or order ordinality out outer output overlaps pad parameter partial path prepare preserve primary prior privileges procedure public read reads recursive redo ref references referencing relative release repeat resignal restrict result return returns revoke right role rollback rollup routine row rows savepoint schema scroll search second section select session session_user set sets signal similar size some space specific specifictype sql sqlexception sqlstate sqlwarning start state static system_user table temporary then timezone_hour timezone_minute to trailing transaction translation treat trigger under undo union unique unnest until update usage user using value values view when whenever where while with without work write year zone";
const qKeywords = "xlog xdesc wj1 while sums rsave read1 read0 prior prev prds next mmin mins md5 mavg lsq load if hopen hclose get first exit exec do dev deltas cut cov cor binr attr and avg asc all bin cross count differ each eval except exp fby fills fkeys flip getenv group gtime hcount hsym iasc idesc in inter insert inv key keys ltime max maxs mcount mdev med meta mmax mmu mod msum neg not null or over parse peach prd rand rank ratios raze reciprocal reverse rload rotate save scan set setenv show signum ss ssr like string sublist sv system tables til type ungroup union upsert value var view views vs where within wj wsum xasc xbar xcol xcols xexp xgroup xkey xprev xrank lj pj ij ej uj aj select update delete lower upper trim rtrim ltrim cols sin asin cos acos tan atan log sqrt abs min sum last wavg hdel enlist ceiling floor any";
const qBuiltins = ".Q.addmonths .Q.addr .Q.host .Q.chk .Q.cn .Q.pn .Q.D .Q.dd .Q.dpft .Q.dsftg .Q.en .Q.fc .Q.fk .Q.fmt .Q.fs .Q.ft .Q.gc .Q.hdpf .Q.ind .Q.P .Q.par .Q.PD .Q.pd .Q.pf .Q.PV .Q.pv .Q.qp .Q.qt .Q.s .Q.ty .Q.u .Q.v .Q.V .Q.view .Q.def .Q.ff .Q.fsn .Q.fu .Q.id .Q.j10 .Q.x10 .Q.j12 .Q.x12 .Q.k .Q.MAP .Q.opt .Q.w .Q.pt .Q.bv .Q.vp .Q.U .z.c .z.exit .z.pd .z.q .z.W .z.zd .z.ws .z.bm .z.a .z.ac .z.b .z.d .z.D .z.f .z.h .z.i .z.k .z.K .z.l .z.o .z.pc .z.pg .z.ph .z.pi .z.po .z.pp .z.ps .z.pw .z.1 .z.s .z.t .z.T .z.ts .z.u .z.vs .z.w .z.x .z.z .z.Z .z.n .z.N .z.p .z.P";

let runtime = null;
let activeRuntime = null;
let history = [];
let historyIndex = 0;
let transcript = [];
let sharedRuns = [];
let cmView = null;
let editorDirty = false;
let workspace = null;
let suppressEditorChange = false;

try {
  const shared = new URLSearchParams(window.location.search).get("run");
  if (shared) {
    sharedRuns = shared
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean)
      .slice(0, 20);
  }
} catch (_err) {}

function setExamplesEnabled(enabled) {
  exampleButtons.forEach(button => {
    button.disabled = !enabled;
  });
  richExampleButtons.forEach(button => {
    button.disabled = !enabled;
  });
  if (runLineButton) runLineButton.disabled = !enabled;
  if (runSelectionButton) runSelectionButton.disabled = !enabled;
}

function setStatus(text, cls = "") {
  status.textContent = "";
  status.setAttribute("aria-label", text);
  status.title = text;
  status.className = cls;
  status.classList.add("repl-status-dot");
}

function renderEditorThemeButton() {
  const dark = document.documentElement.dataset.theme === "dark";
  editorThemeButtons.forEach(button => {
    button.textContent = dark ? "☀" : "◐";
    button.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    button.title = dark ? "Switch to light theme" : "Switch to dark theme";
  });
}

function storageGet(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (_err) {
    return fallback;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_err) {}
}

function storageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch (_err) {}
}

function normalizeTranscript(entries) {
  if (!Array.isArray(entries)) return [];
  return entries
    .map(entry => {
      if (typeof entry === "string") return { text: entry, cls: "" };
      if (!entry || typeof entry.text !== "string") return null;
      return { text: entry.text, cls: typeof entry.cls === "string" ? entry.cls : "" };
    })
    .filter(Boolean)
    .slice(-120);
}

function saveHistory() {
  storageSet(storageKeys.history, history.slice(-80));
}

function saveTranscript() {
  storageSet(storageKeys.transcript, transcript.slice(-120));
}

function htmlEscape(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function highlightQLine(line) {
  const commentAt = line.search(/^\s*\/|(?<=\s)\/(?=\s|$)/);
  const code = commentAt >= 0 ? line.slice(0, commentAt) : line;
  const comment = commentAt >= 0 ? line.slice(commentAt) : "";
  let escaped = "";
  let at = 0;
  code.replace(/"([^"\\]|\\.)*"|`[A-Za-z_][A-Za-z0-9_]*|\b\d+(?:\.\d+)?(?:[efijh])?\b|\b[A-Za-z_][A-Za-z0-9_]*\b/g, (match, _stringPart, offset) => {
    escaped += htmlEscape(code.slice(at, offset));
    const text = htmlEscape(match);
    if (match.startsWith("\"")) escaped += `<span class="q-string">${text}</span>`;
    else if (match.startsWith("`")) escaped += `<span class="q-symbol">${text}</span>`;
    else if (/^\d/.test(match)) escaped += `<span class="q-number">${text}</span>`;
    else if (/^(select|exec|update|delete|from|where|by|within|like|in|lj|ij|uj|aj|wj|xkey|xgroup)$/.test(match)) {
      escaped += `<span class="q-keyword">${text}</span>`;
    } else if (/^(sum|avg|min|max|count|first|last|til|reverse|asc|desc|group|flip|raze|each|over|scan|prior|enlist)$/.test(match)) {
      escaped += `<span class="q-verb">${text}</span>`;
    } else {
      escaped += text;
    }
    at = offset + match.length;
    return match;
  });
  escaped += htmlEscape(code.slice(at));
  return escaped + (comment ? `<span class="q-comment">${htmlEscape(comment)}</span>` : "");
}

function updateEditorHighlight() {
  if (!editor || !editorHighlight) return;
  const value = editor.value || "";
  editorHighlight.innerHTML = value.split("\n").map(highlightQLine).join("\n") + "\n";
}

function editorText() {
  if (cmView) return cmView.state.doc.toString();
  return editor ? editor.value : "";
}

function editorSelectionText() {
  if (cmView) {
    const selection = cmView.state.selection.main;
    return selection.empty ? "" : cmView.state.doc.sliceString(selection.from, selection.to);
  }
  if (editor && editor.selectionStart !== editor.selectionEnd) {
    return editor.value.slice(editor.selectionStart, editor.selectionEnd);
  }
  return "";
}

function focusEditor() {
  if (cmView) {
    cmView.focus();
  } else if (editor) {
    editor.focus();
  }
}

function saveEditor() {
  const tab = activeTab();
  if (tab) {
    tab.text = editorText();
  }
  saveWorkspace();
}

function defaultEditorText() {
  return [
    "trade:([]sym:`AAPL`MSFT`NVDA;px:211.2 493.7 167.9)",
    "select avg px by sym from trade",
    "sum 2 3 4 5"
  ].join("\n");
}

function newId() {
  return "tab-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function cleanTab(tab, index = 0) {
  return {
    id: typeof tab.id === "string" ? tab.id : newId(),
    name: typeof tab.name === "string" && tab.name.trim() ? tab.name.trim().slice(0, 80) : `scratch-${index + 1}.q`,
    text: typeof tab.text === "string" ? tab.text : "",
    dirty: tab.dirty === true
  };
}

function defaultWorkspace() {
  return {
    activeId: "welcome",
    tabs: [{
      id: "welcome",
      name: "welcome.q",
      text: storageGet(storageKeys.editor, defaultEditorText()),
      dirty: false
    }]
  };
}

function normalizeWorkspace(value) {
  const source = value && typeof value === "object" ? value : defaultWorkspace();
  let tabs = Array.isArray(source.tabs) ? source.tabs.map(cleanTab).filter(tab => tab.id) : [];
  if (!tabs.length) tabs = defaultWorkspace().tabs;
  let activeId = typeof source.activeId === "string" && tabs.some(tab => tab.id === source.activeId)
    ? source.activeId
    : tabs[0].id;
  return { activeId, tabs };
}

function activeTab() {
  return workspace ? workspace.tabs.find(tab => tab.id === workspace.activeId) || workspace.tabs[0] : null;
}

function saveWorkspace() {
  if (!workspace) return;
  storageSet(storageKeys.workspace, workspace);
}

function renderTabs() {
  if (!tabsEl || !workspace) return;
  tabsEl.innerHTML = "";
  workspace.tabs.forEach(tab => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "repl-tab";
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(tab.id === workspace.activeId));
    button.title = tab.name + (tab.dirty ? " - unsaved changes" : "");
    button.dataset.tabId = tab.id;

    const name = document.createElement("span");
    name.className = "repl-tab-name";
    name.textContent = tab.name;
    button.appendChild(name);

    if (tab.dirty) {
      const dirty = document.createElement("span");
      dirty.className = "repl-tab-dirty";
      dirty.setAttribute("aria-hidden", "true");
      button.appendChild(dirty);
    }

    const close = document.createElement("span");
    close.className = "repl-tab-close";
    close.textContent = "×";
    close.setAttribute("role", "button");
    close.setAttribute("aria-label", `Close ${tab.name}`);
    close.dataset.closeTab = tab.id;
    button.appendChild(close);

    tabsEl.appendChild(button);
  });
  const add = document.createElement("button");
  add.type = "button";
  add.className = "repl-tab repl-tab-add";
  add.textContent = "+";
  add.title = "New tab";
  add.setAttribute("aria-label", "New tab");
  add.dataset.newTab = "true";
  tabsEl.appendChild(add);
}

function setEditorText(text, dirty = false, updateTab = true) {
  suppressEditorChange = true;
  if (cmView) {
    const current = cmView.state.doc.toString();
    cmView.dispatch({
      changes: { from: 0, to: current.length, insert: text }
    });
  }
  if (editor) {
    editor.value = text;
    updateEditorHighlight();
  }
  suppressEditorChange = false;
  editorDirty = dirty;
  if (updateTab) {
    const tab = activeTab();
    if (tab) {
      tab.text = text;
      tab.dirty = dirty;
      saveWorkspace();
      renderTabs();
    }
  }
}

function restoreEditor() {
  workspace = normalizeWorkspace(storageGet(storageKeys.workspace, null));
  const tab = activeTab();
  renderTabs();
  setEditorText(tab ? tab.text : defaultEditorText(), tab ? tab.dirty : false, false);
}

function selectTab(id) {
  if (!workspace || workspace.activeId === id) return;
  const current = activeTab();
  if (current) current.text = editorText();
  const next = workspace.tabs.find(tab => tab.id === id);
  if (!next) return;
  workspace.activeId = next.id;
  saveWorkspace();
  renderTabs();
  setEditorText(next.text, next.dirty, false);
  focusEditor();
}

function createTab(name = "untitled.q", text = "", dirty = false, select = true) {
  if (!workspace) workspace = defaultWorkspace();
  const tab = cleanTab({ id: newId(), name, text, dirty }, workspace.tabs.length);
  workspace.tabs.push(tab);
  if (select) workspace.activeId = tab.id;
  saveWorkspace();
  renderTabs();
  if (select) setEditorText(tab.text, tab.dirty, false);
  return tab;
}

function closeTab(id) {
  if (!workspace || workspace.tabs.length <= 1) {
    showToast("Keep at least one tab");
    return;
  }
  const tab = workspace.tabs.find(item => item.id === id);
  if (!tab) return;
  if (tab.dirty && !window.confirm(`Close ${tab.name}? Unsaved local edits will be removed.`)) return;
  const index = workspace.tabs.findIndex(item => item.id === id);
  workspace.tabs = workspace.tabs.filter(item => item.id !== id);
  if (workspace.activeId === id) {
    workspace.activeId = workspace.tabs[Math.max(0, index - 1)].id;
    const next = activeTab();
    setEditorText(next.text, next.dirty, false);
  }
  saveWorkspace();
  renderTabs();
}

function renameActiveTab() {
  const tab = activeTab();
  if (!tab) return;
  const name = window.prompt("Tab name", tab.name);
  if (!name) return;
  tab.name = name.trim().slice(0, 80) || tab.name;
  saveWorkspace();
  renderTabs();
}

function exportWorkspace() {
  if (!workspace) return;
  const current = activeTab();
  if (current) current.text = editorText();
  saveWorkspace();
  const payload = JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    tabs: workspace.tabs.map(tab => ({ name: tab.name, text: tab.text })),
    activeName: activeTab() ? activeTab().name : ""
  }, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "peachq-workspace.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Workspace exported");
}

function importWorkspaceFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || ""));
      const importedTabs = Array.isArray(parsed.tabs) ? parsed.tabs : [];
      if (!importedTabs.length) throw new Error("no tabs");
      if (!window.confirm("Replace current editor tabs with imported tabs?")) return;
      workspace = normalizeWorkspace({
        activeId: "",
        tabs: importedTabs.map((tab, index) => ({
          id: newId(),
          name: tab.name || `imported-${index + 1}.q`,
          text: tab.text || "",
          dirty: false
        }))
      });
      if (parsed.activeName) {
        const active = workspace.tabs.find(tab => tab.name === parsed.activeName);
        if (active) workspace.activeId = active.id;
      }
      const tab = activeTab();
      saveWorkspace();
      renderTabs();
      setEditorText(tab.text, false, false);
      showToast("Workspace imported");
    } catch (_err) {
      showToast("Import failed");
    }
  };
  reader.readAsText(file);
}

async function initCodeMirror() {
  if (!editorWrap || !editor) return;
  try {
    const {
      Decoration,
      EditorView,
      ViewPlugin,
      keymap,
      lineNumbers,
      highlightActiveLineGutter,
      highlightSpecialChars,
      drawSelection,
      dropCursor,
      highlightActiveLine,
      EditorState,
      indentOnInput,
      bracketMatching,
      defaultKeymap,
      history,
      historyKeymap,
      sql,
      SQLDialect,
      sublime
    } = await import("/js/codemirror-peachq.js");
    const qCommentMark = Decoration.mark({ class: "cm-q-comment" });
    function qCommentDecorations(view) {
      const ranges = [];
      for (const visible of view.visibleRanges) {
        let pos = visible.from;
        while (pos <= visible.to) {
          const line = view.state.doc.lineAt(pos);
          const match = /^\s*\/|(?<=\s)\/(?=\s|$)/.exec(line.text);
          if (match) {
            const from = line.from + match.index + match[0].indexOf("/");
            ranges.push(qCommentMark.range(from, line.to));
          }
          if (line.to >= visible.to || line.to === view.state.doc.length) break;
          pos = line.to + 1;
        }
      }
      return Decoration.set(ranges, true);
    }
    const qComments = ViewPlugin.fromClass(class {
      constructor(view) {
        this.decorations = qCommentDecorations(view);
      }
      update(update) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = qCommentDecorations(update.view);
        }
      }
    }, {
      decorations: plugin => plugin.decorations
    });
    const qDialect = SQLDialect.define({
      keywords: `${sqlKeywords} ${qKeywords}`,
      builtin: qBuiltins,
      types: sqlTypes,
      backslashEscapes: true,
      hashComments: false,
      slashComments: true,
      spaceAfterDashes: true,
      operatorChars: "*+\\-%<>!=&|~^/;,.=><~?:<=>=!=&|+/::-*/\\&|^%+:-:*:%:!:",
      specialVar: "",
      identifierQuotes: "\"",
      unquotedBitLiterals: true
    });
    const peachQSetup = [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      bracketMatching(),
      highlightActiveLine(),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap
      ])
    ];
    cmView = new EditorView({
      doc: editor.value,
      parent: editorWrap,
      extensions: [
        keymap.of([
          {
            key: "Ctrl-Enter",
            run() {
              runBlock(currentEditorLine());
              return true;
            }
          },
          {
            key: "Ctrl-e",
            run() {
              runBlock(selectedEditorText());
              return true;
            }
          }
        ]),
        peachQSetup,
        sql({ dialect: qDialect }),
        qComments,
        sublime,
        EditorView.lineWrapping,
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            if (suppressEditorChange) return;
            editorDirty = true;
            const tab = activeTab();
            if (tab) {
              tab.text = editorText();
              if (!tab.dirty) {
                tab.dirty = true;
                renderTabs();
              }
            }
            saveWorkspace();
          }
        }),
        EditorView.theme({
          "&": { height: "100%", backgroundColor: "#0d1218", color: "#dce3ea" },
          ".cm-scroller": { fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace", fontSize: ".95rem", lineHeight: "1.65" },
          ".cm-content": { caretColor: "#f4f5f7", padding: "16px" },
          ".cm-gutters": { backgroundColor: "#0d1218", color: "#6f7d8d", borderRight: "1px solid rgba(255,255,255,.08)" },
          ".cm-activeLine": { backgroundColor: "rgba(255,255,255,.045)" },
          ".cm-activeLineGutter": { backgroundColor: "rgba(255,255,255,.06)" },
          ".cm-selectionBackground": { backgroundColor: "rgba(255,179,138,.26)!important" },
          ".cm-focused": { outline: "none" }
        })
      ]
    });
    editorWrap.classList.add("cm-active");
  } catch (err) {
    console.warn("CodeMirror failed to load", err);
    showToast("Using fallback editor");
  }
}

function appendOutput(entry) {
  const div = document.createElement("div");
  div.className = entry.cls || "";
  div.textContent = entry.text;
  output.appendChild(div);
}

function print(text, cls = "") {
  const entry = { text, cls };
  appendOutput(entry);
  transcript.push(entry);
  if (transcript.length > 120) {
    transcript = transcript.slice(-120);
  }
  saveTranscript();
  updateBugLink();
  output.scrollTop = output.scrollHeight;
}

function clearOutput() {
  output.innerHTML = "";
  transcript = [];
  print("PeachQ browser REPL", "sys");
  if (activeRuntime) {
    print("Runtime: " + activeRuntime.script, "sys");
  }
}

function restoreState() {
  const savedHistory = storageGet(storageKeys.history, []);
  if (Array.isArray(savedHistory)) {
    history = savedHistory.filter(item => typeof item === "string").slice(-80);
    historyIndex = history.length;
  }

  transcript = normalizeTranscript(storageGet(storageKeys.transcript, []));
  output.innerHTML = "";
  if (transcript.length) {
    transcript.forEach(appendOutput);
  } else {
    print("PeachQ browser REPL", "sys");
  }
  updateBugLink();
  output.scrollTop = output.scrollHeight;
}

function restoreExpandedState() {
  if (!expandButton) return;
  const expanded = storageGet(storageKeys.expanded, false) === true;
  setExpandedState(expanded);
}

function setExpandedState(expanded) {
  if (!expandButton) return;
  const panel = output.closest(".repl-panel");
  if (!panel) return;
  panel.classList.toggle("expanded", expanded);
  expandButton.textContent = expanded ? "Exit editor" : "Editor mode";
  expandButton.setAttribute("aria-label", expanded ? "Exit editor mode" : "Open editor mode");
  expandButton.setAttribute("aria-expanded", String(expanded));
  if (expanded) {
    storageSet(storageKeys.expanded, true);
  } else {
    storageRemove(storageKeys.expanded);
  }
  window.setTimeout(() => {
    output.scrollTop = output.scrollHeight;
    if (expanded && (cmView || editor)) {
      focusEditor();
    } else {
      input.focus();
    }
  }, 0);
}

function updateBugLink() {
  if (!bugLink) return;
  const body = [
    "### What happened?",
    "",
    "### What did you expect?",
    "",
    "### REPL transcript",
    "```q",
    transcript.map(entry => entry.text).join("\n"),
    "```",
    "",
    "### Browser / OS",
    navigator.userAgent
  ].join("\n");
  const params = new URLSearchParams({
    title: "REPL bug report",
    body: body.slice(-7600)
  });
  bugLink.href = "https://github.com/peachq-org/peachq/issues/new?" + params.toString();
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      reject(new Error("could not load " + src));
    };
    document.head.appendChild(script);
  });
}

async function loadRuntime() {
  input.disabled = true;
  setExamplesEnabled(false);
  setStatus("loading runtime");
  print("Loading PeachQ WebAssembly runtime...", "sys");

  const runtimeCandidates = await runtimeList();
  const failures = [];
  for (const candidate of runtimeCandidates) {
    try {
      setStatus("trying " + candidate.script);
      const beforeFactories = factorySnapshot();
      await loadScript(candidate.script);
      const factory = findFactory(candidate, beforeFactories);
      runtime = await factory({
        locateFile(path) {
          return runtimeSibling(path, candidate.script);
        }
      });
      runtime.ccall("q_wasm_init", "number", [], []);
      activeRuntime = candidate;
      input.disabled = false;
      setExamplesEnabled(true);
      input.focus();
      setStatus("runtime ready", "ready");
      print("Runtime ready.", "result");
      print("Try: til 10, sum 2 3 4 5, avg 10 20 30", "sys");
      replaySharedRuns();
      return;
    } catch (err) {
      failures.push(candidate.script + " (" + err.message + ")");
    }
  }

  setStatus("runtime missing", "error");
  setExamplesEnabled(false);
  print("Runtime was not found.", "error");
  print("Deploy one of these generated artifacts and refresh:", "sys");
  runtimeCandidates.forEach(candidate => print("  " + candidate.script, "sys"));
  print("Details:", "sys");
  failures.forEach(failure => print("  " + failure, "sys"));
}

async function runtimeList() {
  const defaults = defaultRuntimeScripts.map(script => ({ script }));
  try {
    const response = await fetch("/wasm/latest/manifest.json", { cache: "no-store" });
    if (!response.ok) return defaults;
    const manifest = await response.json();
    const scripts = Array.isArray(manifest.scripts)
      ? manifest.scripts
      : [{ script: manifest.script || manifest.js, factory: manifest.factory }];
    const base = window.location.origin + "/wasm/latest/";
    const seen = new Set();
    return scripts
      .filter(item => item && item.script)
      .map(item => ({
        script: sameOriginPath(new URL(item.script, base)),
        factory: item.factory
      }))
      .concat(defaults)
      .filter(item => {
        if (seen.has(item.script)) return false;
        seen.add(item.script);
        return true;
      });
  } catch (_err) {
    return defaults;
  }
}

function sameOriginPath(url) {
  return url.origin === window.location.origin ? url.pathname : url.href;
}

function runtimeSibling(path, script) {
  const scriptUrl = new URL(script, window.location.href);
  return sameOriginPath(new URL(path, scriptUrl));
}

function factorySnapshot() {
  return Object.fromEntries(factoryNames.map(name => [name, window[name]]));
}

function findFactory(candidate, beforeFactories) {
  const names = candidate.factory ? [candidate.factory].concat(factoryNames) : factoryNames;
  for (const name of names) {
    if (typeof window[name] === "function" && window[name] !== beforeFactories[name]) {
      return window[name];
    }
  }
  throw new Error("no new runtime factory found");
}

function evalWasm(code) {
  const ptr = runtime.ccall("q_wasm_eval", "number", ["string"], [code]);
  const text = runtime.UTF8ToString(ptr);
  runtime.ccall("q_wasm_free", null, ["number"], [ptr]);
  return text;
}

function run(code) {
  const source = code.trim();
  if (!source) return;
  if (!runtime) {
    print("q)" + source, "prompt");
    print("runtime is not ready", "error");
    return;
  }
  history.push(source);
  if (history.length > 80) {
    history = history.slice(-80);
  }
  historyIndex = history.length;
  saveHistory();
  print("q)" + source, "prompt");
  try {
    const result = evalWasm(source);
    if (result) {
      const cls = /^(parse error|error:|')/.test(result) ? "error" : "result";
      print(result, cls);
    }
  } catch (err) {
    print("error: " + err.message, "error");
  }
}

function runBlock(source) {
  String(source || "")
    .split("\n")
    .map(line => line.trim())
    .filter(line => line && !line.startsWith("/"))
    .forEach(run);
}

function currentEditorLine() {
  if (cmView) {
    return cmView.state.doc.lineAt(cmView.state.selection.main.head).text;
  }
  if (!editor) return "";
  const value = editor.value;
  const pos = editor.selectionStart;
  const start = value.lastIndexOf("\n", pos - 1) + 1;
  const next = value.indexOf("\n", pos);
  const end = next === -1 ? value.length : next;
  return value.slice(start, end);
}

function selectedEditorText() {
  const selection = editorSelectionText();
  return selection || editorText();
}

async function loadEditorExample(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error("could not load example");
  const text = await response.text();
  const name = path.split("/").pop() || "example.q";
  const existing = workspace && workspace.tabs.find(tab => tab.name === name);
  if (existing) {
    selectTab(existing.id);
  } else {
    const current = activeTab();
    const canReplace = current && !current.dirty && !current.text.trim();
    if (canReplace) {
      current.name = name;
      setEditorText(text, false, true);
    } else {
      if (current && current.dirty && !window.confirm("Open this example in a new tab and keep your current tab?")) return;
      createTab(name, text, false, true);
    }
  }
  const panel = output.closest(".repl-panel");
  if (!panel || !panel.classList.contains("expanded")) {
    setExpandedState(true);
  }
  focusEditor();
}

function replaySharedRuns() {
  if (!sharedRuns.length) return;
  const runs = sharedRuns;
  sharedRuns = [];
  runs.forEach(run);
}

function commandSource() {
  const current = input.value.trim();
  if (current) return [current];
  const latest = history[history.length - 1];
  return latest ? [latest] : [];
}

function shareUrl() {
  const editorSelection = editorSelectionText().trim();
  const commands = (editorSelection || commandSource().join("\n")).slice(0, 1800);
  if (!commands) return "";
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("run", commands);
  return url.toString();
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => {
    toast.classList.remove("show");
  }, 1800);
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}

if (copyButton) {
  copyButton.addEventListener("click", async () => {
    const text = transcript.map(entry => entry.text).join("\n");
    if (!text) return;
    try {
      await copyText(text);
      showToast("Output copied");
    } catch (_err) {
      showToast("Copy failed");
    }
  });
}

if (expandButton) {
  expandButton.addEventListener("click", () => {
    const panel = output.closest(".repl-panel");
    setExpandedState(panel ? !panel.classList.contains("expanded") : false);
  });

  if (closeButton) {
    closeButton.addEventListener("click", () => setExpandedState(false));
  }

  document.addEventListener("pointerdown", e => {
    const panel = output.closest(".repl-panel");
    if (!panel || !panel.classList.contains("expanded")) return;
    if (panel.contains(e.target)) return;
    setExpandedState(false);
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      setExpandedState(false);
    }
  });
}

if (shareButton) {
  shareButton.addEventListener("click", async () => {
    const url = shareUrl();
    if (!url) {
      showToast("Run something first");
      return;
    }
    try {
      if (navigator.share) {
        await navigator.share({
          title: "PeachQ REPL",
          text: "Open this PeachQ REPL session.",
          url
        });
      } else {
        await copyText(url);
        showToast("Link copied");
      }
    } catch (err) {
      if (err && err.name === "AbortError") return;
      try {
        await copyText(url);
        showToast("Link copied");
      } catch (_copyErr) {
        showToast("Share failed");
      }
    }
  });
}

if (editor) {
  editor.addEventListener("input", () => {
    if (cmView) return;
    editorDirty = true;
    updateEditorHighlight();
    const tab = activeTab();
    if (tab) {
      tab.text = editor.value;
      if (!tab.dirty) {
        tab.dirty = true;
        renderTabs();
      }
    }
    saveWorkspace();
  });
  editor.addEventListener("scroll", () => {
    if (cmView) return;
    if (!editorHighlight) return;
    editorHighlight.scrollTop = editor.scrollTop;
    editorHighlight.scrollLeft = editor.scrollLeft;
  });
  editor.addEventListener("keydown", e => {
    if (cmView) return;
    if (e.key === "Tab") {
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      editor.setRangeText("  ", start, end, "end");
      updateEditorHighlight();
      saveEditor();
      e.preventDefault();
    } else if (e.ctrlKey && e.key === "Enter") {
      runBlock(currentEditorLine());
      e.preventDefault();
    } else if (e.ctrlKey && e.key.toLowerCase() === "e") {
      runBlock(selectedEditorText());
      e.preventDefault();
    }
  });
}

if (runLineButton) {
  runLineButton.addEventListener("click", () => {
    runBlock(currentEditorLine());
    focusEditor();
  });
}

if (runSelectionButton) {
  runSelectionButton.addEventListener("click", () => {
    runBlock(selectedEditorText());
    focusEditor();
  });
}

if (tabsEl) {
  tabsEl.addEventListener("click", e => {
    if (e.target.closest("[data-new-tab]")) {
      createTab(`scratch-${workspace ? workspace.tabs.length + 1 : 1}.q`, "", false, true);
      setExpandedState(true);
      focusEditor();
      return;
    }
    const close = e.target.closest("[data-close-tab]");
    if (close) {
      e.stopPropagation();
      closeTab(close.dataset.closeTab);
      return;
    }
    const tab = e.target.closest("[data-tab-id]");
    if (tab) selectTab(tab.dataset.tabId);
  });
  tabsEl.addEventListener("dblclick", e => {
    const tab = e.target.closest("[data-tab-id]");
    if (!tab || e.target.closest("[data-close-tab]")) return;
    selectTab(tab.dataset.tabId);
    renameActiveTab();
  });
}

if (exportTabsButton) {
  exportTabsButton.addEventListener("click", exportWorkspace);
}

if (importTabsButton && importTabsInput) {
  importTabsButton.addEventListener("click", () => importTabsInput.click());
  importTabsInput.addEventListener("change", () => {
    const file = importTabsInput.files && importTabsInput.files[0];
    if (file) importWorkspaceFile(file);
    importTabsInput.value = "";
  });
}

editorThemeButtons.forEach(button => {
  button.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("peachq-theme", next);
    renderEditorThemeButton();
    document.querySelectorAll("[data-theme-toggle]").forEach(button => {
      button.textContent = next === "dark" ? "☀ Light" : "◐ Dark";
    });
  });
});

input.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    run(input.value);
    input.value = "";
    e.preventDefault();
  } else if (e.key === "ArrowUp") {
    if (historyIndex > 0) {
      historyIndex -= 1;
      input.value = history[historyIndex];
    }
    e.preventDefault();
  } else if (e.key === "ArrowDown") {
    if (historyIndex < history.length - 1) {
      historyIndex += 1;
      input.value = history[historyIndex];
    } else {
      historyIndex = history.length;
      input.value = "";
    }
    e.preventDefault();
  }
});

exampleButtons.forEach(button => {
  button.addEventListener("click", () => {
    run(button.dataset.example || "");
    input.value = "";
    input.focus();
  });
});

function setExamplesOpen(open) {
  if (!examplesToggle || !examplesMenu) return;
  examplesToggle.setAttribute("aria-expanded", String(open));
  setPopupOpen(examplesToggle, examplesMenu, open, 310);
}

function setOpenMenu(open) {
  if (!openToggle || !openMenu) return;
  openToggle.setAttribute("aria-expanded", String(open));
  setPopupOpen(openToggle, openMenu, open, 240);
}

function clearPopupPlacement(menu) {
  menu.style.position = "";
  menu.style.inset = "";
  menu.style.left = "";
  menu.style.top = "";
  menu.style.right = "";
  menu.style.bottom = "";
  menu.style.width = "";
  menu.style.maxHeight = "";
  menu.style.visibility = "";
}

function placePopup(toggle, menu, preferredWidth = 310) {
  const margin = 12;
  const gap = 8;
  const rect = toggle.getBoundingClientRect();
  const width = Math.max(220, Math.min(preferredWidth, window.innerWidth - margin * 2));
  const left = Math.min(Math.max(margin, rect.left), window.innerWidth - margin - width);
  const spaceBelow = window.innerHeight - rect.bottom - gap - margin;
  const spaceAbove = rect.top - gap - margin;
  const naturalHeight = menu.scrollHeight || 260;
  const openBelow = spaceBelow >= Math.min(naturalHeight, 300) || spaceBelow >= spaceAbove;
  const availableHeight = Math.max(150, openBelow ? spaceBelow : spaceAbove);
  const height = Math.min(520, availableHeight);
  const top = openBelow
    ? rect.bottom + gap
    : Math.max(margin, rect.top - gap - Math.min(naturalHeight, height));

  menu.style.position = "fixed";
  menu.style.inset = "auto";
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.style.right = "auto";
  menu.style.bottom = "auto";
  menu.style.width = `${width}px`;
  menu.style.maxHeight = `${height}px`;
}

function setPopupOpen(toggle, menu, open, preferredWidth) {
  if (!open) {
    menu.hidden = true;
    clearPopupPlacement(menu);
    return;
  }
  menu.hidden = false;
  menu.style.visibility = "hidden";
  placePopup(toggle, menu, preferredWidth);
  window.requestAnimationFrame(() => {
    if (!menu.hidden) menu.style.visibility = "";
  });
}

function repositionOpenPopups() {
  if (examplesToggle && examplesMenu && !examplesMenu.hidden) placePopup(examplesToggle, examplesMenu, 310);
  if (openToggle && openMenu && !openMenu.hidden) placePopup(openToggle, openMenu, 240);
}

if (examplesToggle && examplesMenu) {
  examplesToggle.addEventListener("click", e => {
    e.stopPropagation();
    setExamplesOpen(examplesToggle.getAttribute("aria-expanded") !== "true");
  });

  richExampleButtons.forEach(button => {
    button.addEventListener("click", () => {
      run(button.dataset.richExample || "");
      setExamplesOpen(false);
      input.value = "";
      input.focus();
    });
  });
  document.addEventListener("click", e => {
    if (!examplesMenu.hidden && !examplesMenu.contains(e.target) && !examplesToggle.contains(e.target)) {
      setExamplesOpen(false);
    }
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      setExamplesOpen(false);
    }
  });
} else {
  richExampleButtons.forEach(button => {
    button.addEventListener("click", () => {
      run(button.dataset.richExample || "");
      input.value = "";
      input.focus();
    });
  });
}

if (openToggle && openMenu) {
  openToggle.addEventListener("click", e => {
    e.stopPropagation();
    setOpenMenu(openToggle.getAttribute("aria-expanded") !== "true");
  });
  editorExampleButtons.forEach(button => {
    button.addEventListener("click", async () => {
      try {
        await loadEditorExample(button.dataset.editorExample || "");
        setOpenMenu(false);
      } catch (_err) {
        showToast("Example failed to load");
      }
    });
  });
  document.addEventListener("click", e => {
    if (!openMenu.hidden && !openMenu.contains(e.target) && !openToggle.contains(e.target)) {
      setOpenMenu(false);
    }
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") setOpenMenu(false);
  });
}

window.addEventListener("resize", repositionOpenPopups);
window.addEventListener("scroll", repositionOpenPopups, true);

restoreState();
restoreEditor();
renderEditorThemeButton();
initCodeMirror();
restoreExpandedState();
loadRuntime();
