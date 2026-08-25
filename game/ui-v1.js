(function () {
  'use strict';

  const CHANNEL = 'mneforum.game';
  const STORAGE_KEY = 'mneforum:buzz-to-bloom:v1';
  const params = new URLSearchParams(location.search);
  const qaMode = params.get('qa') === '1';
  const parsedSeed = Number(params.get('seed'));
  const seed = Number.isFinite(parsedSeed) && parsedSeed >= 0 ? parsedSeed >>> 0 : Math.floor(Math.random() * 0xffffffff);
  const embedded = params.get('embed') === '1' || window.parent !== window;
  const defaultRecord = { schemaVersion: 1, bests: { classic: { score: 0, blooms: 0 }, relaxed: { score: 0, blooms: 0 } }, settings: { mode: 'classic', reduceMotion: false, tutorialSeen: false } };
  let record = clone(defaultRecord);
  let storageEnabled = !embedded;
  let phase = getPhase();
  let engine;
  let raf = 0;
  let feedbackTimer = 0;
  let countdownTimer = 0;
  let pendingMode = 'classic';
  let currentPanel = 'menu-panel';

  const el = {};
  const ids = ['menu-panel','tutorial-panel','play-panel','pause-panel','pause-title','countdown-panel','results-panel','error-panel','phase-copy','start-form','menu-best','menu-blooms','how-button','motion-toggle','tutorial-feedback','tutorial-skip','tutorial-continue','score','trust-text','queue-count','blooms','pause-button','trust-bar','case-domain','case-stage','case-title','case-signal','timer-bar','timer-text','game-feedback','resume-button','quit-button','countdown-number','end-reason','final-score','final-blooms','final-streak','final-accuracy','final-best','takeaway','again-button','menu-button','error-message','qa-seed'];

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function now() { return performance.now(); }
  function getPhase() {
    const override = params.get('phase');
    if (['before','live','after'].includes(override)) return override;
    const time = Date.now();
    const start = new Date('2026-09-09T07:30:00+08:00').getTime();
    const end = new Date('2026-09-09T17:30:00+08:00').getTime();
    return time < start ? 'before' : (time < end ? 'live' : 'after');
  }
  function validRecord(value) {
    if (!value || value.schemaVersion !== 1 || !value.bests || !value.settings) return false;
    return ['classic','relaxed'].every(function (mode) {
      const best = value.bests[mode];
      return best && Number.isFinite(best.score) && best.score >= 0 && Number.isFinite(best.blooms) && best.blooms >= 0;
    }) && ['classic','relaxed'].includes(value.settings.mode) && typeof value.settings.reduceMotion === 'boolean' && typeof value.settings.tutorialSeen === 'boolean';
  }
  function mergeRecord(value) {
    if (!validRecord(value)) return;
    record = clone(value);
    syncSettings();
    updateBestLine();
  }
  function readRecord() {
    if (!storageEnabled) return;
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (validRecord(parsed)) record = parsed;
    } catch (_error) { storageEnabled = false; }
  }
  function persist() {
    if (qaMode) return;
    if (storageEnabled) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(record)); return; }
      catch (_error) { storageEnabled = false; }
    }
    if (embedded) post('persist', { record: record });
  }
  function post(type, payload) {
    if (!embedded) return;
    window.parent.postMessage({ channel: CHANNEL, version: 1, game: 'buzz-to-bloom', type: type, payload: payload || {} }, '*');
  }
  function announceHeight() {
    const height = Math.ceil(Math.max(document.body.scrollHeight, document.documentElement.scrollHeight));
    post('resize', { height: Math.max(480, Math.min(1200, height)) });
  }
  function updatePhaseCopy() {
    const copy = {
      before: 'Practice the evidence-to-action loop before Forum day.',
      live: 'Between sessions, keep evidence moving toward accountable action.',
      after: 'The Forum may be over; follow-through continues.'
    };
    el['phase-copy'].textContent = copy[phase];
  }
  function syncSettings() {
    pendingMode = record.settings.mode;
    const modeInput = document.querySelector('input[name="mode"][value="' + pendingMode + '"]');
    if (modeInput) modeInput.checked = true;
    document.documentElement.classList.toggle('reduce-motion', record.settings.reduceMotion);
    el['motion-toggle'].setAttribute('aria-pressed', String(record.settings.reduceMotion));
    el['motion-toggle'].textContent = record.settings.reduceMotion ? 'Use standard motion' : 'Reduce motion';
  }
  function updateBestLine() {
    const mode = document.querySelector('input[name="mode"]:checked');
    const key = mode ? mode.value : pendingMode;
    el['menu-best'].textContent = String(record.bests[key].score);
    el['menu-blooms'].textContent = String(record.bests[key].blooms);
  }
  function showPanel(id) {
    ['menu-panel','tutorial-panel','play-panel','pause-panel','countdown-panel','results-panel','error-panel'].forEach(function (panelId) { el[panelId].hidden = panelId !== id; });
    currentPanel = id;
    requestAnimationFrame(announceHeight);
  }
  function setButtonsDisabled(disabled) {
    document.querySelectorAll('#action-buttons button').forEach(button => { button.disabled = disabled; });
  }
  function startCountdown(callback) {
    clearInterval(countdownTimer);
    showPanel('countdown-panel');
    let count = 3;
    el['countdown-number'].textContent = String(count);
    countdownTimer = window.setInterval(function () {
      count -= 1;
      if (count > 0) { el['countdown-number'].textContent = String(count); return; }
      clearInterval(countdownTimer);
      callback();
    }, 700);
  }
  function beginRun() {
    engine = new BuzzGame.GameEngine({ content: BuzzContent, clock: now, seed: seed });
    if (!engine.validation.valid) {
      el['error-message'].textContent = engine.validation.errors.join(' ');
      showPanel('error-panel');
      return;
    }
    engine.start(pendingMode, now());
    record.settings.mode = pendingMode;
    persist();
    showPanel('play-panel');
    render(engine.snapshot(now()));
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
    document.querySelector('#action-buttons button').focus();
  }
  function frame(timestamp) {
    const snapshot = engine.tick(timestamp);
    render(snapshot);
    if (snapshot.resolution && snapshot.resolution.timeout) {
      const name = snapshot.resolution.expected.charAt(0).toUpperCase() + snapshot.resolution.expected.slice(1);
      el['game-feedback'].className = 'feedback game-feedback is-wrong';
      el['game-feedback'].textContent = 'Time. The next step was ' + name + '. ' + snapshot.resolution.rationale;
    }
    if (snapshot.state === 'playing') raf = requestAnimationFrame(frame);
    else if (snapshot.state === 'results') showResults(snapshot);
  }
  function render(snapshot) {
    el.score.textContent = String(snapshot.score);
    el['trust-text'].textContent = String(snapshot.trust);
    el['queue-count'].textContent = snapshot.queueLength + ' / ' + snapshot.queueCap;
    el.blooms.textContent = String(snapshot.blooms);
    el['trust-bar'].style.transform = 'scaleX(' + (snapshot.trust / 100) + ')';
    el['trust-bar'].parentElement.setAttribute('aria-valuenow', String(snapshot.trust));
    const card = snapshot.currentCard;
    if (card) {
      el['case-domain'].textContent = card.domain;
      el['case-stage'].textContent = 'Step ' + (card.stageIndex + 1) + ' of 4';
      el['case-title'].textContent = card.title;
      el['case-signal'].textContent = card.signal;
    }
    const ratio = snapshot.decisionWindow ? Math.max(0, Math.min(1, snapshot.timeRemaining / snapshot.decisionWindow)) : 0;
    el['timer-bar'].style.transform = 'scaleX(' + ratio + ')';
    el['timer-text'].textContent = Math.ceil(snapshot.timeRemaining / 1000) + ' seconds remaining';
  }
  function choose(action) {
    if (!engine || engine.state !== 'playing') return;
    setButtonsDisabled(true);
    const result = engine.answer(action, now(), false);
    if (!result.accepted) return;
    const name = result.expected.charAt(0).toUpperCase() + result.expected.slice(1);
    el['game-feedback'].className = 'feedback game-feedback ' + (result.correct ? 'is-correct' : 'is-wrong');
    el['game-feedback'].textContent = result.correct
      ? 'Right: ' + name + '. +' + result.points + ' points. ' + (result.bloomed ? 'Case bloomed! ' : '') + result.rationale
      : 'Try ' + name + ' next time. ' + result.rationale;
    render(result.snapshot);
    clearTimeout(feedbackTimer);
    feedbackTimer = window.setTimeout(function () {
      setButtonsDisabled(false);
      el['game-feedback'].className = 'feedback game-feedback';
      el['game-feedback'].textContent = '';
      if (engine.state === 'results') showResults(engine.snapshot(now()));
    }, record.settings.reduceMotion ? 100 : 520);
  }
  function pause(auto) {
    if (!engine || !engine.pause(now())) return;
    cancelAnimationFrame(raf);
    showPanel('pause-panel');
    el['pause-button'].setAttribute('aria-pressed', 'true');
    if (auto) el['pause-title'].textContent = 'The challenge paused while this page was away.';
    else el['pause-title'].textContent = 'Evidence can wait. Your timer has stopped.';
    el['resume-button'].focus();
  }
  function resume() {
    if (!engine || engine.state !== 'paused') return;
    startCountdown(function () {
      engine.resume(now());
      el['pause-button'].setAttribute('aria-pressed', 'false');
      showPanel('play-panel');
      render(engine.snapshot(now()));
      raf = requestAnimationFrame(frame);
      el['pause-button'].focus();
    });
  }
  function showResults(snapshot) {
    cancelAnimationFrame(raf);
    const reasonCopy = { trust: 'Trust reached zero. Slow down, verify, and bring people into the next decision.', overload: 'The evidence queue filled up. Prioritize the next accountable step before adding more.', quit: 'You ended this run. The evidence-to-action loop is ready when you are.' };
    const previous = record.bests[snapshot.mode];
    previous.score = Math.max(previous.score, snapshot.score);
    previous.blooms = Math.max(previous.blooms, snapshot.blooms);
    persist();
    el['end-reason'].textContent = reasonCopy[snapshot.endReason] || 'Every completed loop turns a signal into learning for the next decision.';
    el['final-score'].textContent = String(snapshot.score);
    el['final-blooms'].textContent = String(snapshot.blooms);
    el['final-streak'].textContent = String(snapshot.bestStreak);
    el['final-accuracy'].textContent = Math.round(snapshot.accuracy * 100) + '%';
    el['final-best'].textContent = String(previous.score);
    el.takeaway.textContent = snapshot.blooms
      ? 'Takeaway: action is not the finish line. Track results, notice uneven effects, and adapt.'
      : 'Takeaway: credible action starts by checking the signal, then connecting it to context and people.';
    showPanel('results-panel');
    el['again-button'].focus();
  }
  function openTutorial() {
    showPanel('tutorial-panel');
    el['tutorial-feedback'].className = 'feedback';
    el['tutorial-feedback'].textContent = 'Choose the step that verifies the first signal.';
    el['tutorial-continue'].hidden = true;
    document.querySelector('[data-tutorial-action="check"]').focus();
  }
  function finishTutorial() {
    record.settings.tutorialSeen = true;
    persist();
    startCountdown(beginRun);
  }
  function handleMessage(event) {
    if (event.source !== window.parent) return;
    const data = event.data;
    if (!data || data.channel !== CHANNEL || data.version !== 1 || data.game !== 'buzz-to-bloom' || data.type !== 'configure' || !data.payload || typeof data.payload !== 'object') return;
    if (validRecord(data.payload.record)) mergeRecord(data.payload.record);
    if (['before','live','after'].includes(data.payload.phase)) { phase = data.payload.phase; updatePhaseCopy(); }
  }

  function init() {
    ids.forEach(function (id) { el[id] = document.getElementById(id); });
    if (!el['start-form'] || !window.BuzzGame || !window.BuzzContent) return;
    readRecord();
    syncSettings();
    updatePhaseCopy();
    updateBestLine();
    engine = new BuzzGame.GameEngine({ content: BuzzContent, clock: now, seed: seed });
    if (!engine.validation.valid) {
      el['error-message'].textContent = engine.validation.errors.join(' ');
      showPanel('error-panel');
    }
    if (qaMode) {
      el['qa-seed'].hidden = false;
      el['qa-seed'].textContent = 'QA mode · seed ' + seed + ' · persistence disabled';
    }
    el['start-form'].addEventListener('submit', function (event) {
      event.preventDefault();
      pendingMode = new FormData(event.currentTarget).get('mode') || 'classic';
      if (!record.settings.tutorialSeen) openTutorial(); else startCountdown(beginRun);
    });
    document.querySelectorAll('input[name="mode"]').forEach(input => input.addEventListener('change', function () { pendingMode = input.value; updateBestLine(); }));
    el['how-button'].addEventListener('click', openTutorial);
    el['tutorial-skip'].addEventListener('click', finishTutorial);
    el['tutorial-continue'].addEventListener('click', finishTutorial);
    document.querySelectorAll('[data-tutorial-action]').forEach(function (button) {
      button.addEventListener('click', function () {
        const correct = button.dataset.tutorialAction === 'check';
        el['tutorial-feedback'].className = 'feedback ' + (correct ? 'is-correct' : 'is-wrong');
        el['tutorial-feedback'].textContent = correct ? 'Exactly. Check the source and coverage before interpreting the signal.' : 'That step comes later. First, check whether the signal is credible.';
        el['tutorial-continue'].hidden = !correct;
        if (correct) el['tutorial-continue'].focus();
      });
    });
    document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', function () { choose(button.dataset.action); }));
    el['pause-button'].addEventListener('click', function () { pause(false); });
    el['resume-button'].addEventListener('click', resume);
    el['quit-button'].addEventListener('click', function () { engine.finish('quit', now()); showResults(engine.snapshot(now())); });
    el['again-button'].addEventListener('click', function () { startCountdown(beginRun); });
    el['menu-button'].addEventListener('click', function () { showPanel('menu-panel'); updateBestLine(); el['start-form'].querySelector('button[type="submit"]').focus(); });
    el['motion-toggle'].addEventListener('click', function () { record.settings.reduceMotion = !record.settings.reduceMotion; syncSettings(); persist(); });
    window.addEventListener('keydown', function (event) {
      if (event.repeat || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
      if (engine && engine.state === 'playing' && ['1','2','3','4'].includes(event.key)) { event.preventDefault(); choose(BuzzGame.ACTIONS[Number(event.key) - 1]); }
      else if ((event.key === 'p' || event.key === 'P' || event.key === 'Escape') && engine && engine.state === 'playing') { event.preventDefault(); pause(false); }
      else if ((event.key === 'p' || event.key === 'P' || event.key === 'Enter') && engine && engine.state === 'paused') { event.preventDefault(); resume(); }
      else if (event.key === 'Enter' && currentPanel === 'menu-panel') { /* native submit handles focused controls */ }
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden && engine && engine.state === 'playing') pause(true); });
    window.addEventListener('blur', function () { if (engine && engine.state === 'playing') pause(true); });
    window.addEventListener('message', handleMessage);
    if ('ResizeObserver' in window) new ResizeObserver(announceHeight).observe(document.body);
    post('ready', { capabilities: ['configure','resize','persist'] });
    announceHeight();
  }

  init();
}());
