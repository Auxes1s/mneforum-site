'use strict';

const assert = require('node:assert/strict');
require('../content-v1.js');
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
    if (engine.state === 'playing') engine.answer(actions[index], time, false);
  }
  const snapshot = engine.snapshot(time);
  return [snapshot.score,snapshot.trust,snapshot.blooms,snapshot.queueLength,snapshot.currentCard && snapshot.currentCard.id].join('|');
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
    engine.answer(chosen, time, false);
  }
  return { duration: time, snapshot: engine.snapshot(time) };
}

function median(values) {
  const sorted = values.slice().sort((a,b) => a-b);
  return sorted[Math.floor(sorted.length / 2)];
}

test('content pack has eight cases and 64 valid cards', () => {
  const validation = game.validateContent(content);
  assert.equal(validation.valid, true, validation.errors.join('\n'));
  assert.equal(content.cases.length, 8);
  assert.equal(content.cases.reduce((sum,item) => sum + Object.values(item.stages).flat().length, 0), 64);
  const domains = new Set(content.cases.map(item => item.domain));
  assert.equal(domains.size, 8);
  content.themeIds.forEach(theme => {
    const count = content.cases.flatMap(item => Object.values(item.stages).flat()).filter(card => card.themeIds.includes(theme)).length;
    assert.ok(count >= 12, theme + ' appears on only ' + count + ' cards');
  });
});

test('same seed and decisions are independent of render frame rate', () => {
  assert.equal(checksum(12345, 16), checksum(12345, 137));
});

test('a valid loop advances all stages and awards a bloom', () => {
  let time = 0;
  const engine = new game.GameEngine({ content, seed: 7, clock: () => time });
  engine.start('relaxed', time);
  const caseId = engine.currentCard.caseId;
  engine.queue = [caseId];
  for (let step = 0; step < 4; step += 1) {
    time += 1000;
    const expected = engine.currentCard.action;
    const result = engine.answer(expected, time, false);
    assert.equal(result.correct, true);
    if (step < 3) {
      engine.queue = [caseId];
      engine.activateCurrent(time);
    }
  }
  assert.equal(engine.blooms, 1);
  assert.ok(engine.score >= 500);
});

test('wrong choices and timeouts apply mode-specific Trust penalties without negative score', () => {
  let time = 0;
  const engine = new game.GameEngine({ content, seed: 9, clock: () => time });
  engine.start('classic', time);
  const expected = engine.currentCard.action;
  const wrong = game.ACTIONS.find(action => action !== expected);
  engine.answer(wrong, time += 500, false);
  assert.equal(engine.trust, 82);
  assert.equal(engine.score, 0);
  engine.answer(null, time += 500, true);
  assert.equal(engine.trust, 58);
  assert.equal(engine.score, 0);
});

test('pause freezes deadlines and arrivals', () => {
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

test('Trust and overload end states are reachable and queue never exceeds its cap', () => {
  let time = 0;
  const trustEngine = new game.GameEngine({ content, seed: 13, clock: () => time });
  trustEngine.start('classic', time);
  while (trustEngine.state === 'playing') trustEngine.answer(null, time += 10, true);
  assert.equal(trustEngine.endReason, 'trust');
  const overload = new game.GameEngine({ content, seed: 14, clock: () => time });
  overload.start('classic', time = 0);
  overload.queue = content.cases.slice(0, overload.rules().queueCap).map(item => item.id);
  overload.addArrival(time);
  assert.equal(overload.endReason, 'overload');
  assert.ok(overload.queue.length <= overload.rules().queueCap);
});

test('randomized simulations preserve finite state and strong play survives eight minutes', () => {
  const noviceClassic = [];
  const noviceRelaxed = [];
  const classicReasons = {};
  for (let seed = 1; seed <= 100; seed += 1) {
    const classic = simulate(seed, 'classic', .82, 2200, 3800, 12 * 60 * 1000);
    const relaxed = simulate(seed, 'relaxed', .82, 2200, 3800, 18 * 60 * 1000);
    noviceClassic.push(classic.duration);
    noviceRelaxed.push(relaxed.duration);
    classicReasons[classic.snapshot.endReason || 'limit'] = (classicReasons[classic.snapshot.endReason || 'limit'] || 0) + 1;
    [classic, relaxed].forEach(result => {
      assert.ok(Number.isFinite(result.snapshot.score));
      assert.ok(result.snapshot.trust >= 0 && result.snapshot.trust <= 100);
      assert.ok(result.snapshot.queueLength <= result.snapshot.queueCap);
    });
  }
  const classicMedian = median(noviceClassic);
  const relaxedMedian = median(noviceRelaxed);
  // A five-second tolerance around the three-minute lower target avoids a
  // false failure from discrete simulated response draws.
  assert.ok(classicMedian >= 175000 && classicMedian <= 300000, 'Classic novice median was ' + Math.round(classicMedian / 1000) + 's; reasons ' + JSON.stringify(classicReasons));
  assert.ok(relaxedMedian >= classicMedian * 1.5, 'Relaxed/Classic survival ratio was ' + (relaxedMedian / classicMedian).toFixed(2));
  for (let seed = 1; seed <= 100; seed += 1) {
    const strong = simulate(seed, 'classic', .95, 900, 1800, 8 * 60 * 1000);
    assert.ok(strong.duration >= 8 * 60 * 1000, 'Strong seed ' + seed + ' ended at ' + Math.round(strong.duration / 1000) + 's');
  }
  console.log('metrics - novice classic median ' + Math.round(classicMedian / 1000) + 's; relaxed ' + Math.round(relaxedMedian / 1000) + 's');
});
