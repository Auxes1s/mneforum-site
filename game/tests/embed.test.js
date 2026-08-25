'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '..', 'embed-v1.js'), 'utf8');
const listeners = {};
const stored = new Map();
const highRecord = { schemaVersion: 1, bests: { classic: { score: 900, blooms: 4 }, relaxed: { score: 300, blooms: 2 } }, settings: { mode: 'classic', reduceMotion: false, tutorialSeen: true } };
stored.set('mneforum:buzz-to-bloom:v1', JSON.stringify(highRecord));
let selectedPhase = 'before';
let mutationCallback = null;
const copyNode = { textContent: '' };
const frameWindow = { messages: [], postMessage(message, target) { this.messages.push({ message, target }); } };
const frame = {
  contentWindow: frameWindow,
  offsetHeight: 600,
  style: {},
  addEventListener() {},
  removeEventListener() {}
};
const phaseInput = { closest() { return { textContent: selectedPhase }; } };
const document = {
  readyState: 'complete',
  body: {},
  documentElement: { dataset: {} },
  querySelector(selector) {
    if (selector === 'iframe[data-buzz-to-bloom]') return frame;
    if (selector === '.phase-switch input[name="phase"]:checked') return phaseInput;
    return null;
  },
  querySelectorAll(selector) { return selector === '[data-game-phase-copy]' ? [copyNode] : []; },
  addEventListener() {}
};
const context = {
  console,
  document,
  location: { search: '?phase=before' },
  URLSearchParams,
  Date,
  Number,
  Math,
  JSON,
  localStorage: {
    getItem(key) { return stored.has(key) ? stored.get(key) : null; },
    setItem(key, value) { stored.set(key, value); }
  },
  window: { addEventListener(type, handler) { listeners[type] = handler; }, setTimeout(callback) { callback(); }, setInterval() { return 1; } },
  MutationObserver: class { constructor(callback) { mutationCallback = callback; } observe() {} },
  requestAnimationFrame(callback) { callback(); return 1; },
  cancelAnimationFrame() {}
};
context.window.window = context.window;
vm.createContext(context);
new vm.Script(source, { filename: 'embed-v1.js' }).runInContext(context);

function send(sourceWindow, type, payload) {
  listeners.message({ source: sourceWindow, data: { channel: 'mneforum.game', version: 1, game: 'buzz-to-bloom', type, payload } });
}

assert.equal(copyNode.textContent, 'Practice the evidence-to-action loop before Forum day.');
assert.equal(frameWindow.messages.at(-1).message.type, 'configure');

selectedPhase = 'live';
mutationCallback();
assert.equal(document.documentElement.dataset.forumPhase, 'live');
assert.equal(copyNode.textContent, 'Between sessions, keep evidence moving toward accountable action.');
assert.equal(frameWindow.messages.at(-1).message.payload.phase, 'live');

send({}, 'resize', { height: 9999 });
assert.equal(frame.style.height, undefined, 'wrong source must be ignored');
send(frameWindow, 'resize', { height: 9999 });
assert.equal(frame.style.height, '1200px');

const stale = { schemaVersion: 1, bests: { classic: { score: 100, blooms: 1 }, relaxed: { score: 100, blooms: 1 } }, settings: { mode: 'relaxed', reduceMotion: true, tutorialSeen: true } };
send(frameWindow, 'persist', { record: stale });
let saved = JSON.parse(stored.get('mneforum:buzz-to-bloom:v1'));
assert.equal(saved.bests.classic.score, 900, 'stale tabs cannot lower a best');
assert.equal(saved.settings.mode, 'relaxed', 'current settings may still update');

send(frameWindow, 'persist', { record: stale, reset: true });
saved = JSON.parse(stored.get('mneforum:buzz-to-bloom:v1'));
assert.equal(saved.bests.classic.score, 100, 'explicit reset may clear a best');

const cyclic = { schemaVersion: 1, bests: stale.bests, settings: stale.settings };
cyclic.self = cyclic;
assert.doesNotThrow(() => send(frameWindow, 'persist', { record: cyclic }));

console.log('ok - embed bridge rejects wrong sources and clamps resize');
console.log('ok - embed bridge reconfigures live phase changes');
console.log('ok - embed persistence is monotonic and reset-aware');
