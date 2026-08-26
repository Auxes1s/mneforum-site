import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const releaseCss = fs.readFileSync(path.join(root, 'assets', 'forum-release.css'), 'utf8').replace(/\r\n/g, '\n');
const speakerCss = fs.readFileSync(path.join(root, 'speaker-launch.css'), 'utf8').replace(/\r\n/g, '\n');
const gameCss = fs.readFileSync(path.join(root, 'game', 'game-v2.css'), 'utf8').replace(/\r\n/g, '\n');
const gameHtml = fs.readFileSync(path.join(root, 'game', 'index.html'), 'utf8').replace(/\r\n/g, '\n');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function count(value, pattern) {
  return (value.match(pattern) || []).length;
}

function gitBlobHash(file) {
  const bytes = fs.readFileSync(path.join(root, file));
  const header = Buffer.from(`blob ${bytes.length}\0`);
  return crypto.createHash('sha1').update(header).update(bytes).digest('hex');
}

// Runtime game code and content must remain identical to the deployed
// philippines-ai-v2 release. The stylesheet and homepage integration are
// intentionally adapted only to make deleted root decorations self-contained.
const deployedGameBlobs = {
  'game/.htaccess': '745d9d6d5a4a210fe6c6fbebc9aa3d644eaa40db',
  'game/README.md': '4a17e4e5d45b0cb345ea624b29ddedbb28262a2b',
  'game/cases/README.md': 'a3350c67ef32c5c041158a486ba064112622befa',
  'game/cases/forum-v1.js': 'e9a68446b1308e5b9114a714fedaabf2c85ae220',
  'game/cases/philippines-ai-v2.js': '670727e007d6d90a550ca715e0887a718721dfce',
  'game/cases/philippines-v1.js': 'fa61679c83c84aa6b2f107816ace319a23782a84',
  'game/content-loader-v1.js': '7ec9333f5dfb1aabdc0b10d37c7859a5af151216',
  'game/embed-v1.js': '1ed2caaec128efd0cfb14da3fe3cecfa2c4ffba2',
  'game/engine-v1.js': '77b1f0102a2d1c6fe397c7d0b1d94e5075a0fd97',
  'game/index.html': 'c8d6d2a6cfc95f79a0320eb11d5b6d9f7c850732',
  'game/package.json': '0fef86e3396e0b880777d43f3bde6195b0645abb',
  'game/tests/case-packs.test.js': '9f966f91934ede8b4b0a7f6ac2390963ca8befce',
  'game/tests/embed.test.js': 'b1f7a529d17d3f7e75d79dfc17b91d0a4306fa6e',
  'game/tests/engine.test.js': 'd2eb2e9f587e5758b1af07f0912cc2c07ee90b31',
  'game/ui-v2.js': '1f673284efcbca5f33e921a544eac33ca4c81378'
};

for (const [file, expected] of Object.entries(deployedGameBlobs)) {
  assert(fs.existsSync(path.join(root, file)), `Missing deployed game file: ${file}`);
  assert(gitBlobHash(file) === expected, `${file} no longer matches deployed commit 23dc149.`);
}

const visualBlobs = {
  'game/assets/background.png': 'a823df226430bcd97c308288a643844df17d5e6e',
  'game/shapes/shape1.png': '0777a740a25865d59dfb6952b10fc6d71a452430',
  'game/shapes/shape2.png': 'cc08e2717b110b259b537818408bdf3909e30364',
  'game/shapes/shape3.png': 'bdc914f17886d124c2fa7135ff1456875080611d',
  'game/shapes/shape4.png': 'c51c980673daca2c7a410f7b961e7d44086f2193',
  'game/shapes/shape5.png': '0b0212951877a7f6a6199ab0446da8cf99ab40de',
  'game/shapes/shape6.png': 'f44d7b14ba753db986e6454497bc5f39d4949ea2'
};

for (const [file, expected] of Object.entries(visualBlobs)) {
  assert(fs.existsSync(path.join(root, file)), `Missing game visual: ${file}`);
  assert(gitBlobHash(file) === expected, `${file} differs from the deployed visual asset.`);
}

const templateMatch = homepage.match(/<script type="__bundler\/template">([\s\S]*?)<\/script>/);
assert(templateMatch, 'Bundled page template is missing.');
let rendered = JSON.parse(templateMatch[1]);

const gameMatch = homepage.match(/const gameSection = `([\s\S]*?)`;\n    template = template\.replace/);
assert(gameMatch, 'The game section integration is missing.');
const gameSection = gameMatch[1];

rendered = rendered
  .replace('<a href="#program" aria-current="{{ navProgramCurrent }}" sc-camel-on-click="{{ closeMobileNav }}">Program</a>', '')
  .replace('<a class="btn btn-primary" href="#program">View the program</a>', '<a class="btn btn-primary" href="#speakers">Meet the speakers</a>')
  .replace('<a href="#program" style="color: inherit; text-decoration: none; opacity: .85;">Program</a>', '')
  .replace(/\n  <section id="program" class="program-section">[\s\S]*?<\/section>\n(?=\s*<section id="speakers")/, '\n')
  .replace(
    '<a href="#speakers" aria-current="{{ navSpeakersCurrent }}" sc-camel-on-click="{{ closeMobileNav }}">Speakers</a>',
    '<a href="#speakers" aria-current="{{ navSpeakersCurrent }}" sc-camel-on-click="{{ closeMobileNav }}">Speakers</a><a href="#game" aria-current="{{ navGameCurrent }}" sc-camel-on-click="{{ closeMobileNav }}">Game</a>'
  )
  .replace(
    '<a href="#speakers" style="color: inherit; text-decoration: none; opacity: .85;">Resource persons</a>',
    '<a href="#speakers" style="color: inherit; text-decoration: none; opacity: .85;">Resource persons</a><a href="#game" style="color: inherit; text-decoration: none; opacity: .85;">Buzz to Bloom game</a>'
  )
  .replace(
    'Strategic Outcome Evaluation Division<br><a href="mailto:mes-soed@depdev.gov.ph" style="color: inherit;">mes-soed@depdev.gov.ph</a>',
    'M&amp;E Forum Secretariat<br><a href="mailto:m%26enetworksecretariat@depdev.gov.ph" style="color: inherit;">m&amp;enetworksecretariat@depdev.gov.ph</a>'
  )
  .replace('\n  <section id="notes"', '\n  ' + gameSection + '\n\n  <section id="notes"');

assert(!rendered.includes('<section id="program"'), 'Program of activities still renders.');
assert(!rendered.includes('href="#program"'), 'A public #program link still renders.');
assert(!rendered.includes('Program of activities'), 'The Program heading still renders.');
assert(count(rendered, /<section id="game"/g) === 1, 'The game section must render exactly once.');
assert(count(rendered, /\bdata-buzz-to-bloom\b/g) === 1, 'The game iframe must render exactly once.');
assert(rendered.includes('src="game/?embed=1&amp;pack=philippines-ai-v2"'), 'The deployed Philippine AI pack is not embedded.');
assert(rendered.includes('sandbox="allow-scripts"'), 'The game sandbox is missing allow-scripts.');
assert(!/sandbox="[^"]*(?:allow-same-origin|allow-forms)/.test(rendered), 'The game sandbox grants unnecessary privileges.');
assert(rendered.includes('href="#game"'), 'Primary/footer access to the game is missing.');

const expectedAddress = 'm&amp;enetworksecretariat@depdev.gov.ph';
const expectedMailto = 'mailto:m%26enetworksecretariat@depdev.gov.ph';
assert(rendered.includes(expectedAddress), 'The visible Secretariat address is not HTML-escaped.');
assert(rendered.includes(expectedMailto), 'The Secretariat mailto is not percent-encoded.');
assert(!/m(?:%26|&amp;)eforumsecretariat@depdev\.gov\.ph/i.test(rendered), 'The old Forum Secretariat address still renders.');
assert(!/(?:%26|&amp;)?mes-soed@depdev\.gov\.ph/i.test(rendered), 'The old division address still renders in the Secretariat surface.');

const sectionIds = Array.from(rendered.matchAll(/<section\b[^>]*\bid="([^"]+)"/g), match => match[1]);
assert(new Set(sectionIds).size === sectionIds.length, 'Rendered section IDs are not unique.');
assert(sectionIds.includes('speakers') && sectionIds.includes('game') && sectionIds.includes('notes'),
  'The speaker-to-game-to-notes launch sequence is incomplete.');
assert(rendered.indexOf('<section id="speakers"') < rendered.indexOf('<section id="game"'),
  'The game must follow the speaker launch.');
assert(rendered.indexOf('<section id="game"') < rendered.indexOf('<section id="notes"'),
  'The game must precede notes and materials.');

for (const required of [
  'html,\nbody',
  'overflow-x: clip',
  '.game-frame iframe',
  'width: 100%',
  'max-width: 100%',
  'min-height: 48px',
  '@media (max-width: 600px)',
  '@media (max-width: 390px)',
  '@media (prefers-reduced-motion: reduce)',
  'html[data-thinking-mode="ultra"] .game-section'
]) {
  assert(releaseCss.includes(required), `Missing release CSS safeguard: ${required}`);
}

for (const required of [
  'overflow-x: auto',
  'grid-template-columns: 1fr',
  '@media (max-width: 520px)',
  '@media (max-width: 360px)',
  '@media (prefers-reduced-motion: reduce)'
]) {
  assert(speakerCss.includes(required), `Missing speaker phone safeguard: ${required}`);
}

const gameRefs = [
  ...Array.from(gameHtml.matchAll(/(?:src|href)="([^"]+)"/g), match => match[1]),
  ...Array.from(gameCss.matchAll(/url\("([^"]+)"\)/g), match => match[1])
].filter(ref => !ref.startsWith('#'));
for (const ref of gameRefs) {
  assert(!/^(?:https?:|data:)/.test(ref), `Game dependency must stay local: ${ref}`);
  assert(fs.existsSync(path.resolve(root, 'game', ref)), `Missing game dependency: ${ref}`);
}

const cssWithoutComments = releaseCss.replace(/\/\*[\s\S]*?\*\//g, '');
assert(count(cssWithoutComments, /\{/g) === count(cssWithoutComments, /\}/g),
  'Unbalanced braces in assets/forum-release.css.');

process.stdout.write(`Verified ${Object.keys(deployedGameBlobs).length} deployed game files and ${Object.keys(visualBlobs).length} visual assets.\n`);
process.stdout.write('Forum release checks passed.\n');
