// Keep the API navigation usable on small screens without a second theme runtime.
document.querySelectorAll('[data-api-menu]').forEach(button => {
  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('api-nav-open', open);
  });
});

// The local HTTP preview needs a fallback when the Clipboard API is unavailable.
async function copyExample(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (_) { /* Try the user-initiated copy fallback below. */ }
  }
  const field = document.createElement('textarea');
  field.value = text;
  field.style.cssText = 'position:fixed;top:0;left:-9999px';
  field.setAttribute('readonly', '');
  const focused = document.activeElement;
  document.body.appendChild(field);
  try {
    field.select();
    if (!document.execCommand('copy')) throw new Error('Copy unavailable');
  } finally {
    field.remove();
    if (focused) focused.focus({ preventScroll: true });
  }
}

document.querySelectorAll('[data-copy-example]').forEach(button => {
  let reset;
  button.addEventListener('click', async () => {
    const example = button.closest('.qd-example');
    const status = example.querySelector('.qd-copy-status');
    clearTimeout(reset);
    button.disabled = true;
    status.textContent = '';
    try {
      await copyExample(example.querySelector('code').textContent);
      button.textContent = 'Copied';
      status.textContent = 'Example copied to clipboard.';
    } catch (_) {
      button.textContent = 'Copy';
      status.textContent = 'Copy failed. Select the code and copy it manually.';
    } finally {
      button.disabled = false;
      reset = setTimeout(() => { button.textContent = 'Copy'; status.textContent = ''; }, 4000);
    }
  });
});
