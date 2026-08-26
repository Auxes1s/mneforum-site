'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const game = require('../engine-v1.js');

const caseRoot = path.resolve(__dirname, '..', 'cases');
const packFiles = fs.readdirSync(caseRoot).filter(name => /^[a-z0-9-]+\.js$/.test(name)).sort();

function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (error) { console.error('not ok - ' + name); throw error; }
}

function loadCasePack(name) {
  let registeredId = '';
  let content = null;
  const sandbox = {
    BuzzCasePacks: {
      register: function (id, pack) {
        registeredId = id;
        content = pack;
        return true;
      }
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(caseRoot, name), 'utf8'), sandbox, { filename: name });
  return { registeredId, content };
}

test('at least one versioned case pack ships', () => {
  assert.ok(packFiles.length > 0);
  packFiles.forEach(name => assert.match(name, /-v\d+\.js$/));
});

packFiles.forEach(function (name) {
  test(name + ' registers under its filename and passes the engine contract', () => {
    const expectedId = name.slice(0, -3);
    const { registeredId, content } = loadCasePack(name);
    assert.equal(registeredId, expectedId);
    assert.ok(content, 'pack did not register');
    assert.equal(content.packId, expectedId);
    const validation = game.validateContent(content);
    assert.equal(validation.valid, true, validation.errors.join('\n'));
  });
});

test('Philippine AI scenarios state their context and missing decision in plain language', () => {
  const { content } = loadCasePack('philippines-ai-v2.js');
  const vaguePhrases = /\b(?:review needs|are established|is established|remains unexplained|remain unmeasured|subgroup effects|model drift)\b/i;
  content.cases.forEach(item => {
    item.stages.check.forEach(card => {
      assert.match(card.signal, /\b(?:AI|chatbot|image analysis)\b/i, card.id + ' does not identify the tool being assessed');
      assert.doesNotMatch(card.signal, vaguePhrases, card.id + ' uses compressed jargon');
    });
    item.stages.connect.forEach(card => {
      assert.match(card.signal, /(?:do not know|have not explained|have not separated)/i, card.id + ' does not state that the explanation is missing');
      assert.doesNotMatch(card.signal, vaguePhrases, card.id + ' uses compressed jargon');
    });
    item.stages.commit.forEach(card => {
      assert.match(card.signal, /\bno\b.*\b(?:action|owner|office|officer|manager|contractor|process|plan|pathway|protocol|route|rule|trial)\b/i, card.id + ' does not state the unassigned action or owner');
      assert.doesNotMatch(card.signal, vaguePhrases, card.id + ' uses compressed jargon');
    });
    item.stages.track.forEach(card => {
      assert.match(card.signal, /(?:started|active|operating|running|underway|live)/i, card.id + ' does not state that implementation has begun');
      assert.match(card.signal, /have not measured/i, card.id + ' does not state which results are missing');
      assert.doesNotMatch(card.signal, vaguePhrases, card.id + ' uses compressed jargon');
    });
  });
});

