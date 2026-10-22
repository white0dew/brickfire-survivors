(function () {
  'use strict';
  function capture(err) {
    window.__BF_ERRORS = window.__BF_ERRORS || [];
    window.__BF_ERRORS.push(String(err && err.stack || err));
  }
  window.addEventListener('error', e => capture(e.error || e.message));
  window.addEventListener('unhandledrejection', e => capture(e.reason));
  function boot() {
    if (!window.BF_GAME) return;
    try { window.BF_GAME.init(); } catch (err) { capture(err); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
