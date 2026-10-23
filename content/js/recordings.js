/* Inline terminal players and article video play buttons. Works with full and instant navigation. */
(() => {
  if (typeof document === 'undefined') return;
  const source = document.currentScript.src;
  const library = new URL('../recordings/player/asciinema-player.min.js', source);
  const stylesheet = new URL('../recordings/player/asciinema-player.css', source);
  const active = new Map();
  let loading;
  function dependencies() {
    if (!loading) loading = Promise.all([
      new Promise((resolve, reject) => {
        const css = document.createElement('link');
        css.rel = 'stylesheet'; css.href = stylesheet;
        css.onload = resolve;
        css.onerror = () => reject(new Error('Player stylesheet could not be loaded'));
        document.head.append(css);
      }),
      new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = library;
        script.onload = resolve;
        script.onerror = () => reject(new Error('Player library could not be loaded'));
        document.head.append(script);
      })
    ]);
    return loading;
  }
  async function initialize(node) {
    if (active.has(node)) return;
    active.set(node, null);
    try {
      const cast = new URL(node.dataset.cast, document.baseURI);
      if (cast.origin !== location.origin) throw new Error('Recording must use this site');
      const [, response] = await Promise.all([dependencies(), fetch(cast.href)]);
      if (!response.ok) throw new Error('Recording could not be loaded');
      const text = await response.text();

      if (!node.isConnected) { active.delete(node); return; }
      node.setAttribute('role', 'region');
      const player = AsciinemaPlayer.create({data: text}, node, {
        fit: 'both', preload: true, theme: 'asciinema',
        terminalFontFamily: 'DejaVu Sans Mono', terminalFontSize: '18px',
        terminalLineHeight: 1.15, idleTimeLimit: 3, controls: true
      });
      active.set(node, player);
      node.peachqPlayer = player;
      const wrapper = node.querySelector('.ap-wrapper');
      wrapper.inert = true;
      const poster = document.createElement('button');
      poster.type = 'button'; poster.className = 'peachq-recording-poster';
      poster.setAttribute('aria-label', 'Play ' + (node.getAttribute('aria-label') || 'terminal recording'));
      const image = document.createElement('img');
      image.src = new URL('intro-frame.png', cast).href;
      image.alt = ''; image.draggable = false;
      image.addEventListener('error', () => { image.remove(); });
      const label = document.createElement('span'); label.textContent = '▶ Play';
      poster.append(image, label);
      let returnFocus = false;
      player.addEventListener('playing', () => {
        wrapper.inert = false;
        const focus = returnFocus && (document.activeElement === poster || document.activeElement === document.body);
        poster.remove();
        if (focus) { wrapper.tabIndex = 0; wrapper.focus({preventScroll: true}); }
      });
      poster.addEventListener('click', async () => {
        if (poster.disabled) return;
        returnFocus = document.activeElement === poster;
        poster.disabled = true;
        try { await player.play(); }
        catch { poster.disabled = false; }
      });
      node.append(poster);
    } catch (error) {
      node.dataset.recordingError = 'true';
      const link = document.createElement('a');
      link.href = node.dataset.cast; link.textContent = 'Download the terminal recording';
      node.replaceChildren(document.createTextNode('Playback is unavailable. '), link);
    }
  }
  function overlay(video) {
    if (video.parentElement.classList.contains('peachq-video-frame') || !video.paused || video.played.length) return;
    const frame = document.createElement('div');
    frame.className = 'peachq-video-frame';
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'peachq-video-play';
    button.setAttribute('aria-label', 'Play video');
    video.replaceWith(frame);
    frame.append(button, video);
    video.addEventListener('play', () => { button.remove(); }, {once: true});
    button.addEventListener('click', () => {
      const focus = document.activeElement === button;
      button.remove();
      if (focus) video.focus({preventScroll: true});
      video.play().catch(() => {});
    });
  }
  function refresh() {
    document.querySelectorAll('video.peachq-video').forEach(overlay);
    for (const [node, player] of active) {
      if (!node.isConnected) { player?.dispose(); active.delete(node); delete node.peachqPlayer; }
    }
    document.querySelectorAll('.peachq-recording[data-cast]').forEach(initialize);
  }
  refresh();
  if (typeof document$ !== 'undefined') document$.subscribe(refresh);
  new MutationObserver(changes => {
    const changedMarkers = changes.some(change => [...change.addedNodes, ...change.removedNodes]
      .some(node => node.nodeType === 1 && (node.matches('.peachq-recording, .peachq-video') || node.querySelector('.peachq-recording, .peachq-video'))));
    if (changedMarkers) refresh();
  }).observe(document.body, {childList: true, subtree: true});
})();
