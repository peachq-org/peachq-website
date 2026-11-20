/* Fresh inline sessions use the published engine with a page-cached compiled
 * module. Only compiled code is shared; every worker creates its own instance. */
'use strict';
let engine = null;

// Browser HTTP hooks follow the published worker's synchronous XHR interface.
// q evaluation runs off the page thread, including synchronous HTTP operations.
function xhrFetch(method, url, headers, body) {
  const request = new XMLHttpRequest();
  request.open(method, url, false);
  request.responseType = 'arraybuffer';
  request.timeout = 30000;
  for (const line of headers.split('\r\n')) {
    const colon = line.indexOf(':');
    if (colon <= 0) continue;
    try { request.setRequestHeader(line.slice(0, colon).trim(), line.slice(colon + 1).trim()); }
    catch (_) { /* Browsers control forbidden request headers. */ }
  }
  request.send(body.length ? body : null);
  if (request.status === 0) throw new Error('network error');
  return {status: request.status, statusText: request.statusText,
    headers: request.getAllResponseHeaders(), body: new Uint8Array(request.response || new ArrayBuffer(0))};
}
function syncGet(url, responseType) {
  const request = new XMLHttpRequest();
  request.open('GET', url, false);
  request.responseType = responseType;
  request.send(null);
  if (request.status !== 200) throw new Error(url + ': HTTP ' + request.status);
  return request.response;
}
self.onmessage = async ({data}) => {
  const {id, op} = data;
  try {
    let result;
    if (op === 'start') {
      const runtime = new URL(data.runtime);
      importScripts(...['engine.js', 'peachq.js', 'duck-loader.js'].map(name => new URL(name, runtime).href));
      engine = await PeachQEngine.boot({
        factory: options => createPeachQ({...options, instantiateWasm(imports, receive) {
          const instance = new WebAssembly.Instance(data.module, imports);
          receive(instance, data.module);
          return instance.exports;
        }}),
        fetch: xhrFetch,
        locateFile: name => new URL(name, runtime).href,
        duckLoad: (module, version) => loadDuckSync({
          base: new URL('../duckdb/' + version + '/', runtime).href,
          get: syncGet, hostFS: module.FS, mounts: ['/home', '/tmp'],
        }),
      });
      result = {home: engine.home};
    } else if (op === 'eval' && engine) result = engine.eval(data.src);
    else throw new Error('engine not started or unsupported operation');
    self.postMessage({id, result});
  } catch (error) {
    const message = String(error.message || error);
    self.postMessage({id, error: message,
      fatal: error instanceof WebAssembly.RuntimeError || /^Aborted/.test(message)});
  }
};
