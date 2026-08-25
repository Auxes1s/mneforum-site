(function () {
  'use strict';

  const CHANNEL = 'mneforum.game';
  const STORAGE_KEY = 'mneforum:buzz-to-bloom:v1';
  const GAME_VERSION = 'buzz-to-bloom-v2';
  const params = new URLSearchParams(location.search);
  const qaMode = params.get('qa') === '1';
  const seedText = params.get('seed');
  const seedNumber = seedText !== null && /^\d+$/.test(seedText) ? Number(seedText) : NaN;
  const qaSeed = qaMode && Number.isSafeInteger(seedNumber) && seedNumber >= 0 && seedNumber <= 0xffffffff ? seedNumber >>> 0 : (qaMode ? 1 : null);
  const embedded = params.get('embed') === '1' || window.parent !== window;
  const defaultRecord = { schemaVersion: 1, bests: { classic: { score: 0, blooms: 0 }, relaxed: { score: 0, blooms: 0 } }, settings: { mode: 'relaxed', reduceMotion: false, tutorialSeen: false } };
  const actionNames = { check: 'Verify', connect: 'Connect', commit: 'Commit', track: 'Track' };
  const actionNeeds = {
    check: 'Verify fits when the source, definition, coverage, or data quality is still uncertain.',
    connect: 'Connect fits after verification, when who is affected, why, or how people interpret the pattern is still unclear.',
    commit: 'Commit fits when the issue is understood but a feasible action, owner, measure, or review point is still missing.',
    track: 'Track fits when an action is already underway and its results, uneven effects, or needed adaptation are still unknown.'
  };
  const tutorialSteps = [
    { action: 'check', signal: 'A community report suggests a health clinic\'s waiting time has doubled.', need: 'What is missing: confidence that the signal is reliable.', cue: 'The report has not yet been verified.', success: 'Verify the source, definitions, and coverage before treating it as a finding.' },
    { action: 'connect', signal: 'The wait-time increase is verified, but no one knows why it differs by shift and patient group.', need: 'What is missing: context about who is affected and why.', cue: 'The pattern is already verified; its meaning is still unclear.', success: 'Connect the pattern with staff and patients to interpret it together.' },
    { action: 'commit', signal: 'Staff and patients understand the bottleneck, but no response, owner, or review date has been agreed.', need: 'What is missing: an accountable response.', cue: 'The issue is understood; ownership and action are still absent.', success: 'Commit to a feasible action with an owner, measure, and review point.' },
    { action: 'track', signal: 'A new intake step is running, but no one has checked its results across shifts and patient groups.', need: 'What is missing: follow-through on an action already underway.', cue: 'Implementation has begun; its results and uneven effects are still unknown.', success: 'Track outcomes, look for uneven effects, and adapt the response.' }
  ];
  let record = copyRecord(defaultRecord);
  let storageEnabled = !embedded;
  let phase = getPhase();
  let engine;
  let raf = 0;
  let countdownTimer = 0;
  let pendingMode = 'relaxed';
  let currentPanel = 'menu-panel';
  let tutorialIndex = 0;
  let tutorialLocked = false;
  let inputLocked = false;
  let reviewing = false;
  let reviewSnapshot = null;
  let resultsSnapshot = null;
  let currentRunId = '';
  let leaderboardSubmitted = false;
  let leaderboardTimer = 0;
  let leaderboardData = { status: 'loading', entries: [] };
  let lastTimerSecond = -1;
  const reduceMedia = window.matchMedia('(prefers-reduced-motion: reduce)');

  const el = {};
  const ids = ['menu-panel','tutorial-panel','tutorial-step-label','tutorial-title','clinic-signal','play-panel','pause-panel','pause-title','countdown-panel','results-panel','results-title','error-panel','phase-copy','pack-name','start-form','start-button','menu-best','menu-blooms','how-button','reset-button','motion-toggle','tutorial-feedback','tutorial-skip','tutorial-continue','score','trust-text','queue-count','blooms','pause-button','trust-bar','case-art','bloom-garden','case-domain','case-stage','case-title','case-signal','timer-bar','timer-text','timer-status','answer-review','review-kicker','review-title','game-feedback','next-case-button','game-status','resume-button','quit-button','countdown-number','end-reason','final-score','final-blooms','final-streak','final-accuracy','final-best','accuracy-check','accuracy-connect','accuracy-commit','accuracy-track','takeaway','leaderboard-card','leaderboard-form','leaderboard-name','leaderboard-consent','leaderboard-submit','leaderboard-status','leaderboard-board','leaderboard-refresh','leaderboard-read-status','leaderboard-table-wrap','leaderboard-rows','again-button','menu-button','error-message','qa-seed'];

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
  function now() { return performance.now(); }
  function randomSeed() {
    if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
      const values = new Uint32Array(1);
      window.crypto.getRandomValues(values);
      return values[0];
    }
    return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
  }
  function makeRunId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return 'run-' + Date.now().toString(36) + '-' + randomSeed().toString(36);
  }
  function normalizeLeaderboardName(value) {
    const cleaned = String(value || '').trim().replace(/\s+/g, ' ');
    if (cleaned.length < 2 || cleaned.length > 20) return '';
    return /^[\p{L}\p{N} ._-]+$/u.test(cleaned) ? cleaned : '';
  }
  function getPhase() {
    const override = params.get('phase');
    if (['before','live','after'].includes(override)) return override;
    const time = Date.now();
    const start = new Date('2026-09-09T07:30:00+08:00').getTime();
    const end = new Date('2026-09-09T17:30:00+08:00').getTime();
    return time < start ? 'before' : (time < end ? 'live' : 'after');
  }
  function readRecord() {
    if (!storageEnabled) return;
    try {
      const normalized = normalizeRecord(JSON.parse(localStorage.getItem(STORAGE_KEY)));
      if (normalized) record = normalized;
    } catch (_error) { storageEnabled = false; }
  }
  function mergeRecord(value) {
    const normalized = normalizeRecord(value);
    if (!normalized) return;
    record = normalized;
    syncSettings();
    updateBestLine();
  }
  function persist(reset) {
    if (qaMode) return;
    if (storageEnabled) {
      try {
        if (reset !== true) {
          const current = normalizeRecord(JSON.parse(localStorage.getItem(STORAGE_KEY)));
          if (current) {
            for (const mode of ['classic','relaxed']) {
              record.bests[mode].score = Math.max(current.bests[mode].score, record.bests[mode].score);
              record.bests[mode].blooms = Math.max(current.bests[mode].blooms, record.bests[mode].blooms);
            }
          }
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
        return;
      }
      catch (_error) { storageEnabled = false; }
    }
    if (embedded) post('persist', { record: record, reset: reset === true });
  }
  function post(type, payload) {
    if (!embedded) return;
    window.parent.postMessage({ channel: CHANNEL, version: 1, game: 'buzz-to-bloom', type: type, payload: payload || {} }, '*');
  }
  function setLeaderboardStatus(message, state) {
    clearTimeout(leaderboardTimer);
    setText(el['leaderboard-status'], message);
    el['leaderboard-status'].className = 'leaderboard-status' + (state ? ' ' + state : '');
  }
  function normalizeLeaderboardData(value) {
    if (!value || !['loading','ready','error'].includes(value.status) || !Array.isArray(value.entries)) return null;
    const entries = [];
    value.entries.slice(0, 20).forEach(function (entry, index) {
      if (!entry || typeof entry !== 'object') return;
      const name = normalizeLeaderboardName(entry.name);
      if (!name || !Number.isInteger(entry.score) || entry.score < 0 || entry.score > 100000000) return;
      if (!Number.isInteger(entry.blooms) || entry.blooms < 0 || entry.blooms > 100000) return;
      if (!Number.isInteger(entry.loopMatch) || entry.loopMatch < 0 || entry.loopMatch > 100) return;
      if (!Number.isInteger(entry.bestStreak) || entry.bestStreak < 0 || entry.bestStreak > 100000) return;
      if (!['Guided pace','Quick challenge'].includes(entry.pace)) return;
      entries.push({ rank: index + 1, name: name, score: entry.score, blooms: entry.blooms, loopMatch: entry.loopMatch, bestStreak: entry.bestStreak, pace: entry.pace });
    });
    return { status: value.status, entries: entries };
  }
  function renderLeaderboard(value) {
    const normalized = normalizeLeaderboardData(value);
    if (normalized) leaderboardData = normalized;
    if (!el['leaderboard-board']) return;
    el['leaderboard-board'].hidden = qaMode || !embedded || currentPanel !== 'results-panel';
    if (el['leaderboard-board'].hidden) return;
    const tbody = el['leaderboard-rows'];
    while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
    leaderboardData.entries.forEach(function (entry) {
      const row = document.createElement('tr');
      [entry.rank, entry.name, entry.score.toLocaleString('en-PH'), entry.blooms, entry.loopMatch + '%', entry.pace].forEach(function (value) {
        const cell = document.createElement('td');
        cell.textContent = String(value);
        row.appendChild(cell);
      });
      tbody.appendChild(row);
    });
    const hasEntries = leaderboardData.entries.length > 0;
    el['leaderboard-table-wrap'].hidden = !hasEntries;
    el['leaderboard-read-status'].hidden = leaderboardData.status === 'ready' && hasEntries;
    el['leaderboard-read-status'].className = 'leaderboard-read-status' + (leaderboardData.status === 'error' ? ' is-error' : '');
    if (leaderboardData.status === 'loading') setText(el['leaderboard-read-status'], hasEntries ? 'Refreshing scores…' : 'Loading scores…');
    else if (leaderboardData.status === 'error') setText(el['leaderboard-read-status'], hasEntries ? 'Could not refresh. Showing the latest scores already loaded.' : 'The leaderboard is temporarily unavailable. Your game still works.');
    else if (!hasEntries) setText(el['leaderboard-read-status'], 'No public scores yet. Be the first to add a run.');
    el['leaderboard-refresh'].disabled = leaderboardData.status === 'loading';
    window.setTimeout(announceHeight, 0);
  }
  function submitLeaderboard() {
    if (!embedded || qaMode || !resultsSnapshot || leaderboardSubmitted) return;
    const name = normalizeLeaderboardName(el['leaderboard-name'].value);
    el['leaderboard-name'].setAttribute('aria-invalid', String(!name));
    if (!name) {
      setLeaderboardStatus('Use a 2–20 character nickname with letters, numbers, spaces, periods, underscores, or hyphens.', 'is-error');
      el['leaderboard-name'].focus();
      return;
    }
    if (!el['leaderboard-consent'].checked) {
      setLeaderboardStatus('Please confirm that this nickname and run may appear on the public leaderboard.', 'is-error');
      el['leaderboard-consent'].focus();
      return;
    }
    el['leaderboard-submit'].disabled = true;
    setLeaderboardStatus('Sending this run…', '');
    const endReasons = { trust: 'Trust depleted', overload: 'Queue full', quit: 'Player ended run' };
    post('leaderboard-submit', {
      leaderboardName: name,
      score: resultsSnapshot.score,
      blooms: resultsSnapshot.blooms,
      loopMatch: Math.round(resultsSnapshot.accuracy * 100),
      bestStreak: resultsSnapshot.bestStreak,
      pace: resultsSnapshot.mode === 'relaxed' ? 'Guided pace' : 'Quick challenge',
      casePack: BuzzContent.packId,
      runId: currentRunId,
      gameVersion: GAME_VERSION,
      endReason: endReasons[resultsSnapshot.endReason] || 'Player ended run',
      consent: true
    });
    leaderboardTimer = window.setTimeout(function () {
      el['leaderboard-submit'].disabled = false;
      setLeaderboardStatus('The leaderboard did not respond. Check your connection and try again.', 'is-error');
    }, 8000);
  }
  function announceHeight() {
    const height = Math.ceil(Math.max(document.body.scrollHeight, document.documentElement.scrollHeight));
    post('resize', { height: Math.max(480, Math.min(3200, height)) });
  }
  function effectiveReducedMotion() { return record.settings.reduceMotion || reduceMedia.matches; }
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
    setText(el['start-button'], record.settings.tutorialSeen ? 'Start the challenge' : 'Learn, then play');
  }
  function updateBestLine() {
    const mode = document.querySelector('input[name="mode"]:checked');
    const key = mode ? mode.value : pendingMode;
    el['menu-best'].textContent = String(record.bests[key].score);
    el['menu-blooms'].textContent = String(record.bests[key].blooms);
  }
  function setText(node, value) { if (node && node.textContent !== String(value)) node.textContent = String(value); }
  function showPanel(id) {
    ['menu-panel','tutorial-panel','play-panel','pause-panel','countdown-panel','results-panel','error-panel'].forEach(function (panelId) { el[panelId].hidden = panelId !== id; });
    currentPanel = id;
    requestAnimationFrame(announceHeight);
  }
  function setButtonsDisabled(disabled) {
    document.querySelectorAll('#action-buttons button').forEach(button => { button.disabled = disabled; });
  }
  function clearActionStates() {
    document.querySelectorAll('#action-buttons button').forEach(function (button) {
      button.classList.remove('is-selected', 'is-answer');
      button.removeAttribute('aria-current');
    });
  }
  function clearReview() {
    reviewing = false;
    reviewSnapshot = null;
    el['play-panel'].classList.remove('is-reviewing');
    el['answer-review'].hidden = true;
    el['answer-review'].className = 'answer-review';
    el['pause-button'].disabled = false;
    clearActionStates();
  }
  function startCountdown(callback) {
    clearInterval(countdownTimer);
    showPanel('countdown-panel');
    let count = 3;
    setText(el['countdown-number'], count);
    countdownTimer = window.setInterval(function () {
      count -= 1;
      if (count > 0) { setText(el['countdown-number'], count); return; }
      clearInterval(countdownTimer);
      callback();
    }, 1000);
  }
  function beginRun() {
    const activeSeed = qaSeed === null ? randomSeed() : qaSeed;
    engine = new BuzzGame.GameEngine({ content: BuzzContent, clock: now, seed: activeSeed });
    if (!engine.validation.valid) {
      el['error-message'].textContent = engine.validation.errors.join(' ');
      showPanel('error-panel');
      return;
    }
    engine.start(pendingMode, now());
    currentRunId = makeRunId();
    resultsSnapshot = null;
    leaderboardSubmitted = false;
    clearTimeout(leaderboardTimer);
    record.settings.mode = pendingMode;
    persist(false);
    clearReview();
    inputLocked = false;
    setButtonsDisabled(false);
    lastTimerSecond = -1;
    render(engine.snapshot(now()));
    if (qaMode) setText(el['qa-seed'], 'QA mode · seed ' + activeSeed + ' · persistence disabled');
    if (document.hidden) { pause(true); return; }
    showPanel('play-panel');
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
    el['case-title'].focus();
  }
  function frame(timestamp) {
    const snapshot = engine.tick(timestamp);
    render(snapshot);
    if (snapshot.resolutions && snapshot.resolutions.length) {
      enterReview(snapshot.resolutions[snapshot.resolutions.length - 1], snapshot);
      return;
    }
    if (snapshot.state === 'playing') raf = requestAnimationFrame(frame);
    else if (snapshot.state === 'results') showResults(snapshot);
  }
  function render(snapshot) {
    setText(el.score, snapshot.score);
    setText(el['trust-text'], snapshot.trust);
    setText(el['queue-count'], snapshot.queueLength + ' / ' + snapshot.queueCap);
    setText(el.blooms, snapshot.blooms);
    const trustTransform = 'scaleX(' + (snapshot.trust / 100) + ')';
    if (el['trust-bar'].style.transform !== trustTransform) el['trust-bar'].style.transform = trustTransform;
    if (el['trust-bar'].parentElement.getAttribute('aria-valuenow') !== String(snapshot.trust)) el['trust-bar'].parentElement.setAttribute('aria-valuenow', String(snapshot.trust));
    const card = snapshot.currentCard;
    if (card) {
      setText(el['case-domain'], card.domain);
      setText(el['case-stage'], 'Find the missing step');
      setText(el['case-title'], card.title);
      setText(el['case-signal'], card.signal);
      const caseIndex = BuzzContent.cases.findIndex(function (item) { return item.id === card.caseId; });
      el['case-art'].dataset.caseVisual = String(Math.max(0, caseIndex) % 4);
    }
    el['bloom-garden'].querySelectorAll('span').forEach(function (node, index) {
      node.classList.toggle('earned', index < Math.min(4, snapshot.blooms));
    });
    const ratio = snapshot.decisionWindow ? Math.max(0, Math.min(1, snapshot.timeRemaining / snapshot.decisionWindow)) : 0;
    if (!effectiveReducedMotion()) {
      const timerTransform = 'scaleX(' + ratio + ')';
      if (el['timer-bar'].style.transform !== timerTransform) el['timer-bar'].style.transform = timerTransform;
    }
    const second = Math.max(0, Math.ceil(snapshot.timeRemaining / 1000));
    if (second !== lastTimerSecond) {
      lastTimerSecond = second;
      setText(el['timer-text'], 'Time remaining: ' + second + (second === 1 ? ' second' : ' seconds'));
      if ((effectiveReducedMotion() || snapshot.mode === 'relaxed') && [10,5,3].includes(second)) setText(el['timer-status'], second + ' seconds remaining.');
    }
  }
  function renderResolvedCard(card) {
    if (!card) return;
    setText(el['case-domain'], card.domain);
    setText(el['case-stage'], 'Decision review');
    setText(el['case-title'], card.title);
    setText(el['case-signal'], card.signal);
    const caseIndex = BuzzContent.cases.findIndex(function (item) { return item.id === card.caseId; });
    el['case-art'].dataset.caseVisual = String(Math.max(0, caseIndex) % 4);
  }
  function enterReview(result, snapshot) {
    if (!result || !result.resolvedCard) return;
    cancelAnimationFrame(raf);
    if (snapshot.state === 'playing') engine.pause(now());
    reviewing = true;
    inputLocked = true;
    reviewSnapshot = snapshot;
    render(snapshot);
    renderResolvedCard(result.resolvedCard);
    el['play-panel'].classList.add('is-reviewing');
    el['answer-review'].hidden = false;
    el['pause-button'].disabled = true;
    setButtonsDisabled(true);
    clearActionStates();
    const expectedButton = document.querySelector('[data-action="' + result.expected + '"]');
    const chosenButton = result.chosen ? document.querySelector('[data-action="' + result.chosen + '"]') : null;
    if (expectedButton) {
      expectedButton.classList.add('is-answer');
      expectedButton.setAttribute('aria-current', 'true');
    }
    if (chosenButton) chosenButton.classList.add('is-selected');
    const expectedName = actionNames[result.expected];
    const chosenName = result.chosen ? actionNames[result.chosen] : '';
    const clue = result.cue ? 'The clue: ' + result.cue + ' ' : '';
    const score = result.correct ? ' You earned ' + result.points + ' points.' : '';
    const bloom = result.bloomBonus ? ' This completed the four-step loop and earned a Bloom plus ' + result.bloomBonus + ' bonus points.' : '';
    let message;
    let className;
    if (result.timeout) {
      message = 'No choice was recorded. ' + clue + result.rationale;
      className = 'is-wrong';
      setText(el['review-kicker'], 'Time is up · review the gap');
    } else if (result.correct) {
      message = clue + result.rationale + score + bloom;
      className = 'is-correct';
      setText(el['review-kicker'], 'You found the gap');
    } else {
      message = 'You chose ' + chosenName + '. ' + actionNeeds[result.chosen] + ' ' + clue + result.rationale;
      className = 'is-wrong';
      setText(el['review-kicker'], 'Compare your choice with the loop');
    }
    setText(el['review-title'], 'Best fit in this loop: ' + expectedName);
    el['answer-review'].className = 'answer-review ' + className;
    el['game-feedback'].className = 'feedback game-feedback ' + className;
    setText(el['game-feedback'], message);
    setText(el['next-case-button'], snapshot.state === 'results' ? 'See results' : 'Next case');
    setText(el['game-status'], message + ' Best fit: ' + expectedName + '. Trust ' + snapshot.trust + '. Queue ' + snapshot.queueLength + ' of ' + snapshot.queueCap + '.');
    el['review-title'].focus();
    requestAnimationFrame(announceHeight);
  }
  function continueAfterReview() {
    if (!reviewing) return;
    const completedSnapshot = reviewSnapshot;
    clearReview();
    if (completedSnapshot && completedSnapshot.state === 'results') {
      showResults(completedSnapshot);
      return;
    }
    if (!engine || engine.state !== 'paused' || document.hidden) {
      showPanel('pause-panel');
      return;
    }
    engine.resume(now());
    inputLocked = false;
    setButtonsDisabled(false);
    lastTimerSecond = -1;
    const snapshot = engine.snapshot(now());
    render(snapshot);
    showPanel('play-panel');
    raf = requestAnimationFrame(frame);
    el['case-title'].focus();
  }
  function choose(action) {
    if (inputLocked || !engine || engine.state !== 'playing') return;
    inputLocked = true;
    setButtonsDisabled(true);
    const result = engine.answer(action, now());
    render(result.snapshot);
    if (result.accepted) enterReview(result, result.snapshot);
    else if (result.resolutions && result.resolutions.length) enterReview(result.resolutions[result.resolutions.length - 1], result.snapshot);
    else {
      inputLocked = false;
      setButtonsDisabled(false);
    }
  }
  function pause(auto) {
    if (reviewing || !engine || engine.state !== 'playing') return;
    const snapshot = engine.tick(now());
    render(snapshot);
    if (snapshot.resolutions && snapshot.resolutions.length) {
      enterReview(snapshot.resolutions[snapshot.resolutions.length - 1], snapshot);
      return;
    }
    if (snapshot.state === 'results') { showResults(snapshot); return; }
    if (!engine.pause(now())) return;
    cancelAnimationFrame(raf);
    showPanel('pause-panel');
    el['pause-button'].setAttribute('aria-pressed', 'true');
    setText(el['pause-title'], auto ? 'The challenge paused while this page was away.' : 'Evidence can wait. Your timer has stopped.');
    el['resume-button'].focus();
  }
  function resume() {
    if (!engine || engine.state !== 'paused') return;
    startCountdown(function () {
      if (document.hidden) { showPanel('pause-panel'); return; }
      engine.resume(now());
      el['pause-button'].setAttribute('aria-pressed', 'false');
      showPanel('play-panel');
      render(engine.snapshot(now()));
      raf = requestAnimationFrame(frame);
      el['case-title'].focus();
    });
  }
  function actionAccuracy(snapshot, action) {
    const stat = snapshot.stats[action];
    return stat.attempts ? Math.round(stat.correct / stat.attempts * 100) + '%' : '—';
  }
  function showResults(snapshot) {
    cancelAnimationFrame(raf);
    clearReview();
    resultsSnapshot = snapshot;
    const reasonCopy = { trust: 'Trust reached zero. Slow down, verify, and bring people into the next decision.', overload: 'The evidence queue filled up. Prioritize the next accountable step before adding more.', quit: 'You ended this run. The evidence-to-action loop is ready when you are.' };
    const previous = record.bests[snapshot.mode];
    previous.score = Math.max(previous.score, snapshot.score);
    previous.blooms = Math.max(previous.blooms, snapshot.blooms);
    persist(false);
    setText(el['results-title'], snapshot.blooms ? 'You moved evidence into action.' : (snapshot.accuracy >= .5 ? 'You found part of the loop.' : 'Use the gaps to guide your next run.'));
    setText(el['end-reason'], reasonCopy[snapshot.endReason] || 'Every completed loop turns a signal into learning for the next decision.');
    setText(el['final-score'], snapshot.score);
    setText(el['final-blooms'], snapshot.blooms);
    setText(el['final-streak'], snapshot.bestStreak);
    setText(el['final-accuracy'], Math.round(snapshot.accuracy * 100) + '%');
    setText(el['final-best'], previous.score);
    BuzzGame.ACTIONS.forEach(action => setText(el['accuracy-' + action], actionAccuracy(snapshot, action)));
    setText(el.takeaway, snapshot.blooms ? 'Takeaway: action is not the finish line. Track results, notice uneven effects, and adapt.' : 'Takeaway: credible action starts by verifying the evidence, then connecting it to context and people.');
    setText(el['game-status'], 'Run complete. ' + snapshot.score + ' points, ' + snapshot.blooms + ' blooms, ' + Math.round(snapshot.accuracy * 100) + ' percent loop match.');
    el['results-panel'].dataset.outcome = snapshot.blooms ? 'bloom' : 'seed';
    el['leaderboard-card'].hidden = qaMode || !embedded;
    if (!el['leaderboard-card'].hidden) {
      leaderboardSubmitted = false;
      el['leaderboard-card'].classList.remove('is-sent');
      el['leaderboard-name'].setAttribute('aria-invalid', 'false');
      el['leaderboard-name'].readOnly = false;
      el['leaderboard-consent'].checked = false;
      el['leaderboard-consent'].disabled = false;
      el['leaderboard-submit'].disabled = false;
      setLeaderboardStatus('', '');
    }
    showPanel('results-panel');
    renderLeaderboard(leaderboardData);
    el['results-title'].focus();
  }
  function renderTutorialStep() {
    const step = tutorialSteps[tutorialIndex];
    setText(el['tutorial-step-label'], 'Practice clinic · step ' + (tutorialIndex + 1) + ' of 4 · no timer or penalties');
    setText(el['clinic-signal'], step.signal);
    el['tutorial-feedback'].className = 'feedback';
    setText(el['tutorial-feedback'], step.need);
    el['tutorial-continue'].hidden = true;
    setText(el['tutorial-continue'], tutorialIndex === tutorialSteps.length - 1 ? 'Start the game' : 'Next example');
    tutorialLocked = false;
    document.querySelectorAll('[data-tutorial-action]').forEach(function (button) {
      button.disabled = false;
      button.classList.remove('is-selected', 'is-answer');
      button.removeAttribute('aria-current');
    });
  }
  function openTutorial() {
    tutorialIndex = 0;
    renderTutorialStep();
    showPanel('tutorial-panel');
    el['tutorial-title'].focus();
  }
  function finishTutorial() {
    record.settings.tutorialSeen = true;
    persist(false);
    setText(el['start-button'], 'Start the challenge');
    startCountdown(beginRun);
  }
  function handleMessage(event) {
    if (event.source !== window.parent) return;
    const data = event.data;
    if (!data || data.channel !== CHANNEL || data.version !== 1 || data.game !== 'buzz-to-bloom' || !['configure','leaderboard-result','leaderboard-data'].includes(data.type) || !data.payload || typeof data.payload !== 'object') return;
    if (data.type === 'configure') {
      const normalized = normalizeRecord(data.payload.record);
      if (normalized) mergeRecord(normalized);
      if (['before','live','after'].includes(data.payload.phase)) { phase = data.payload.phase; updatePhaseCopy(); }
      return;
    }
    if (data.type === 'leaderboard-data') { renderLeaderboard(data.payload); return; }
    if (data.payload.runId !== currentRunId || !['accepted','duplicate','rejected','failed'].includes(data.payload.status)) return;
    clearTimeout(leaderboardTimer);
    if (data.payload.status === 'accepted' || data.payload.status === 'duplicate') {
      leaderboardSubmitted = true;
      el['leaderboard-card'].classList.add('is-sent');
      el['leaderboard-name'].readOnly = true;
      el['leaderboard-consent'].disabled = true;
      el['leaderboard-submit'].disabled = true;
      setLeaderboardStatus(data.payload.status === 'duplicate' ? 'This run was already submitted.' : 'Score sent. It will appear after the leaderboard refreshes.', 'is-sent');
      window.setTimeout(function () { post('leaderboard-refresh', {}); }, 1800);
    } else {
      el['leaderboard-submit'].disabled = false;
      setLeaderboardStatus(data.payload.status === 'rejected' ? 'This run did not pass the leaderboard safety check.' : 'The score could not be sent. Check your connection and try again.', 'is-error');
    }
  }

  function init() {
    ids.forEach(function (id) { el[id] = document.getElementById(id); });
    if (!el['start-form'] || !window.BuzzGame || !window.BuzzContent) throw new Error('The game interface or selected case pack is incomplete.');
    setText(el['pack-name'], BuzzContent.name);
    document.documentElement.dataset.activeCasePack = BuzzContent.packId;
    readRecord();
    syncSettings();
    updatePhaseCopy();
    updateBestLine();
    engine = new BuzzGame.GameEngine({ content: BuzzContent, clock: now, seed: qaSeed === null ? 1 : qaSeed });
    if (!engine.validation.valid) {
      setText(el['error-message'], engine.validation.errors.join(' '));
      showPanel('error-panel');
    }
    if (qaMode) {
      el['qa-seed'].hidden = false;
      setText(el['qa-seed'], 'QA mode · seed ' + qaSeed + ' · persistence disabled');
    }
    function requestStart() {
      pendingMode = new FormData(el['start-form']).get('mode') === 'classic' ? 'classic' : 'relaxed';
      if (!record.settings.tutorialSeen) openTutorial(); else startCountdown(beginRun);
    }
    el['start-button'].addEventListener('click', requestStart);
    el['start-form'].addEventListener('submit', function (event) {
      event.preventDefault();
      requestStart();
    });
    document.querySelectorAll('input[name="mode"]').forEach(input => input.addEventListener('change', function () { pendingMode = input.value; updateBestLine(); }));
    el['how-button'].addEventListener('click', openTutorial);
    el['reset-button'].addEventListener('click', function () {
      record = copyRecord(defaultRecord);
      syncSettings();
      updateBestLine();
      persist(true);
      setText(el['reset-button'], 'Local game data reset');
      window.setTimeout(() => setText(el['reset-button'], 'Reset local game data'), 1600);
    });
    el['tutorial-skip'].addEventListener('click', finishTutorial);
    el['tutorial-continue'].addEventListener('click', function () {
      if (!tutorialLocked) return;
      if (tutorialIndex === tutorialSteps.length - 1) {
        finishTutorial();
        return;
      }
      tutorialIndex += 1;
      renderTutorialStep();
      el['tutorial-title'].focus();
    });
    document.querySelectorAll('[data-tutorial-action]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (tutorialLocked) return;
        const step = tutorialSteps[tutorialIndex];
        const chosen = button.dataset.tutorialAction;
        const correct = chosen === step.action;
        const expectedButton = document.querySelector('[data-tutorial-action="' + step.action + '"]');
        button.classList.add('is-selected');
        if (expectedButton) {
          expectedButton.classList.add('is-answer');
          expectedButton.setAttribute('aria-current', 'true');
        }
        el['tutorial-feedback'].className = 'feedback ' + (correct ? 'is-correct' : 'is-wrong');
        setText(el['tutorial-feedback'], correct ? 'Yes. ' + step.cue + ' ' + step.success : 'You chose ' + actionNames[chosen] + '. ' + actionNeeds[chosen] + ' In this case, ' + step.cue + ' Best fit: ' + actionNames[step.action] + '. ' + step.success);
        tutorialLocked = true;
        document.querySelectorAll('[data-tutorial-action]').forEach(actionButton => { actionButton.disabled = true; });
        el['tutorial-continue'].hidden = false;
        el['tutorial-continue'].focus();
      });
    });
    document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', function () { choose(button.dataset.action); }));
    el['next-case-button'].addEventListener('click', continueAfterReview);
    el['pause-button'].addEventListener('click', function () { pause(false); });
    el['resume-button'].addEventListener('click', resume);
    el['quit-button'].addEventListener('click', function () { engine.finish('quit', now()); showResults(engine.snapshot(now())); });
    el['again-button'].addEventListener('click', function () { startCountdown(beginRun); });
    el['menu-button'].addEventListener('click', function () { showPanel('menu-panel'); updateBestLine(); el['start-button'].focus(); });
    el['leaderboard-form'].addEventListener('submit', function (event) { event.preventDefault(); submitLeaderboard(); });
    el['leaderboard-name'].addEventListener('input', function () { el['leaderboard-name'].setAttribute('aria-invalid', 'false'); if (!leaderboardSubmitted) setLeaderboardStatus('', ''); });
    el['leaderboard-consent'].addEventListener('change', function () { if (!leaderboardSubmitted) setLeaderboardStatus('', ''); });
    el['leaderboard-refresh'].addEventListener('click', function () { leaderboardData = { status: 'loading', entries: leaderboardData.entries }; renderLeaderboard(leaderboardData); post('leaderboard-refresh', {}); });
    el['motion-toggle'].addEventListener('click', function () { record.settings.reduceMotion = !record.settings.reduceMotion; syncSettings(); persist(false); if (engine) render(engine.snapshot(now())); });
    if (typeof reduceMedia.addEventListener === 'function') reduceMedia.addEventListener('change', function () { if (engine) render(engine.snapshot(now())); });
    window.addEventListener('keydown', function (event) {
      if (event.repeat) return;
      if (event.key === 'Enter' && currentPanel === 'menu-panel' && event.target.tagName !== 'BUTTON') { event.preventDefault(); requestStart(); return; }
      if (/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
      if (reviewing && event.key === 'Enter') { event.preventDefault(); continueAfterReview(); }
      else if (!reviewing && engine && engine.state === 'playing' && ['1','2','3','4'].includes(event.key)) { event.preventDefault(); choose(BuzzGame.ACTIONS[Number(event.key) - 1]); }
      else if ((event.key === 'p' || event.key === 'P' || event.key === 'Escape') && engine && engine.state === 'playing') { event.preventDefault(); pause(false); }
      else if (!reviewing && (event.key === 'p' || event.key === 'P' || event.key === 'Enter') && engine && engine.state === 'paused') { event.preventDefault(); resume(); }
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden && engine && engine.state === 'playing') pause(true); });
    window.addEventListener('blur', function () { if (engine && engine.state === 'playing') pause(true); });
    window.addEventListener('message', handleMessage);
    if ('ResizeObserver' in window) new ResizeObserver(announceHeight).observe(document.body);
    post('ready', { capabilities: ['configure','resize','persist','leaderboard-submit','leaderboard-read'] });
    announceHeight();
  }

  function showLoadError(error) {
    ids.forEach(function (id) { el[id] = document.getElementById(id); });
    if (!el['error-panel']) return;
    setText(el['error-message'], error && error.message ? error.message : 'Please refresh the page.');
    showPanel('error-panel');
  }

  (window.BuzzContentReady || Promise.resolve(window.BuzzContent)).then(function () {
    init();
  }).catch(showLoadError);
}());
