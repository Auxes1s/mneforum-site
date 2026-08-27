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
const releaseCss = fs.readFileSync(path.join(root, 'assets', 'forum-release.css'), 'utf8');

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
  assert.match(html, /id="leaderboard-form" novalidate/);
  assert.match(html, /id="start-button"[^>]*type="button"/);
  assert.doesNotMatch(html, /id="start-button"[^>]*type="submit"/);
  assert.match(html, /id="leaderboard-consent"[^>]*required/);
  assert.match(html, /id="leaderboard-board"/);
  assert.match(html, /id="leaderboard-rows"/);
  assert.match(html, /Three misses can empty Trust; every correct decision restores it\./);
  assert.match(html, /data-action="check"[\s\S]*?<strong>Verify evidence<\/strong>/);
  assert.match(html, /data-action="connect"[\s\S]*?<strong>Investigate why<\/strong>/);
  assert.match(html, /data-action="commit"[\s\S]*?<strong>Assign action and owner<\/strong>/);
  assert.match(html, /data-action="track"[\s\S]*?<strong>Measure results<\/strong>/);
  assert.doesNotMatch(html, /<strong>(?:Connect|Commit|Track)<\/strong>/);
});

test('13th Forum homepage deliberately composes the guarded iframe integration', () => {
  assert.equal((homepage.match(/\bdata-buzz-to-bloom\b/g) || []).length, 1);
  assert.match(homepage, /<section id="game" class="game-section" aria-labelledby="buzz-to-bloom-title">/);
  assert.match(homepage, /src="game\/\?embed=1&amp;pack=philippines-ai-v2"/);
  assert.match(homepage, /sandbox="allow-scripts"/);
  assert.doesNotMatch(homepage, /sandbox="[^"]*allow-same-origin/);
  assert.doesNotMatch(homepage, /sandbox="[^"]*allow-forms/);
  assert.match(homepage, /Verify the evidence/);
  assert.match(homepage, /Investigate why/);
  assert.match(homepage, /Assign action and owner/);
  assert.match(homepage, /Measure results/);
  assert.doesNotMatch(homepage, /Check the signal/);
  assert.doesNotMatch(homepage, /Connect the context|Commit to action|Track what follows/);
  assert.match(homepage, /title="Buzz to Bloom evidence-to-action challenge"/);
  assert.match(homepage, /game\/embed-v1\.js/);
  assert.match(homepage, /data-game-phase-copy/);
  assert.match(homepage, /class="game-frame-link"[^>]*target="_blank"[^>]*rel="noopener"/);
  assert.match(homepage, /template = template\.replace\('\\n  <section id="program"', '\\n  ' \+ gameSection/);
  assert.match(homepage, /template = template\.replace\('<\/body>', '<script defer src="game\/embed-v1\.js"><\/\' \+ 'script><\/body>'\);/);
});

test('homepage scripts parse and the mobile frame remains usable', () => {
  const inlineScripts = Array.from(homepage.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g))
    .filter(match => !/\bsrc\s*=/.test(match[1]) && !/__bundler\/(?:manifest|template)/.test(match[1]))
    .map(match => match[2].trim())
    .filter(Boolean);
  assert.ok(inlineScripts.length >= 1, 'homepage loader script not found');
  inlineScripts.forEach((source, index) => new vm.Script(source, { filename: `index-inline-${index}.js` }));
  assert.match(releaseCss, /\.game-frame iframe \{[\s\S]*?width: 100%;[\s\S]*?max-width: 100%;[\s\S]*?min-width: 0;/);
  assert.match(releaseCss, /\.game-new-page,\s*\.game-frame-link \{[\s\S]*?min-height: 48px;/);
  assert.match(releaseCss, /@media \(max-width: 1024px\)[\s\S]*?\.game-section__inner \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(releaseCss, /@media \(max-width: 600px\)[\s\S]*?\.game-frame iframe \{[\s\S]*?height: 880px;/);
  assert.match(releaseCss, /@media \(max-width: 390px\)[\s\S]*?\.primary-nav\.is-open \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\);/);
  assert.doesNotMatch(releaseCss, /html,\s*body \{[\s\S]*?overflow-x:\s*(?:hidden|clip);/);
  assert.match(releaseCss, /#program \.section-shell \.program-row \{[\s\S]*?grid-template-rows: auto auto auto !important;/);
  assert.match(css, /\.start-card \.reset-button \{ min-height: 48px;/);
  assert.match(css, /\.primary-button, \.text-button, \.tutorial-actions button, \.action-grid button, \.pause-button \{ min-height: 48px;/);
  assert.match(css, /@media \(max-width: 420px\)[\s\S]*?\.leaderboard-entry \{ grid-template-columns: 1fr; \}/);
});

test('message and storage boundaries are deny-by-default', () => {
  assert.match(embed, /event\.source !== frame\.contentWindow/);
  assert.match(ui, /event\.source !== window\.parent/);
  assert.match(embed, /const incoming = normalizeRecord\(value\)/);
  assert.match(embed, /Math\.max\(480, Math\.min\(3200/);
  assert.match(ui, /Math\.max\(480, Math\.min\(3200/);
  assert.match(ui, /mneforum:buzz-to-bloom:v1/);
  assert.match(ui, /if \(qaMode\) return/);
  assert.match(embed, /new MutationObserver/);
  assert.match(embed, /Math\.max\(current\.bests\[mode\]\.score/);
  assert.match(embed, /dataset\.forumPhase/);
  assert.match(embed, /normalizeLeaderboard\(value\)/);
  assert.match(embed, /submittedRuns\.has\(normalized\.runId\)/);
  assert.match(embed, /type === 'leaderboard-submit'/);
  assert.match(embed, /type === 'leaderboard-refresh'/);
  assert.match(ui, /data\.type === 'leaderboard-data'/);
  assert.match(ui, /el\['start-button'\]\.addEventListener\('click', requestStart\)/);
  assert.doesNotMatch(ui, /requestSubmit\(/);
});

test('leaderboard submission stays opt-in and the static reader exposes only sanitized score fields', () => {
  assert.match(ui, /normalizeLeaderboardName/);
  assert.match(html, /leaderboard-consent/);
  assert.match(ui, /post\('leaderboard-submit'/);
  assert.match(ui, /qaMode \|\| !embedded/);
  assert.match(embed, /1FAIpQLSdy6j1jY3j9V9GWVu6tBGgiLcywYRh7usE_ARgmbUt0wZU-nA\/formResponse/);
  ['859026358','2020774595','1283027792','763328471','500050364','1871953852','92678991','182554224','968740099','979688023','1908868056'].forEach(id => assert.match(embed, new RegExp('entry\\.' + id)));
  assert.match(homepage, /sandbox="allow-scripts"/);
  assert.doesNotMatch(homepage, /sandbox="[^"]*allow-forms/);
  assert.doesNotMatch(html, /docs\.google\.com|formResponse/);
  assert.match(embed, /1MIiMCbrTRRf_oYMa4AjFp9qkv9sycJIFsllxfGfZqWw/);
  assert.match(embed, /select C,D,E,F,G,H,J/);
  assert.match(embed, /M = 'Yes, publish this run'/);
  assert.doesNotMatch(embed, /select [^\n]*B,/);
  assert.match(embed, /AUTOTEST-/);
  assert.doesNotMatch(embed, /emailAddress|PLACEHOLDER_EMAIL/);
  assert.match(ui, /cell\.textContent = String\(value\)/);
});

test('the interface teaches the decision rule and pauses for accessible review', () => {
  assert.doesNotMatch(ui, /'Step ' \+ \(card\.stageIndex/);
  assert.doesNotMatch(html, /Signal 1 of 4/);
  assert.match(html, /earliest action (?:the team )?has not (?:yet )?completed/i);
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
  assert.match(html, /data-case-pack="philippines-ai-v2"/);
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
