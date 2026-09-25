/* Keep q punctuation and case intact. Material still owns full-text search. */
(() => {
  const script = document.currentScript;
  const base = new URL('../', script.src);
  const input = document.querySelector('[data-md-component="search-query"]');
  const results = document.querySelector('[data-md-component="search-result"]');
  if (!input || !results) return;

  const section = document.createElement('section');
  section.className = 'md-search-result peachq-search';
  section.hidden = true;
  section.setAttribute('aria-label', 'q reference and API matches');
  const heading = document.createElement('div');
  heading.className = 'md-search-result__meta';
  const list = document.createElement('ol');
  list.className = 'md-search-result__list';
  section.append(heading, list);
  results.before(section);
  let entries = [];
  let loading;

  function render() {
    const query = input.value.trim();
    const exact = entries.filter(entry => entry.name === query);
    // Namespace completion is case sensitive as well (.Q is not .q).
    const matches = exact.length ? exact : query.startsWith('.') && query.length > 1
      ? entries.filter(entry => entry.name.startsWith(query)).slice(0, 12) : [];
    list.replaceChildren();
    section.hidden = matches.length === 0;
    heading.textContent = exact.length ? 'Exact q match' : 'q namespace matches';
    for (const entry of matches) {
      const item = document.createElement('li');
      item.className = 'md-search-result__item';
      const link = document.createElement('a');
      link.className = 'md-search-result__link';
      link.href = new URL(entry.location, base).href;
      const article = document.createElement('article');
      article.className = 'md-search-result__article md-typeset';
      const title = document.createElement('h1');
      title.className = 'md-search-result__title';
      title.textContent = entry.title.startsWith(entry.name)
        ? entry.title : entry.name + ' — ' + entry.title;
      const kind = document.createElement('small');
      kind.textContent = entry.kind;
      const description = document.createElement('p');
      description.className = 'md-search-result__teaser';
      description.textContent = entry.text;
      article.append(title, kind, description);
      link.append(article);
      item.append(link);
      list.append(item);
    }
  }

  function update() {
    render();
    if (!loading) {
      loading = fetch(new URL('search/q_lookup.b9a7f4657304e0ec.json', base))
        .then(response => {
          if (!response.ok) throw new Error('q lookup unavailable');
          return response.json();
        })
        .then(data => { entries = data.entries; render(); })
        // The existing full-text search remains usable on a network failure.
        .catch(() => { loading = undefined; });
    }
  }
  input.addEventListener('input', update);
  input.addEventListener('focus', update);
  input.form.addEventListener('reset', () => {
    section.hidden = true;
    list.replaceChildren();
  });

  // Include the exact matches in keyboard navigation, before prose matches.
  // Intercept only while our section is present; otherwise keep Material's UX.
  input.form.closest('[data-md-component="search"]').addEventListener('keydown', event => {
    if (section.hidden || !['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) return;
    const links = [...section.querySelectorAll('a'), ...results.querySelectorAll('a.md-search-result__link')];
    const current = links.indexOf(document.activeElement);
    if (event.key === 'Enter') {
      if (document.activeElement !== input) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      links[0]?.click();
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    const next = current + (event.key === 'ArrowDown' ? 1 : -1);
    if (next < 0) input.focus();
    else links[Math.min(next, links.length - 1)]?.focus();
  }, true);
  if (input.value) update();
})();
