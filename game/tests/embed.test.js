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
const submittedForms = [];
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
function createNode(tagName) {
  return {
    tagName,
    children: [],
    hidden: false,
    appendChild(child) { this.children.push(child); return child; },
    setAttribute(name, value) { this[name] = value; },
    submit() { submittedForms.push(this); },
    remove() { this.removed = true; }
  };
}
const document = {
  readyState: 'complete',
  body: { children: [], appendChild(child) { this.children.push(child); return child; } },
  documentElement: { dataset: {} },
  createElement: createNode,
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

const leaderboardRun = {
  leaderboardName: 'ME Player 7', score: 12345, blooms: 3, loopMatch: 88, bestStreak: 7,
  pace: 'Guided pace', casePack: 'philippines-v1', runId: 'RUN-TEST-123',
  gameVersion: 'buzz-to-bloom-v2', endReason: 'Trust depleted', consent: true
};
send({}, 'leaderboard-submit', leaderboardRun);
assert.equal(submittedForms.length, 0, 'wrong source cannot submit');
send(frameWindow, 'leaderboard-submit', leaderboardRun);
assert.equal(submittedForms.length, 1);
assert.equal(submittedForms[0].action, 'https://docs.google.com/forms/d/e/1FAIpQLSdy6j1jY3j9V9GWVu6tBGgiLcywYRh7usE_ARgmbUt0wZU-nA/formResponse');
const submittedFields = Object.fromEntries(submittedForms[0].children.map(input => [input.name, input.value]));
assert.equal(submittedFields['entry.859026358'], 'ME Player 7');
assert.equal(submittedFields['entry.2020774595'], '12345');
assert.equal(submittedFields['entry.1908868056'], 'Yes, publish this run');
assert.equal(frameWindow.messages.at(-1).message.payload.status, 'accepted');
send(frameWindow, 'leaderboard-submit', leaderboardRun);
assert.equal(submittedForms.length, 1, 'duplicate run cannot submit twice');
assert.equal(frameWindow.messages.at(-1).message.payload.status, 'duplicate');
send(frameWindow, 'leaderboard-submit', Object.assign({}, leaderboardRun, { runId: 'RUN-BAD-123', score: '12345' }));
assert.equal(submittedForms.length, 1, 'invalid score type cannot submit');
assert.equal(frameWindow.messages.at(-1).message.payload.status, 'rejected');

console.log('ok - embed bridge rejects wrong sources and clamps resize');
console.log('ok - embed bridge reconfigures live phase changes');
console.log('ok - embed persistence is monotonic and reset-aware');
console.log('ok - leaderboard bridge validates, maps, and deduplicates Google Form submissions');
