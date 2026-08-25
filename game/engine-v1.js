(function (root) {
  'use strict';

  const ACTIONS = ['check', 'connect', 'commit', 'track'];
  const THEME_IDS = ['shared-mandate', 'technological-innovations', 'local-partners', 'collaborative-action'];
  const TAGS = ['official-and-community', 'ai-assisted', 'human-led'];
  const MODES = {
    classic: { interval: 30000, tierCap: 10, arrivalBase: 4200, arrivalStep: 280, arrivalMin: 1700, decisionBase: 10000, decisionStep: 500, decisionMin: 5500, queueCap: 6, wrong: 16, timeout: 22, correct: 1, bloom: 6 },
    relaxed: { interval: 45000, tierCap: 6, arrivalBase: 5600, arrivalStep: 420, arrivalMin: 3500, decisionBase: 16000, decisionStep: 1000, decisionMin: 11000, queueCap: 8, wrong: 10, timeout: 12, correct: 2, bloom: 10 }
  };

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function words(value) { return value.trim().split(/\s+/).filter(Boolean).length; }
  function mulberry32(seed) {
    let value = seed >>> 0;
    return function () {
      value += 0x6D2B79F5;
      let out = value;
      out = Math.imul(out ^ out >>> 15, out | 1);
      out ^= out + Math.imul(out ^ out >>> 7, out | 61);
      return ((out ^ out >>> 14) >>> 0) / 4294967296;
    };
  }

  function validateContent(pack) {
    const errors = [];
    const ids = new Set();
    const themeCounts = Object.fromEntries(THEME_IDS.map(id => [id, 0]));
    let cardCount = 0;
    let aiCount = 0;
    let combinedCases = 0;
    if (!pack || pack.schemaVersion !== 1 || pack.locale !== 'en-PH' || !Array.isArray(pack.cases)) errors.push('Invalid content-pack header.');
    if (!pack || typeof pack.packId !== 'string' || !/^[a-z0-9](?:[a-z0-9-]{0,47}[a-z0-9])?$/.test(pack.packId)) errors.push('Content pack needs a safe versioned packId.');
    if (!pack || typeof pack.name !== 'string' || !pack.name.trim() || pack.name.length > 72) errors.push('Content pack needs a short display name.');
    if (!pack || !Array.isArray(pack.themeIds) || pack.themeIds.length !== THEME_IDS.length || !THEME_IDS.every(id => pack.themeIds.includes(id))) errors.push('Content pack must use the four cleared concept-note themes.');
    if (!pack || !Array.isArray(pack.cases) || pack.cases.length < 8) errors.push('At least eight cases are required.');
    (pack && pack.cases || []).forEach(function (item) {
      if (!item.id || ids.has(item.id)) errors.push('Case IDs must be unique.');
      ids.add(item.id);
      if (typeof item.domain !== 'string' || !item.domain.trim() || item.domain.length > 40 || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 72) errors.push((item.id || 'case') + ' has invalid case metadata.');
      let combined = false;
      ACTIONS.forEach(function (stage) {
        const cards = item.stages && item.stages[stage];
        if (!Array.isArray(cards) || cards.length < 2) errors.push(item.id + ' needs at least two ' + stage + ' cards.');
        if (Array.isArray(cards) && !cards.some(card => card.difficulty === 1)) errors.push(item.id + ' needs a difficulty-1 ' + stage + ' card.');
        if (Array.isArray(cards) && !cards.some(card => card.difficulty === 2)) errors.push(item.id + ' needs a difficulty-2 ' + stage + ' card.');
        (cards || []).forEach(function (card) {
          cardCount += 1;
          if (!card.id || ids.has(card.id)) errors.push('Card IDs must be unique.');
          ids.add(card.id);
          if (![1, 2, 3].includes(card.difficulty)) errors.push(card.id + ' has invalid difficulty.');
          if (typeof card.signal !== 'string' || !card.signal.trim() || card.signal.length > 120 || words(card.signal) > 18) errors.push(card.id + ' signal is invalid or too long.');
          if (typeof card.rationale !== 'string' || !card.rationale.trim() || card.rationale.length > 150 || words(card.rationale) > 24) errors.push(card.id + ' rationale is invalid or too long.');
          if (card.cue !== undefined && (typeof card.cue !== 'string' || !card.cue.trim() || card.cue.length > 140 || words(card.cue) > 24)) errors.push(card.id + ' cue is invalid or too long.');
          if (!Array.isArray(card.themeIds) || !card.themeIds.length || card.themeIds.some(id => !THEME_IDS.includes(id))) errors.push(card.id + ' theme metadata is invalid.');
          if (!Array.isArray(card.tags) || !card.tags.length || card.tags.some(tag => !TAGS.includes(tag))) errors.push(card.id + ' tag metadata is invalid.');
          (card.themeIds || []).forEach(id => { if (id in themeCounts) themeCounts[id] += 1; });
          if ((card.tags || []).includes('ai-assisted')) aiCount += 1;
          if ((card.tags || []).includes('official-and-community')) combined = true;
        });
      });
      if (combined) combinedCases += 1;
    });
    THEME_IDS.forEach(id => { if (themeCounts[id] < 12) errors.push(id + ' appears on fewer than 12 cards.'); });
    if (cardCount && aiCount / cardCount > .25) errors.push('AI-assisted cards exceed 25 percent.');
    if (pack && pack.cases && combinedCases < Math.ceil(pack.cases.length / 2)) errors.push('At least half of cases must combine official and community evidence.');
    return { valid: errors.length === 0, errors: errors };
  }

  class GameEngine {
    constructor(options) {
      const opts = options || {};
      this.content = opts.content;
      this.clock = typeof opts.clock === 'function' ? opts.clock : function () { return performance.now(); };
      this.seed = Number.isFinite(opts.seed) ? opts.seed >>> 0 : 1;
      this.random = typeof opts.random === 'function' ? opts.random : mulberry32(this.seed);
      this.validation = validateContent(this.content);
      this.state = this.validation.valid ? 'menu' : 'error';
      this.mode = 'classic';
      this.resetStats();
    }

    at(value) { return Number.isFinite(value) ? value : this.clock(); }
    resetStats() {
      this.score = 0;
      this.trust = 100;
      this.blooms = 0;
      this.streak = 0;
      this.bestStreak = 0;
      this.startedAt = 0;
      this.activeStartedAt = 0;
      this.activeWindow = 0;
      this.deadlineAt = 0;
      this.nextArrivalAt = 0;
      this.lastProcessedAt = 0;
      this.pausedAt = 0;
      this.queue = [];
      this.currentCard = null;
      this.endReason = '';
      this.recentCases = [];
      this.recentActions = [];
      this.lastVariantByCaseStage = {};
      this.stats = {};
      ACTIONS.forEach(action => { this.stats[action] = { correct: 0, attempts: 0 }; });
    }

    rules() { return MODES[this.mode]; }
    elapsed(now) { return Math.max(0, now - this.startedAt); }
    tier(now) { return Math.min(this.rules().tierCap, 1 + Math.floor(this.elapsed(now) / this.rules().interval)); }
    arrivalWindow(now) { const r = this.rules(); return Math.max(r.arrivalMin, r.arrivalBase - r.arrivalStep * (this.tier(now) - 1)); }
    decisionWindow(now) { const r = this.rules(); return Math.max(r.decisionMin, r.decisionBase - r.decisionStep * (this.tier(now) - 1)); }
    allowedDifficulty(now) { const tier = this.tier(now); return tier >= 7 ? 3 : (tier >= 4 ? 2 : 1); }

    shuffledCaseIds() {
      const ids = this.content.cases.map(item => item.id);
      for (let index = ids.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(this.random() * (index + 1));
        [ids[index], ids[swap]] = [ids[swap], ids[index]];
      }
      return ids;
    }

    start(mode, value) {
      const now = this.at(value);
      if (!this.validation.valid) return this.snapshot(now);
      this.mode = MODES[mode] ? mode : 'classic';
      this.resetStats();
      this.state = 'playing';
      this.startedAt = now;
      this.lastProcessedAt = now;
      this.caseStates = {};
      this.content.cases.forEach((item, index) => { this.caseStates[item.id] = { stage: index % ACTIONS.length, successfulAdvances: 0 }; });
      this.caseOrder = this.shuffledCaseIds();
      this.queue = this.caseOrder.slice(0, 1);
      // The opening two minutes teach the rhythm through timed decisions before
      // independent queue arrivals add a second source of pressure.
      this.nextArrivalAt = now + Math.max(125000, this.arrivalWindow(now));
      this.activateCurrent(now);
      return this.snapshot(now);
    }

    chooseArrival() {
      const queued = new Set(this.queue);
      let candidates = this.caseOrder.filter(id => !queued.has(id));
      const cooled = candidates.filter(id => !this.recentCases.includes(id));
      if (cooled.length) candidates = cooled;
      const evolving = candidates.filter(id => this.caseStates[id].successfulAdvances > 0);
      if (evolving.length) candidates = evolving;
      return candidates.length ? candidates[Math.floor(this.random() * candidates.length)] : null;
    }

    addArrival(now) {
      if (this.queue.length >= this.rules().queueCap) {
        this.finish('overload', now);
        return;
      }
      const next = this.chooseArrival();
      if (next) this.queue.push(next);
    }

    selectCard(caseId, now) {
      const item = this.content.cases.find(candidate => candidate.id === caseId);
      const stageIndex = this.caseStates[caseId].stage;
      const action = ACTIONS[stageIndex];
      const cards = item.stages[action];
      const allowed = this.allowedDifficulty(now);
      const eligible = cards.filter(card => card.difficulty <= allowed);
      const maxDifficulty = Math.max.apply(null, eligible.map(card => card.difficulty));
      let candidates = eligible.filter(card => card.difficulty === maxDifficulty);
      const key = caseId + ':' + action;
      const fresh = candidates.filter(card => card.id !== this.lastVariantByCaseStage[key]);
      if (fresh.length) candidates = fresh;
      const card = candidates[Math.floor(this.random() * candidates.length)];
      this.lastVariantByCaseStage[key] = card.id;
      return Object.assign({ caseId: caseId, domain: item.domain, title: item.title, action: action }, card);
    }

    activateCurrent(now) {
      if (this.state !== 'playing') return;
      if (!this.queue.length) {
        const next = this.chooseArrival();
        if (next) this.queue.push(next);
      }
      let indexes = this.queue.map((id, index) => ({ id: id, index: index })).filter(item => !this.recentCases.includes(item.id));
      if (!indexes.length) {
        const cooled = this.chooseArrival();
        if (cooled) this.queue.unshift(cooled);
        indexes = this.queue.map((id, index) => ({ id: id, index: index })).filter(item => !this.recentCases.includes(item.id));
      }
      if (!indexes.length) indexes = this.queue.map((id, index) => ({ id: id, index: index }));
      const evolving = indexes.filter(item => this.caseStates[item.id].successfulAdvances > 0);
      if (evolving.length) indexes = evolving;
      if (this.recentActions.length >= 2 && this.recentActions[0] === this.recentActions[1]) {
        const repeated = this.recentActions[1];
        const alternatives = indexes.filter(item => ACTIONS[this.caseStates[item.id].stage] !== repeated);
        if (alternatives.length) indexes = alternatives;
      }
      const chosenIndex = indexes[0] ? indexes[0].index : 0;
      if (chosenIndex > 0) this.queue.unshift(this.queue.splice(chosenIndex, 1)[0]);
      this.currentCard = this.selectCard(this.queue[0], now);
      this.activeStartedAt = now;
      this.activeWindow = this.decisionWindow(now);
      this.deadlineAt = now + this.activeWindow;
    }

    resolve(action, now, timeout) {
      const expected = this.currentCard.action;
      const wasCorrect = !timeout && action === expected;
      this.stats[expected].attempts += 1;
      let points = 0;
      let bloomBonus = 0;
      let bloomed = false;
      if (wasCorrect) {
        this.stats[expected].correct += 1;
        this.streak += 1;
        this.bestStreak = Math.max(this.bestStreak, this.streak);
        const multiplier = Math.min(2, 1 + .1 * Math.floor(this.streak / 5));
        const remaining = clamp((this.deadlineAt - now) / this.activeWindow, 0, 1);
        points = Math.round((100 + 100 * remaining + 25 * (this.currentCard.difficulty - 1)) * multiplier);
        this.score += points;
        this.trust = clamp(this.trust + this.rules().correct, 0, 100);
        const caseState = this.caseStates[this.currentCard.caseId];
        caseState.stage = (caseState.stage + 1) % ACTIONS.length;
        caseState.successfulAdvances += 1;
        if (caseState.successfulAdvances >= 4) {
          caseState.successfulAdvances = 0;
          bloomed = true;
          this.blooms += 1;
          bloomBonus = Math.round(500 * multiplier);
          this.score += bloomBonus;
          this.trust = clamp(this.trust + this.rules().bloom, 0, 100);
        }
        this.queue.shift();
      } else {
        this.streak = 0;
        this.trust = clamp(this.trust - (timeout ? this.rules().timeout : this.rules().wrong), 0, 100);
        const current = this.queue.shift();
        if (current) this.queue.push(current);
      }
      const resolved = this.currentCard;
      this.recentCases.push(resolved.caseId);
      this.recentCases = this.recentCases.slice(-2);
      this.recentActions.push(expected);
      this.recentActions = this.recentActions.slice(-2);
      this.currentCard = null;
      if (this.trust <= 0) this.finish('trust', now);
      else this.activateCurrent(now);
      return { accepted: true, correct: wasCorrect, timeout: !!timeout, chosen: action, expected: expected, points: points, bloomBonus: bloomBonus, bloomed: bloomed, rationale: resolved.rationale, cue: resolved.cue || '', resolvedCard: Object.assign({}, resolved), resolvedCaseId: resolved.caseId, snapshot: this.snapshot(now) };
    }

    advanceTo(value) {
      const target = Math.max(this.lastProcessedAt, this.at(value));
      const resolutions = [];
      if (this.state !== 'playing') return resolutions;
      while (this.state === 'playing') {
        const eventAt = Math.min(this.deadlineAt, this.nextArrivalAt);
        if (eventAt > target) break;
        if (this.deadlineAt <= this.nextArrivalAt) resolutions.push(this.resolve(null, this.deadlineAt, true));
        else {
          const arrivalAt = this.nextArrivalAt;
          this.nextArrivalAt = arrivalAt + this.arrivalWindow(arrivalAt);
          this.addArrival(arrivalAt);
        }
      }
      this.lastProcessedAt = target;
      return resolutions;
    }

    answer(action, value) {
      const now = Math.max(this.lastProcessedAt, this.at(value));
      if (this.state !== 'playing' || !this.currentCard) return { accepted: false, snapshot: this.snapshot(now) };
      const cardId = this.currentCard.id;
      const resolutions = this.advanceTo(now);
      if (this.state !== 'playing' || !this.currentCard || this.currentCard.id !== cardId) return { accepted: false, expired: true, resolutions: resolutions, snapshot: this.snapshot(now) };
      this.lastProcessedAt = now;
      return this.resolve(action, now, false);
    }

    tick(value) {
      const now = this.at(value);
      const resolutions = this.advanceTo(now);
      const snapshot = this.snapshot(now);
      if (resolutions.length) snapshot.resolutions = resolutions.map(result => ({ accepted: true, correct: result.correct, timeout: result.timeout, chosen: result.chosen, expected: result.expected, points: result.points, bloomBonus: result.bloomBonus, bloomed: result.bloomed, rationale: result.rationale, cue: result.cue, resolvedCard: result.resolvedCard, resolvedCaseId: result.resolvedCaseId }));
      return snapshot;
    }

    pause(value) {
      const now = this.at(value);
      this.advanceTo(now);
      if (this.state !== 'playing') return false;
      this.state = 'paused';
      this.pausedAt = now;
      return true;
    }

    resume(value) {
      const now = this.at(value);
      if (this.state !== 'paused') return false;
      const delta = Math.max(0, now - this.pausedAt);
      this.startedAt += delta;
      this.activeStartedAt += delta;
      this.deadlineAt += delta;
      this.nextArrivalAt += delta;
      this.lastProcessedAt = now;
      this.state = 'playing';
      this.pausedAt = 0;
      return true;
    }

    finish(reason, value) {
      const now = this.at(value);
      this.state = 'results';
      this.endReason = reason;
      this.finishedAt = now;
      return this.snapshot(now);
    }

    snapshot(value) {
      const now = this.at(value);
      const totalAttempts = ACTIONS.reduce((sum, action) => sum + this.stats[action].attempts, 0);
      const totalCorrect = ACTIONS.reduce((sum, action) => sum + this.stats[action].correct, 0);
      return {
        state: this.state, mode: this.mode, seed: this.seed, score: this.score, trust: this.trust, blooms: this.blooms,
        streak: this.streak, bestStreak: this.bestStreak, queueLength: this.queue.length,
        queueCap: this.rules().queueCap, tier: this.state === 'menu' ? 1 : this.tier(now),
        currentCard: this.currentCard, timeRemaining: this.state === 'playing' ? Math.max(0, this.deadlineAt - now) : 0,
        decisionWindow: this.state === 'menu' ? this.rules().decisionBase : this.activeWindow,
        endReason: this.endReason, stats: JSON.parse(JSON.stringify(this.stats)),
        accuracy: totalAttempts ? totalCorrect / totalAttempts : 0,
        validation: this.validation
      };
    }
  }

  root.BuzzGame = { ACTIONS: ACTIONS, THEME_IDS: THEME_IDS, MODES: MODES, GameEngine: GameEngine, mulberry32: mulberry32, validateContent: validateContent };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.BuzzGame;
}(typeof window !== 'undefined' ? window : globalThis));
