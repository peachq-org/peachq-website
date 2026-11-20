/* Opt-in examples share one worker, but never share an executed q context. */
(() => {
  'use strict';
  if (!window.Worker) return; // Keep the static transcript and REPL link.
  const runtime = new URL('../wasm/latest/', document.currentScript.src);
  const workerURL = new URL('inline-q-worker.js', document.currentScript.src);
  let compiled = null;
  const BOOT_TIMEOUT = 45000, RUN_TIMEOUT = 15000, IDLE_TIMEOUT = 60000;
  const OUTPUT_LIMIT = 20000;
  let engine = null, active = null, queue = [], draining = false, idle = null;
  let observer = null, sequence = 0;
  const boxes = new Set();

  // Keep compiled code for this page only. A new instance in every worker still
  // gets fresh memory and q state; reloading the page fetches the current build.
  function compiledModule() {
    if (!compiled) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), BOOT_TIMEOUT);
      const attempt = fetch(new URL('peachq.wasm', runtime), {signal: controller.signal})
        .then(response => {
          if (!response.ok) throw new Error('HTTP ' + response.status);
          return response.arrayBuffer();
        }).then(bytes => WebAssembly.compile(bytes)).catch(error => {
          throw new Error('Could not load the q engine. Reload this page; check that the site serves valid /wasm/latest/ runtime files. ' + error.message);
        }).finally(() => clearTimeout(timer));
      compiled = attempt;
      attempt.catch(() => { if (compiled === attempt) compiled = null; });
    }
    return compiled;
  }

  // Own the worker from construction, including while it is loading. The public
  // client's async start returns too late to cancel an unfinished prewarm.
  function createEngine() {
    const worker = new Worker(workerURL);
    const pending = new Map();
    let stopped = false;
    const stop = (reason = new Error('Cancelled')) => {
      if (stopped) return;
      stopped = true;
      worker.terminate();
      for (const {reject, timer} of pending.values()) {
        clearTimeout(timer);
        reject(reason);
      }
      pending.clear();
    };
    worker.onmessage = ({data}) => {
      const item = pending.get(data.id);
      if (!item) return;
      pending.delete(data.id);
      clearTimeout(item.timer);
      if (data.error !== undefined) item.reject(new Error(data.error));
      else item.resolve(data.result);
      if (data.fatal) stop(new Error(data.error));
    };
    worker.onerror = event => {
      event.preventDefault();
      stop(new Error('Could not load the q engine. Reload this page. If it still fails, the site must provide its /wasm/latest/ runtime files.'));
    };
    const call = (op, values, timeout) => new Promise((resolve, reject) => {
      if (stopped) { reject(new Error('Cancelled')); return; }
      const id = ++sequence;
      const timer = setTimeout(() => stop(new Error('Timed out. Edit the example or try Run again.')), timeout);
      pending.set(id, {resolve, reject, timer});
      worker.postMessage({id, op, ...values});
    });
    const ready = compiledModule().then(module => call('start', {module, runtime: runtime.href}, BOOT_TIMEOUT));
    // Prewarming failures stay quiet until Run; the next attempt starts anew.
    ready.catch(() => { instance.stop(); if (engine === instance) engine = null; });
    const instance = {ready, stop, eval: src => call('eval', {src}, RUN_TIMEOUT)};
    return instance;
  }
  function release() {
    clearTimeout(idle);
    if (engine) engine.stop();
    engine = null;
  }
  function prepare() {
    clearTimeout(idle);
    if (!engine) engine = createEngine();
    if (!active) idle = setTimeout(release, IDLE_TIMEOUT);
    return engine;
  }
  function state(box, label, kind = '') {
    box.status.textContent = label;
    box.node.dataset.state = kind;
  }
  function valid(job) { return job.box.version === job.version && job.box.node.isConnected; }
  async function drain() {
    if (draining) return;
    draining = true;
    try {
      while (queue.length) {
        const job = queue.shift(), box = job.box;
        if (!valid(job)) continue;
        active = job;
        try {
          state(box, 'Preparing…');
          const current = prepare();
          await current.ready;
          if (!valid(job)) continue;
          state(box, 'Running…');
          let output = '';
          for (const line of job.code.split(/\r?\n/)) {
            if (!line.trim()) continue;
            const result = await current.eval(line);
            if (!valid(job)) break;
            output += [result.out, result.err].filter(Boolean).join('\n');
            if (result.out || result.err) output += '\n';
            if (output.length > OUTPUT_LIMIT) {
              output = output.slice(0, OUTPUT_LIMIT) + '\n[Output truncated]\n';
              break;
            }
            if (result.err) { state(box, 'Error', 'error'); break; }
          }
          if (valid(job)) {
            box.output.textContent = output.trimEnd() || '(No output)';
            box.output.hidden = false;
            if (box.node.dataset.state !== 'error') state(box, 'Done');
          }
        } catch (error) {
          if (valid(job)) {
            box.output.textContent = error.message;
            box.output.hidden = false;
            state(box, 'Error', 'error');
          }
        } finally {
          release(); // Executed code can never reach another box or rerun.
          if (valid(job)) {
            box.run.disabled = false;
            if (job.restoreFocus && document.activeElement === document.body) box.run.focus({preventScroll: true});
          }
          active = null;
        }
      }
    } finally { draining = false; }
  }
  function cancel(box) {
    box.version++;
    queue = queue.filter(job => job.box !== box);
    if (active?.box === box) release();
    box.run.disabled = false;
  }
  function enhance(node, index) {
    const label = `Example ${index + 1}: ${node.dataset.title}`;
    node.setAttribute('role', 'group');
    node.setAttribute('aria-label', label);
    const original = node.dataset.code;
    const editor = document.createElement('textarea');
    editor.value = original;
    editor.rows = Math.max(1, Math.min(12, original.split('\n').length));
    editor.spellcheck = false;
    editor.setAttribute('autocapitalize', 'off');
    editor.setAttribute('autocomplete', 'off');
    editor.setAttribute('autocorrect', 'off');
    editor.setAttribute('aria-label', label + ' q code');
    const controls = document.createElement('div');
    controls.className = 'peachq-inline-controls';
    const run = document.createElement('button'), reset = document.createElement('button');
    run.type = reset.type = 'button';
    run.innerHTML = '<svg class="peachq-inline-play" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5v14l11-7z"/></svg><span>Run</span>';
    reset.textContent = 'Reset';
    run.setAttribute('aria-label', 'Run ' + label);
    reset.setAttribute('aria-label', 'Reset ' + label);
    const status = document.createElement('span');
    status.className = 'peachq-inline-status'; status.setAttribute('role', 'status');
    const output = document.createElement('pre');
    output.className = 'peachq-inline-output'; output.hidden = true;
    output.setAttribute('role', 'region');
    output.setAttribute('aria-label', label + ' q output'); output.tabIndex = 0;
    const box = {node, editor, run, output, status, version: 0};
    run.onclick = event => {
      if (run.disabled) return;
      const restoreFocus = event.detail === 0 && document.activeElement === run;
      run.disabled = true; // Before any asynchronous loading or queue work.
      output.hidden = true; output.textContent = '';
      state(box, active ? 'Queued…' : 'Preparing…');
      queue.push({box, version: box.version, code: editor.value, restoreFocus});
      void drain();
    };
    reset.onclick = () => {
      cancel(box); editor.value = original; output.textContent = ''; output.hidden = true;
      state(box, '');
    };
    controls.append(run, reset, status);
    node.replaceChildren(editor, controls, output);
    node.classList.add('is-ready'); boxes.add(box);
  }
  function init() {
    document.querySelectorAll('.peachq-inline').forEach((node, index) => {
      if (!node.classList.contains('is-ready')) enhance(node, index);
    });
    for (const box of boxes) if (!box.node.isConnected) { cancel(box); boxes.delete(box); }
    if (observer) observer.disconnect();
    if (!boxes.size) { release(); return; }
    const first = boxes.values().next().value.node;
    if (!window.IntersectionObserver) return; // Run still starts on demand.
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect();
        if (!active && !queue.length) prepare();
      }
    }, {rootMargin: '400px'});
    observer.observe(first);
  }
  window.addEventListener('pagehide', () => {
    observer?.disconnect();
    for (const box of boxes) { cancel(box); state(box, ''); }
    release();
  });
  window.addEventListener('pageshow', init);
  if (window.document$) window.document$.subscribe(init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
