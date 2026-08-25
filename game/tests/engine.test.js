'use strict';

const assert = require('node:assert/strict');
require('../cases/philippines-v1.js');
const game = require('../engine-v1.js');
const content = global.BuzzContent;

function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (error) { console.error('not ok - ' + name); throw error; }
}

function checksum(seed, frameStep) {
  let time = 0;
  const engine = new game.GameEngine({ content, seed, clock: () => time });
  engine.start('classic', time);
  const actions = ['check','connect','commit','track','check','track','connect','commit'];
  for (let index = 0; index < actions.length && engine.state === 'playing'; index += 1) {
    const target = time + 2300;
    while (time + frameStep < target) { time += frameStep; engine.tick(time); }
    time = target;
    engine.tick(time);
    if (engine.state === 'playing') engine.answer(actions[index], time);
  }
  const snapshot = engine.snapshot(time);
  return [snapshot.score,snapshot.trust,snapshot.blooms,snapshot.queueLength,snapshot.currentCard && snapshot.currentCard.id,engine.deadlineAt,engine.nextArrivalAt].join('|');
}

function simulate(seed, mode, accuracy, minDelay, maxDelay, limit) {
  let time = 0;
  const random = game.mulberry32(seed ^ 0xA5A5A5A5);
  const engine = new game.GameEngine({ content, seed, clock: () => time });
  engine.start(mode, time);
  while (engine.state === 'playing' && time < limit) {
    time += minDelay + random() * (maxDelay - minDelay);
    engine.tick(time);
    if (engine.state !== 'playing') break;
    const correct = engine.currentCard.action;
    let chosen = correct;
    if (random() > accuracy) {
      const alternatives = game.ACTIONS.filter(action => action !== correct);
      chosen = alternatives[Math.floor(random() * alternatives.length)];
    }
    engine.answer(chosen, time);
  }
  return { duration: time, snapshot: engine.snapshot(time) };
}

function median(values) {
  const sorted = values.slice().sort((a,b) => a-b);
  return sorted[Math.floor(sorted.length / 2)];
}

test('default Philippine pack uses the cleared themes and broad randomization', () => {
  const validation = game.validateContent(content);
  assert.equal(validation.valid, true, validation.errors.join('\n'));
  assert.equal(content.packId, 'philippines-v1');
  assert.equal(content.name, 'Philippine public-service scenarios');
  assert.equal(content.cases.length, 32);
  assert.equal(content.cases.reduce((sum,item) => sum + Object.values(item.stages).flat().length, 0), 256);
  assert.deepEqual(content.themeIds, ['shared-mandate','technological-innovations','local-partners','collaborative-action']);
  content.cases.forEach(item => game.ACTIONS.forEach(action => {
    assert.ok(item.stages[action].some(card => card.difficulty === 1));
    assert.ok(item.stages[action].some(card => card.difficulty === 2));
    item.stages[action].forEach(card => assert.ok(card.cue, card.id + ' needs a diagnostic cue'));
  }));
});

test('a resolution retains the answered card and its teaching cue', () => {
  let time = 0;
  const engine = new game.GameEngine({ content, seed: 6, clock: () => time });
  engine.start('relaxed', time);
  const answered = Object.assign({}, engine.currentCard);
  const result = engine.answer(answered.action, time = 100);
  assert.equal(result.accepted, true);
  assert.equal(result.resolvedCard.id, answered.id);
  assert.equal(result.resolvedCard.signal, answered.signal);
  assert.equal(result.cue, answered.cue);
  assert.notEqual(result.snapshot.currentCard.id, answered.id);
});

test('same seed and decisions are independent of render frame rate', () => {
  assert.equal(checksum(12345, 16), checksum(12345, 137));
});

test('chronological advancement matches one coarse tick', () => {
  let fineTime = 0;
  let coarseTime = 0;
  const fine = new game.GameEngine({ content, seed: 222, clock: () => fineTime });
  const coarse = new game.GameEngine({ content, seed: 222, clock: () => coarseTime });
  fine.start('classic', 0);
  coarse.start('classic', 0);
  for (fineTime = 16; fineTime <= 15000; fineTime += 16) fine.tick(fineTime);
  fineTime = 15000;
  fine.tick(fineTime);
  coarseTime = 15000;
  coarse.tick(coarseTime);
  assert.equal(fine.snapshot(fineTime).trust, coarse.snapshot(coarseTime).trust);
  assert.equal(fine.snapshot(fineTime).queueLength, coarse.snapshot(coarseTime).queueLength);
  assert.equal(fine.currentCard.id, coarse.currentCard.id);
  assert.equal(fine.deadlineAt, coarse.deadlineAt);
  assert.equal(fine.nextArrivalAt, coarse.nextArrivalAt);
});

test('a bloom requires four successful advances by the same case', () => {
  let time = 0;
  const engine = new game.GameEngine({ content, seed: 7, clock: () => time });
  engine.start('relaxed', time);
  const caseId = engine.currentCard.caseId;
  const alternatives = engine.caseOrder.filter(id => id !== caseId).slice(0, 2);
  for (let step = 0; step < 4; step += 1) {
    engine.queue = [caseId].concat(alternatives);
    engine.recentCases = [];
    engine.activateCurrent(time);
    time += 100;
    const result = engine.answer(engine.currentCard.action, time);
    assert.equal(result.correct, true);
    assert.equal(engine.blooms, step === 3 ? 1 : 0);
  }
});

test('presented cases observe a two-case cooldown after failure', () => {
  let time = 0;
  const engine = new game.GameEngine({ content, seed: 8, clock: () => time });
  engine.start('relaxed', time);
  const seen = [engine.currentCard.caseId];
  for (let count = 0; count < 2; count += 1) {
    const expected = engine.currentCard.action;
    const wrong = game.ACTIONS.find(action => action !== expected);
    engine.answer(wrong, time += 100);
    seen.push(engine.currentCard.caseId);
  }
  assert.equal(new Set(seen).size, 3, seen.join(','));
});

test('wrong choices, timeouts, and late input apply one penalty', () => {
  let time = 0;
  const engine = new game.GameEngine({ content, seed: 9, clock: () => time });
  engine.start('classic', time);
  const wrong = game.ACTIONS.find(action => action !== engine.currentCard.action);
  engine.answer(wrong, time = 500);
  assert.equal(engine.trust, 84);
  const deadline = engine.deadlineAt;
  const late = engine.answer(engine.currentCard.action, time = deadline);
  assert.equal(late.accepted, false);
  assert.equal(late.expired, true);
  assert.equal(engine.trust, 62);
  assert.equal(engine.score, 0);
});

test('pause freezes deadlines and independent arrivals', () => {
  let time = 0;
  const engine = new game.GameEngine({ content, seed: 11, clock: () => time });
  engine.start('classic', time);
  const deadline = engine.deadlineAt;
  const arrival = engine.nextArrivalAt;
  engine.pause(time = 1000);
  engine.tick(time = 51000);
  assert.equal(engine.state, 'paused');
  engine.resume(time);
  assert.equal(engine.deadlineAt, deadline + 50000);
  assert.equal(engine.nextArrivalAt, arrival + 50000);
});

test('Trust and both overload end states are reachable without exceeding capacity', () => {
  let time = 0;
  const trustEngine = new game.GameEngine({ content, seed: 13, clock: () => time });
  trustEngine.start('classic', time);
  while (trustEngine.state === 'playing') {
    const wrong = game.ACTIONS.find(action => action !== trustEngine.currentCard.action);
    trustEngine.answer(wrong, time += 10);
  }
  assert.equal(trustEngine.endReason, 'trust');
  for (const mode of ['classic','relaxed']) {
    const overload = new game.GameEngine({ content, seed: mode === 'classic' ? 14 : 15, clock: () => time });
    overload.start(mode, time = 0);
    overload.queue = overload.caseOrder.slice(0, overload.rules().queueCap);
    overload.addArrival(time);
    assert.equal(overload.endReason, 'overload');
    assert.ok(overload.queue.length <= overload.rules().queueCap);
  }
});

test('randomized simulations preserve state and meet survival targets', () => {
  const noviceClassic = [];
  const noviceRelaxed = [];
  const reasons = {};
  let classicBlooms = 0;
  for (let seed = 1; seed <= 100; seed += 1) {
    const classic = simulate(seed, 'classic', .82, 2200, 3800, 12 * 60 * 1000);
    const relaxed = simulate(seed, 'relaxed', .82, 2200, 3800, 18 * 60 * 1000);
    noviceClassic.push(classic.duration);
    noviceRelaxed.push(relaxed.duration);
    reasons[classic.snapshot.endReason || 'limit'] = (reasons[classic.snapshot.endReason || 'limit'] || 0) + 1;
    classicBlooms += classic.snapshot.blooms;
    [classic, relaxed].forEach(result => {
      assert.ok(Number.isFinite(result.snapshot.score));
      assert.ok(result.snapshot.trust >= 0 && result.snapshot.trust <= 100);
      assert.ok(result.snapshot.queueLength <= result.snapshot.queueCap);
    });
  }
  const classicMedian = median(noviceClassic);
  const relaxedMedian = median(noviceRelaxed);
  assert.ok(classicMedian >= 180000 && classicMedian <= 300000, 'Classic novice median was ' + Math.round(classicMedian / 1000) + 's; reasons ' + JSON.stringify(reasons) + '; avg blooms ' + (classicBlooms / 100).toFixed(1));
  assert.ok(relaxedMedian >= classicMedian * 1.5, 'Relaxed/Classic survival ratio was ' + (relaxedMedian / classicMedian).toFixed(2));
  for (let seed = 1; seed <= 100; seed += 1) {
    const strong = simulate(seed, 'classic', .95, 900, 1800, 8 * 60 * 1000);
    assert.ok(strong.duration >= 8 * 60 * 1000, 'Strong seed ' + seed + ' ended at ' + Math.round(strong.duration / 1000) + 's');
  }
  console.log('metrics - novice classic median ' + Math.round(classicMedian / 1000) + 's; relaxed ' + Math.round(relaxedMedian / 1000) + 's');
});

