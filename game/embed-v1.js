(function () {
  'use strict';
  const CHANNEL = 'mneforum.game';
  const STORAGE_KEY = 'mneforum:buzz-to-bloom:v1';
  const defaultRecord = { schemaVersion: 1, bests: { classic: { score: 0, blooms: 0 }, relaxed: { score: 0, blooms: 0 } }, settings: { mode: 'classic', reduceMotion: false, tutorialSeen: false } };
  let record = defaultRecord;
  let frame = null;
  let storageEnabled = true;
  let resizeFrame = 0;
  let observer = null;

  function validRecord(value) {
    return !!value && value.schemaVersion === 1 && !!value.bests && !!value.settings && ['classic','relaxed'].every(function (mode) {
      const best = value.bests[mode];
      return best && Number.isFinite(best.score) && best.score >= 0 && best.score <= 100000000 && Number.isFinite(best.blooms) && best.blooms >= 0 && best.blooms <= 100000;
    }) && ['classic','relaxed'].includes(value.settings.mode) && typeof value.settings.reduceMotion === 'boolean' && typeof value.settings.tutorialSeen === 'boolean';
  }
  function phase() {
    const preview = new URLSearchParams(location.search).get('phase');
    if (['before','live','after'].includes(preview)) return preview;
    const time = Date.now();
    const start = new Date('2026-09-09T07:30:00+08:00').getTime();
    const end = new Date('2026-09-09T17:30:00+08:00').getTime();
    return time < start ? 'before' : (time < end ? 'live' : 'after');
  }
  function load() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (validRecord(value)) record = value;
    } catch (_error) { storageEnabled = false; }
  }
  function persist(value) {
    if (!validRecord(value)) return;
    record = JSON.parse(JSON.stringify(value));
    if (!storageEnabled) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(record)); }
    catch (_error) { storageEnabled = false; }
  }
  function configure() {
    if (!frame || !frame.contentWindow) return;
    frame.contentWindow.postMessage({ channel: CHANNEL, version: 1, game: 'buzz-to-bloom', type: 'configure', payload: { record: record, phase: phase() } }, '*');
  }
  function handle(event) {
    if (!frame || event.source !== frame.contentWindow) return;
    const data = event.data;
    if (!data || data.channel !== CHANNEL || data.version !== 1 || data.game !== 'buzz-to-bloom' || !['ready','resize','persist'].includes(data.type) || !data.payload || typeof data.payload !== 'object') return;
    if (data.type === 'ready') configure();
    else if (data.type === 'persist') {
      if (JSON.stringify(data.payload).length <= 2048) persist(data.payload.record);
    } else if (data.type === 'resize' && Number.isFinite(data.payload.height)) {
      const height = Math.max(480, Math.min(1200, Math.round(data.payload.height)));
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(function () { if (Math.abs(frame.offsetHeight - height) > 4) frame.style.height = height + 'px'; });
    }
  }
  function updateCopy() {
    const copy = {
      before: 'Practice the evidence-to-action loop before Forum day.',
      live: 'Between sessions, keep evidence moving toward accountable action.',
      after: 'The Forum may be over; follow-through continues.'
    };
    const message = copy[phase()];
    document.querySelectorAll('[data-game-phase-copy]').forEach(function (node) { if (node.textContent !== message) node.textContent = message; });
  }
  function bindFrame() {
    const candidate = document.querySelector('iframe[data-buzz-to-bloom]');
    if (candidate === frame) return;
    if (frame) frame.removeEventListener('load', configure);
    frame = candidate;
    if (frame) {
      frame.addEventListener('load', configure);
      configure();
    }
  }
  function init() {
    load();
    updateCopy();
    window.addEventListener('message', handle);
    bindFrame();
    observer = new MutationObserver(function () { bindFrame(); updateCopy(); });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}());
