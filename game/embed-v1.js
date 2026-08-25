(function () {
  'use strict';
  const CHANNEL = 'mneforum.game';
  const STORAGE_KEY = 'mneforum:buzz-to-bloom:v1';
  const SUBMITTED_KEY = 'mneforum:buzz-to-bloom:submitted-runs:v1';
  const FORM_ACTION = 'https://docs.google.com/forms/d/e/1FAIpQLSdy6j1jY3j9V9GWVu6tBGgiLcywYRh7usE_ARgmbUt0wZU-nA/formResponse';
  const SHEET_ID = '1MIiMCbrTRRf_oYMa4AjFp9qkv9sycJIFsllxfGfZqWw';
  const SHEET_NAME = 'Form Responses 1';
  const SHEET_CALLBACK = 'BuzzToBloomLeaderboardResponse';
  const SHEET_QUERY = "select C,D,E,F,G,H,J where C is not null and M = 'Yes, publish this run' order by A desc limit 500";
  const FORM_FIELDS = {
    leaderboardName: 'entry.859026358',
    score: 'entry.2020774595',
    blooms: 'entry.1283027792',
    loopMatch: 'entry.763328471',
    bestStreak: 'entry.500050364',
    pace: 'entry.1871953852',
    casePack: 'entry.92678991',
    runId: 'entry.182554224',
    gameVersion: 'entry.968740099',
    endReason: 'entry.979688023',
    consent: 'entry.1908868056'
  };
  const defaultRecord = { schemaVersion: 1, bests: { classic: { score: 0, blooms: 0 }, relaxed: { score: 0, blooms: 0 } }, settings: { mode: 'relaxed', reduceMotion: false, tutorialSeen: false } };
  let record = copyRecord(defaultRecord);
  let frame = null;
  let storageEnabled = true;
  let submissionStorageEnabled = true;
  let resizeFrame = 0;
  let currentPhase = '';
  let leaderboardState = { status: 'loading', entries: [] };
  let leaderboardScript = null;
  let leaderboardCallback = '';
  let leaderboardRequest = 0;
  let leaderboardTimeout = 0;
  const submittedRuns = new Set();

  function copyRecord(value) {
    return {
      schemaVersion: 1,
      bests: {
        classic: { score: value.bests.classic.score, blooms: value.bests.classic.blooms },
        relaxed: { score: value.bests.relaxed.score, blooms: value.bests.relaxed.blooms }
      },
      settings: { mode: value.settings.mode, reduceMotion: value.settings.reduceMotion, tutorialSeen: value.settings.tutorialSeen }
    };
  }
  function normalizeRecord(value) {
    try {
      if (!value || value.schemaVersion !== 1 || !value.bests || !value.settings) return null;
      const normalized = copyRecord(defaultRecord);
      for (const mode of ['classic','relaxed']) {
        const best = value.bests[mode];
        if (!best || !Number.isFinite(best.score) || best.score < 0 || best.score > 100000000 || !Number.isFinite(best.blooms) || best.blooms < 0 || best.blooms > 100000) return null;
        normalized.bests[mode] = { score: Math.floor(best.score), blooms: Math.floor(best.blooms) };
      }
      if (!['classic','relaxed'].includes(value.settings.mode) || typeof value.settings.reduceMotion !== 'boolean' || typeof value.settings.tutorialSeen !== 'boolean') return null;
      normalized.settings = { mode: value.settings.mode, reduceMotion: value.settings.reduceMotion, tutorialSeen: value.settings.tutorialSeen };
      return normalized;
    } catch (_error) { return null; }
  }
  function readStored() {
    if (!storageEnabled) return null;
    try { return normalizeRecord(JSON.parse(localStorage.getItem(STORAGE_KEY))); }
    catch (_error) { storageEnabled = false; return null; }
  }
  function load() {
    const stored = readStored();
    if (stored) record = stored;
    if (!submissionStorageEnabled) return;
    try {
      const values = JSON.parse(localStorage.getItem(SUBMITTED_KEY));
      if (Array.isArray(values)) values.slice(-200).forEach(function (id) { if (typeof id === 'string') submittedRuns.add(id); });
    } catch (_error) { submissionStorageEnabled = false; }
  }
  function persist(value, reset) {
    const incoming = normalizeRecord(value);
    if (!incoming) return;
    if (reset === true) record = incoming;
    else {
      const current = readStored() || record;
      record = copyRecord(incoming);
      for (const mode of ['classic','relaxed']) {
        record.bests[mode].score = Math.max(current.bests[mode].score, incoming.bests[mode].score);
        record.bests[mode].blooms = Math.max(current.bests[mode].blooms, incoming.bests[mode].blooms);
      }
    }
    if (!storageEnabled) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(record)); }
    catch (_error) { storageEnabled = false; }
  }
  function cleanLeaderboardName(value) {
    const cleaned = String(value || '').trim().replace(/\s+/g, ' ');
    if (cleaned.length < 2 || cleaned.length > 20) return '';
    return /^[\p{L}\p{N} ._-]+$/u.test(cleaned) ? cleaned : '';
  }
  function boundedInteger(value, min, max) {
    return Number.isInteger(value) && value >= min && value <= max ? value : null;
  }
  function normalizeLeaderboard(value) {
    if (!value || typeof value !== 'object' || value.consent !== true) return null;
    const normalized = {
      leaderboardName: cleanLeaderboardName(value.leaderboardName),
      score: boundedInteger(value.score, 0, 100000000),
      blooms: boundedInteger(value.blooms, 0, 100000),
      loopMatch: boundedInteger(value.loopMatch, 0, 100),
      bestStreak: boundedInteger(value.bestStreak, 0, 100000),
      pace: value.pace,
      casePack: value.casePack,
      runId: value.runId,
      gameVersion: value.gameVersion,
      endReason: value.endReason,
      consent: 'Yes, publish this run'
    };
    if (!normalized.leaderboardName || normalized.score === null || normalized.blooms === null || normalized.loopMatch === null || normalized.bestStreak === null) return null;
    if (!['Guided pace','Quick challenge'].includes(normalized.pace)) return null;
    if (typeof normalized.casePack !== 'string' || !/^[a-z0-9](?:[a-z0-9-]{0,47}[a-z0-9])?$/.test(normalized.casePack)) return null;
    if (typeof normalized.runId !== 'string' || !/^[A-Za-z0-9-]{8,64}$/.test(normalized.runId)) return null;
    if (normalized.gameVersion !== 'buzz-to-bloom-v2') return null;
    if (!['Trust depleted','Queue full','Player ended run'].includes(normalized.endReason)) return null;
    return normalized;
  }
  function replyLeaderboard(runId, status) {
    if (!frame || !frame.contentWindow) return;
    frame.contentWindow.postMessage({ channel: CHANNEL, version: 1, game: 'buzz-to-bloom', type: 'leaderboard-result', payload: { runId: typeof runId === 'string' ? runId : '', status: status } }, '*');
  }
  function cleanSheetInteger(value, min, max) {
    const number = typeof value === 'number' ? value : Number(String(value || '').replace(/,/g, ''));
    return Number.isFinite(number) && number >= min && number <= max ? Math.floor(number) : null;
  }
  function cleanSheetCell(row, index) {
    const cell = row && Array.isArray(row.c) ? row.c[index] : null;
    return cell && cell.v !== null && cell.v !== undefined ? cell.v : '';
  }
  function normalizeSheetResponse(response) {
    if (!response || response.status !== 'ok' || !response.table || !Array.isArray(response.table.rows)) return null;
    const entries = [];
    response.table.rows.forEach(function (row) {
      const entry = {
        name: cleanLeaderboardName(cleanSheetCell(row, 0)),
        score: cleanSheetInteger(cleanSheetCell(row, 1), 0, 100000000),
        blooms: cleanSheetInteger(cleanSheetCell(row, 2), 0, 100000),
        loopMatch: cleanSheetInteger(cleanSheetCell(row, 3), 0, 100),
        bestStreak: cleanSheetInteger(cleanSheetCell(row, 4), 0, 100000),
        pace: String(cleanSheetCell(row, 5) || ''),
        runId: String(cleanSheetCell(row, 6) || '')
      };
      if (entry.runId.startsWith('AUTOTEST-')) return;
      if (!entry.name || entry.score === null || entry.blooms === null || entry.loopMatch === null || entry.bestStreak === null) return;
      if (!['Guided pace','Quick challenge'].includes(entry.pace) || !/^[A-Za-z0-9-]{8,64}$/.test(entry.runId)) return;
      entries.push(entry);
    });
    entries.sort(function (a, b) { return b.score - a.score || b.blooms - a.blooms || b.loopMatch - a.loopMatch; });
    return entries.slice(0, 20).map(function (entry, index) {
      return { rank: index + 1, name: entry.name, score: entry.score, blooms: entry.blooms, loopMatch: entry.loopMatch, bestStreak: entry.bestStreak, pace: entry.pace };
    });
  }
  function sendLeaderboard() {
    if (!frame || !frame.contentWindow) return;
    frame.contentWindow.postMessage({ channel: CHANNEL, version: 1, game: 'buzz-to-bloom', type: 'leaderboard-data', payload: leaderboardState }, '*');
  }
  function finishLeaderboardLoad(requestId, status, entries) {
    if (requestId !== leaderboardRequest) return;
    leaderboardState = { status: status, entries: entries || [] };
    window.clearTimeout(leaderboardTimeout);
    if (leaderboardScript) { leaderboardScript.remove(); leaderboardScript = null; }
    if (leaderboardCallback) { try { delete window[leaderboardCallback]; } catch (_error) { window[leaderboardCallback] = undefined; } }
    leaderboardCallback = '';
    sendLeaderboard();
  }
  function loadLeaderboard() {
    if (leaderboardScript) leaderboardScript.remove();
    if (leaderboardCallback) { try { delete window[leaderboardCallback]; } catch (_error) { window[leaderboardCallback] = undefined; } }
    window.clearTimeout(leaderboardTimeout);
    leaderboardState = { status: 'loading', entries: leaderboardState.entries };
    sendLeaderboard();
    leaderboardRequest += 1;
    const requestId = leaderboardRequest;
    const callbackName = SHEET_CALLBACK + requestId;
    leaderboardCallback = callbackName;
    window[callbackName] = function (response) {
      const entries = normalizeSheetResponse(response);
      finishLeaderboardLoad(requestId, entries ? 'ready' : 'error', entries || []);
    };
    const script = document.createElement('script');
    const tqx = 'responseHandler:' + callbackName + ';out:json';
    script.src = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq?tqx=' + encodeURIComponent(tqx) + '&sheet=' + encodeURIComponent(SHEET_NAME) + '&tq=' + encodeURIComponent(SHEET_QUERY);
    script.async = true;
    script.referrerPolicy = 'no-referrer';
    script.onerror = function () { finishLeaderboardLoad(requestId, 'error', leaderboardState.entries); };
    leaderboardScript = script;
    document.body.appendChild(script);
    leaderboardTimeout = window.setTimeout(function () { finishLeaderboardLoad(requestId, 'error', leaderboardState.entries); }, 10000);
  }
  function rememberSubmission(runId) {
    submittedRuns.add(runId);
    if (!submissionStorageEnabled) return;
    try { localStorage.setItem(SUBMITTED_KEY, JSON.stringify(Array.from(submittedRuns).slice(-200))); }
    catch (_error) { submissionStorageEnabled = false; }
  }
  function postForm(value) {
    const suffix = value.runId.replace(/[^A-Za-z0-9]/g, '').slice(-18);
    const targetName = 'buzz-leaderboard-' + suffix;
    const sink = document.createElement('iframe');
    sink.name = targetName;
    sink.hidden = true;
    sink.referrerPolicy = 'no-referrer';
    sink.setAttribute('aria-hidden', 'true');
    sink.setAttribute('title', 'Leaderboard submission response');
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = FORM_ACTION;
    form.target = targetName;
    form.hidden = true;
    Object.keys(FORM_FIELDS).forEach(function (key) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = FORM_FIELDS[key];
      input.value = String(value[key]);
      form.appendChild(input);
    });
    document.body.appendChild(sink);
    document.body.appendChild(form);
    form.submit();
    window.setTimeout(function () { form.remove(); sink.remove(); }, 6000);
  }
  function submitLeaderboard(value) {
    const normalized = normalizeLeaderboard(value);
    if (!normalized) { replyLeaderboard(value && value.runId, 'rejected'); return; }
    if (submittedRuns.has(normalized.runId)) { replyLeaderboard(normalized.runId, 'duplicate'); return; }
    try {
      postForm(normalized);
      rememberSubmission(normalized.runId);
      replyLeaderboard(normalized.runId, 'accepted');
    } catch (_error) { replyLeaderboard(normalized.runId, 'failed'); }
  }
  function detectPhase() {
    const selected = document.querySelector('.phase-switch input[name="phase"]:checked');
    const label = selected && selected.closest ? selected.closest('label') : null;
    const fromControl = label && label.textContent ? label.textContent.trim().toLowerCase() : '';
    if (['before','live','after'].includes(fromControl)) return fromControl;
    const preview = new URLSearchParams(location.search).get('phase');
    if (['before','live','after'].includes(preview)) return preview;
    const time = Date.now();
    const start = new Date('2026-09-09T07:30:00+08:00').getTime();
    const end = new Date('2026-09-09T17:30:00+08:00').getTime();
    return time < start ? 'before' : (time < end ? 'live' : 'after');
  }
  function configure() {
    if (!frame || !frame.contentWindow) return;
    frame.contentWindow.postMessage({ channel: CHANNEL, version: 1, game: 'buzz-to-bloom', type: 'configure', payload: { record: copyRecord(record), phase: currentPhase || detectPhase() } }, '*');
  }
  function updateCopy(messagePhase) {
    const copy = {
      before: 'Practice the evidence-to-action loop before Forum day.',
      live: 'Between sessions, keep evidence moving toward accountable action.',
      after: 'The Forum may be over; follow-through continues.'
    };
    const message = copy[messagePhase];
    document.querySelectorAll('[data-game-phase-copy]').forEach(function (node) { if (node.textContent !== message) node.textContent = message; });
  }
  function syncPhase() {
    const next = detectPhase();
    document.documentElement.dataset.forumPhase = next;
    updateCopy(next);
    if (next !== currentPhase) {
      currentPhase = next;
      configure();
    }
  }
  function onFrameLoad() {
    configure();
    sendLeaderboard();
  }
  function bindFrame() {
    const candidate = document.querySelector('iframe[data-buzz-to-bloom]');
    if (candidate === frame) return;
    if (frame) frame.removeEventListener('load', onFrameLoad);
    frame = candidate;
    if (frame) {
      frame.addEventListener('load', onFrameLoad);
      onFrameLoad();
    }
  }
  function handle(event) {
    if (!frame || event.source !== frame.contentWindow) return;
    const data = event.data;
    if (!data || data.channel !== CHANNEL || data.version !== 1 || data.game !== 'buzz-to-bloom' || !['ready','resize','persist','leaderboard-submit','leaderboard-refresh'].includes(data.type) || !data.payload || typeof data.payload !== 'object') return;
    if (data.type === 'ready') { configure(); sendLeaderboard(); }
    else if (data.type === 'persist') persist(data.payload.record, data.payload.reset === true);
    else if (data.type === 'leaderboard-submit') submitLeaderboard(data.payload);
    else if (data.type === 'leaderboard-refresh') loadLeaderboard();
    else if (data.type === 'resize' && Number.isFinite(data.payload.height)) {
      const height = Math.max(480, Math.min(1200, Math.round(data.payload.height)));
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(function () { if (frame && Math.abs(frame.offsetHeight - height) > 4) frame.style.height = height + 'px'; });
    }
  }
  function init() {
    load();
    window.addEventListener('message', handle);
    currentPhase = detectPhase();
    document.documentElement.dataset.forumPhase = currentPhase;
    updateCopy(currentPhase);
    bindFrame();
    loadLeaderboard();
    document.addEventListener('change', function (event) {
      if (event.target && event.target.matches && event.target.matches('.phase-switch input[name="phase"]')) window.setTimeout(syncPhase, 0);
    });
    window.setInterval(syncPhase, 30000);
    new MutationObserver(function () { bindFrame(); syncPhase(); }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['checked'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}());
