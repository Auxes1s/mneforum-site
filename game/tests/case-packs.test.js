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

test('at least one versioned case pack ships', () => {
  assert.ok(packFiles.length > 0);
  packFiles.forEach(name => assert.match(name, /-v\d+\.js$/));
});

packFiles.forEach(function (name) {
  test(name + ' registers under its filename and passes the engine contract', () => {
    const expectedId = name.slice(0, -3);
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
    assert.equal(registeredId, expectedId);
    assert.ok(content, 'pack did not register');
    assert.equal(content.packId, expectedId);
    const validation = game.validateContent(content);
    assert.equal(validation.valid, true, validation.errors.join('\n'));
  });
});

