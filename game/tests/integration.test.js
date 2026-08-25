'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..', '..');
const gameRoot = path.resolve(__dirname, '..');

function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (error) { console.error('not ok - ' + name); throw error; }
}

const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const html = fs.readFileSync(path.join(gameRoot, 'index.html'), 'utf8');
const ui = fs.readFileSync(path.join(gameRoot, 'ui-v2.js'), 'utf8');
const loader = fs.readFileSync(path.join(gameRoot, 'content-loader-v1.js'), 'utf8');
const css = fs.readFileSync(path.join(gameRoot, 'game-v2.css'), 'utf8');
const embed = fs.readFileSync(path.join(gameRoot, 'embed-v1.js'), 'utf8');
const engine = fs.readFileSync(path.join(gameRoot, 'engine-v1.js'), 'utf8');

test('standalone assets are local, versioned, and present', () => {
  const refs = Array.from(html.matchAll(/(?:src|href)="([^"]+)"/g), match => match[1]).filter(ref => !ref.startsWith('#'));
  assert.deepEqual(Array.from(new Set(refs)).sort(), ['game-v2.css','content-loader-v1.js','engine-v1.js','ui-v2.js','../assets/forum-logo-v5-static.svg','../assets/butterfly-mark.svg'].sort());
  refs.forEach(ref => assert.equal(fs.existsSync(path.join(gameRoot, ref)), true, ref + ' is missing'));
  const cssRefs = Array.from(css.matchAll(/url\("([^"]+)"\)/g), match => match[1]);
  cssRefs.forEach(ref => assert.equal(fs.existsSync(path.join(gameRoot, ref)), true, ref + ' is missing'));
  assert.equal(/https?:\/\//.test(html), false);
  assert.doesNotMatch(html + css, /evidence-garden|signal-to-bloom|game\/assets/);
});

test('standalone markup has unique IDs and named controls', () => {
  const ids = Array.from(html.matchAll(/\sid="([^"]+)"/g), match => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'duplicate id found');
  const buttons = Array.from(html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g));
  assert.ok(buttons.length >= 16);
  buttons.forEach(match => assert.ok(match[1].replace(/<[^>]+>/g, '').trim(), 'button has no accessible text'));
  assert.match(html, /<main id="game-main"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /role="meter"/);
  assert.match(html, /id="game-status"[^>]*role="status"[^>]*aria-atomic="true"/);
  assert.match(html, /id="case-title" tabindex="-1"/);
  assert.match(html, /id="results-title" tabindex="-1"/);
});

test('homepage uses the guarded sandboxed iframe integration', () => {
  assert.match(homepage, /gameSectionCount !== 1/);
  assert.match(homepage, /data-buzz-to-bloom src="game\/\?embed=1&amp;pack=\$\{encodeURIComponent\(gamePack\)\}"/);
  assert.match(homepage, /requestedGamePack/);
  assert.match(homepage, /\^\[a-z0-9\]/);
  assert.match(homepage, /sandbox="allow-scripts"/);
  assert.doesNotMatch(homepage, /sandbox="[^"]*allow-same-origin/);
  assert.match(homepage, /title="Buzz to Bloom evidence-to-action challenge"/);
  assert.match(homepage, /game\/embed-v1\.js/);
  assert.match(homepage, /bridge\.async = true/);
  assert.doesNotMatch(homepage.match(/template = template\.replace\(\s*'<\/title>'[\s\S]*?\);/)[0], /embed-v1/);
  assert.match(homepage, /html\[data-thinking-mode="ultra"\] \.evidence-game-section/);
});

test('homepage loader parses and the bundled template keeps one stable anchor', () => {
  const loader = homepage.match(/<script>\s*([\s\S]*?)<\/script>/);
  assert.ok(loader, 'outer loader not found');
  new vm.Script(loader[1], { filename: 'index-loader.js' });
  const packed = homepage.match(/<script type="__bundler\/template">([\s\S]*?)<\/script>/);
  assert.ok(packed, 'bundled template not found');
  const template = JSON.parse(packed[1]);
  assert.equal(template.split('<section id="program" class="program-section">').length - 1, 1);
});

test('message and storage boundaries are deny-by-default', () => {
  assert.match(embed, /event\.source !== frame\.contentWindow/);
  assert.match(ui, /event\.source !== window\.parent/);
  assert.match(embed, /const incoming = normalizeRecord\(value\)/);
  assert.match(embed, /Math\.max\(480, Math\.min\(1200/);
  assert.match(ui, /mneforum:buzz-to-bloom:v1/);
  assert.match(ui, /if \(qaMode\) return/);
  assert.match(embed, /new MutationObserver/);
  assert.match(embed, /Math\.max\(current\.bests\[mode\]\.score/);
  assert.match(embed, /dataset\.forumPhase/);
});

test('the interface teaches the decision rule and pauses for accessible review', () => {
  assert.doesNotMatch(ui, /'Step ' \+ \(card\.stageIndex/);
  assert.doesNotMatch(html, /Signal 1 of 4/);
  assert.match(html, /first missing step/);
  assert.match(html, /id="answer-review"[^>]*hidden/);
  assert.match(html, /id="next-case-button"/);
  assert.match(html, /best fit in this four-step model/i);
  assert.match(ui, /inputLocked/);
  assert.match(ui, /tutorialSteps = \[/);
  assert.match(ui, /function enterReview/);
  assert.match(ui, /engine\.pause\(now\(\)\)/);
  assert.match(ui, /function continueAfterReview/);
  assert.match(ui, /Best fit in this loop:/);
  assert.match(ui, /window\.setInterval\([\s\S]*?, 1000\)/);
  assert.match(ui, /effectiveReducedMotion\(\)/);
  assert.match(ui, /accuracy-' \+ action/);
  assert.match(ui, /randomSeed\(\)/);
});

test('case packs are selected by a safe same-origin versioned loader', () => {
  assert.match(html, /data-case-pack="philippines-v1"/);
  assert.match(loader, /BuzzContentReady/);
  assert.match(loader, /PACK_PATTERN/);
  assert.match(loader, /script\.src = 'cases\/' \+ requestedId \+ '\.js'/);
  assert.match(loader, /id !== requestedId/);
  assert.doesNotMatch(loader, /fetch\(|XMLHttpRequest|https?:\/\//);
  assert.match(ui, /BuzzContent\.name/);
  assert.match(ui, /activeCasePack/);
});

test('pure engine has no wall-clock or ambient randomness dependency', () => {
  assert.doesNotMatch(engine, /Date\.now/);
  assert.doesNotMatch(engine, /Math\.random/);
  assert.match(engine, /mulberry32/);
});

test('game CSP denies connections and framing is same-site only', () => {
  const htaccess = fs.readFileSync(path.join(gameRoot, '.htaccess'), 'utf8');
  assert.match(html, /connect-src 'none'/);
  assert.match(htaccess, /connect-src 'none'/);
  assert.match(htaccess, /frame-ancestors 'self'/);
  assert.match(htaccess, /camera=\(\), microphone=\(\), geolocation=\(\), payment=\(\)/);
});
