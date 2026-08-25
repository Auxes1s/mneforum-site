(function (root) {
  'use strict';

  const ACTIONS = ['check', 'connect', 'commit', 'track'];
  const MODES = {
    classic: { interval: 30000, tierCap: 10, arrivalBase: 4200, arrivalStep: 280, arrivalMin: 1700, decisionBase: 10000, decisionStep: 500, decisionMin: 5500, queueCap: 6, wrong: 18, timeout: 24, correct: 1, bloom: 6 },
    relaxed: { interval: 45000, tierCap: 6, arrivalBase: 5600, arrivalStep: 420, arrivalMin: 3500, decisionBase: 16000, decisionStep: 1000, decisionMin: 11000, queueCap: 8, wrong: 10, timeout: 12, correct: 2, bloom: 10 }
  };

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
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
    if (!pack || pack.schemaVersion !== 1 || pack.locale !== 'en-PH' || !Array.isArray(pack.cases)) errors.push('Invalid content-pack header.');
    if (!pack || !Array.isArray(pack.cases) || pack.cases.length < 8) errors.push('At least eight cases are required.');
    (pack && pack.cases || []).forEach(function (item) {
      if (!item.id || ids.has(item.id)) errors.push('Case IDs must be unique.');
      ids.add(item.id);
      ACTIONS.forEach(function (stage) {
        const cards = item.stages && item.stages[stage];
        if (!Array.isArray(cards) || cards.length < 2) errors.push(item.id + ' needs two ' + stage + ' cards.');
        (cards || []).forEach(function (card) {
          if (!card.id || ids.has(card.id)) errors.push('Card IDs must be unique.');
          ids.add(card.id);
          if (![1, 2, 3].includes(card.difficulty)) errors.push(card.id + ' has invalid difficulty.');
          if (typeof card.signal !== 'string' || card.signal.length > 120 || card.signal.trim().split(/\s+/).length > 18) errors.push(card.id + ' signal is too long.');
          if (typeof card.rationale !== 'string' || card.rationale.length > 150 || card.rationale.trim().split(/\s+/).length > 24) errors.push(card.id + ' rationale is too long.');
          if (!Array.isArray(card.themeIds) || !card.themeIds.length || !Array.isArray(card.tags)) errors.push(card.id + ' metadata is invalid.');
        });
      });
    });
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
      this.state = 'boot';
      this.mode = 'classic';
      this.resetStats();
      if (!this.validation.valid) this.state = 'error';
      else this.state = 'menu';
    }

    resetStats() {
      this.score = 0;
      this.trust = 100;
      this.blooms = 0;
      this.streak = 0;
      this.bestStreak = 0;
      this.startedAt = 0;
      this.activeStartedAt = 0;
      this.deadlineAt = 0;
      this.nextArrivalAt = 0;
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

    start(mode, now) {
      if (!this.validation.valid) return this.snapshot(now);
      this.mode = MODES[mode] ? mode : 'classic';
      this.resetStats();
      this.state = 'playing';
      this.startedAt = now;
      this.caseStates = {};
      this.content.cases.forEach((item, index) => { this.caseStates[item.id] = { stage: index % ACTIONS.length }; });
      // Begin with one active case; the configured cadence adds queue pressure
      // once a player spends longer than the current arrival window deciding.
      // Start at Track so the opening successful decision demonstrates a
      // complete evidence-to-action bloom before the eight seeded stages mix.
      this.queue = [this.content.cases[3].id];
      this.nextArrivalAt = now + this.arrivalWindow(now);
      this.activateCurrent(now);
      return this.snapshot(now);
    }

    chooseArrival() {
      const queued = new Set(this.queue);
      let candidates = this.content.cases.filter(item => !queued.has(item.id));
      const notRecent = candidates.filter(item => !this.recentCases.slice(-2).includes(item.id));
      if (notRecent.length) candidates = notRecent;
      return candidates.length ? candidates[Math.floor(this.random() * candidates.length)].id : null;
    }

    addArrival(now) {
      const next = this.chooseArrival();
      if (!next) return;
      if (this.queue.length >= this.rules().queueCap) {
        this.finish('overload', now);
        return;
      }
      this.queue.push(next);
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
      return Object.assign({ caseId: caseId, domain: item.domain, title: item.title, action: action, stageIndex: stageIndex }, card);
    }

    activateCurrent(now) {
      if (this.state !== 'playing') return;
      if (!this.queue.length) {
        const next = this.chooseArrival();
        if (next) this.queue.push(next);
      }
      if (this.recentActions.length >= 2 && this.recentActions.slice(-2).every(action => action === this.recentActions[this.recentActions.length - 1])) {
        const repeated = this.recentActions[this.recentActions.length - 1];
        const alternativeIndex = this.queue.findIndex(caseId => ACTIONS[this.caseStates[caseId].stage] !== repeated);
        if (alternativeIndex > 0) this.queue.unshift(this.queue.splice(alternativeIndex, 1)[0]);
      }
      this.currentCard = this.selectCard(this.queue[0], now);
      this.activeStartedAt = now;
      this.deadlineAt = now + this.decisionWindow(now);
    }

    answer(action, now, timeout) {
      if (this.state !== 'playing' || !this.currentCard) return { accepted: false, snapshot: this.snapshot(now) };
      const expected = this.currentCard.action;
      const wasCorrect = !timeout && action === expected;
      this.stats[expected].attempts += 1;
      let points = 0;
      let bloomed = false;
      if (wasCorrect) {
        this.stats[expected].correct += 1;
        this.streak += 1;
        this.bestStreak = Math.max(this.bestStreak, this.streak);
        const multiplier = Math.min(2, 1 + .1 * Math.floor(this.streak / 5));
        const remaining = clamp((this.deadlineAt - now) / this.decisionWindow(now), 0, 1);
        points = Math.round((100 + 100 * remaining + 25 * (this.currentCard.difficulty - 1)) * multiplier);
        this.score += points;
        this.trust = clamp(this.trust + this.rules().correct, 0, 100);
        const caseState = this.caseStates[this.currentCard.caseId];
        caseState.stage = (caseState.stage + 1) % ACTIONS.length;
        if (caseState.stage === 0) {
          bloomed = true;
          this.blooms += 1;
          this.score += Math.round(500 * multiplier);
          this.trust = clamp(this.trust + this.rules().bloom, 0, 100);
        }
        this.queue.shift();
      } else {
        this.streak = 0;
        this.trust = clamp(this.trust - (timeout ? this.rules().timeout : this.rules().wrong), 0, 100);
        const current = this.queue.shift();
        if (current) this.queue.push(current);
      }
      this.recentCases.push(this.currentCard.caseId);
      this.recentCases = this.recentCases.slice(-3);
      this.recentActions.push(expected);
      this.recentActions = this.recentActions.slice(-3);
      const resolved = this.currentCard;
      if (this.trust <= 0) this.finish('trust', now);
      else {
        this.nextArrivalAt = now + this.arrivalWindow(now);
        this.activateCurrent(now);
      }
      return { accepted: true, correct: wasCorrect, timeout: !!timeout, expected: expected, points: points, bloomed: bloomed, rationale: resolved.rationale, snapshot: this.snapshot(now) };
    }

    tick(now) {
      if (this.state !== 'playing') return this.snapshot(now);
      let resolution = null;
      while (this.state === 'playing' && now >= this.nextArrivalAt) {
        this.addArrival(this.nextArrivalAt);
        this.nextArrivalAt += this.arrivalWindow(this.nextArrivalAt);
      }
      if (this.state === 'playing' && now >= this.deadlineAt) resolution = this.answer(null, now, true);
      const snapshot = this.snapshot(now);
      if (resolution && resolution.accepted) snapshot.resolution = {
        correct: false, timeout: true, expected: resolution.expected, rationale: resolution.rationale
      };
      return snapshot;
    }

    pause(now) {
      if (this.state !== 'playing') return false;
      this.state = 'paused';
      this.pausedAt = now;
      return true;
    }

    resume(now) {
      if (this.state !== 'paused') return false;
      const delta = now - this.pausedAt;
      this.startedAt += delta;
      this.activeStartedAt += delta;
      this.deadlineAt += delta;
      this.nextArrivalAt += delta;
      this.state = 'playing';
      this.pausedAt = 0;
      return true;
    }

    finish(reason, now) {
      this.state = 'results';
      this.endReason = reason;
      this.finishedAt = now;
      return this.snapshot(now);
    }

    snapshot(now) {
      const totalAttempts = ACTIONS.reduce((sum, action) => sum + this.stats[action].attempts, 0);
      const totalCorrect = ACTIONS.reduce((sum, action) => sum + this.stats[action].correct, 0);
      return {
        state: this.state, mode: this.mode, seed: this.seed, score: this.score, trust: this.trust, blooms: this.blooms,
        streak: this.streak, bestStreak: this.bestStreak, queueLength: this.queue.length,
        queueCap: this.rules().queueCap, tier: this.state === 'menu' ? 1 : this.tier(now),
        currentCard: this.currentCard, timeRemaining: this.state === 'playing' ? Math.max(0, this.deadlineAt - now) : 0,
        decisionWindow: this.state === 'menu' ? this.rules().decisionBase : this.decisionWindow(now),
        endReason: this.endReason, stats: JSON.parse(JSON.stringify(this.stats)),
        accuracy: totalAttempts ? totalCorrect / totalAttempts : 0,
        validation: this.validation
      };
    }
  }

  root.BuzzGame = { ACTIONS: ACTIONS, MODES: MODES, GameEngine: GameEngine, mulberry32: mulberry32, validateContent: validateContent };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.BuzzGame;
}(typeof window !== 'undefined' ? window : globalThis));
