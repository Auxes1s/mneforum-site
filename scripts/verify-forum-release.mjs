import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createDevPreview } from './dev-preview.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const readText = file => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const homepage = readText(path.join(root, 'index.html'));
const devHomepage = readText(path.join(root, 'dev', 'index.html'));
const releaseCss = readText(path.join(root, 'assets', 'forum-release.css'));
const responsiveCss = readText(path.join(root, 'assets', 'forum-responsive.css'));
const uiLockCss = readText(path.join(root, 'assets', 'forum-ui-lock.css'));
const brandCss = readText(path.join(root, 'assets', 'forum-brand.css'));
const speakerCss = readText(path.join(root, 'speaker-launch.css'));
const gameCss = readText(path.join(root, 'game', 'game-v2.css'));
const gameHtml = readText(path.join(root, 'game', 'index.html'));
const buildScript = readText(path.join(root, 'scripts', 'build-static.mjs'));
const htaccess = readText(path.join(root, '.htaccess'));
const roster = JSON.parse(readText(path.join(root, 'data', 'resource-person-roster.json')));

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
assert(!homepage.includes('PROGRAM_REVEAL_AT') && !homepage.includes('programReleased'),
  'The Program must remain visible without a date gate.');

rendered = rendered
  .replace(
    '<a href="#overview" aria-current="{{ navOverviewCurrent }}" sc-camel-on-click="{{ closeMobileNav }}">Overview</a>',
    '<a href="#overview" aria-current="{{ navOverviewCurrent }}" sc-camel-on-click="{{ closeMobileNav }}">Overview</a><a href="#game" aria-current="{{ navGameCurrent }}" sc-camel-on-click="{{ closeMobileNav }}">Game</a>'
  )
  .replace(
    '<a href="#speakers" style="color: inherit; text-decoration: none; opacity: .85;">Resource persons</a>',
    '<a href="#speakers" style="color: inherit; text-decoration: none; opacity: .85;">Resource persons</a><a href="#game" style="color: inherit; text-decoration: none; opacity: .85;">Buzz to Bloom game</a>'
  )
  .replace(
    'Strategic Outcome Evaluation Division<br><a href="mailto:mes-soed@depdev.gov.ph" style="color: inherit;">mes-soed@depdev.gov.ph</a>',
    'M&amp;E Forum Secretariat<br><a href="mailto:m%26enetworksecretariat@depdev.gov.ph" style="color: inherit;">m&amp;enetworksecretariat@depdev.gov.ph</a><br>Strategic Outcome Evaluation Division<br><a href="mailto:%26mes-soed@depdev.gov.ph" style="color: inherit;">&amp;mes-soed@depdev.gov.ph</a>'
  )
  .replace('\n  <section id="program"', '\n  ' + gameSection + '\n\n  <section id="program"');

assert((rendered.match(/<section id="program" class="program-section">/g) || []).length === 1,
  'The Program section must render exactly once.');
assert(rendered.includes('href="#program"'), 'Public access to the Program section is missing.');
assert(homepage.includes('/\\s*<div class="hero__actions">[\\s\\S]*?<\\/div>/'),
  'The runtime transform that removes the retired hero action row is missing.');
const venueMapHref = 'https://www.google.com/maps/search/?api=1&query=EDSA%20Shangri-La%2C%20Manila%2C%201%20Garden%20Way%2C%20Ortigas%20Centre%2C%20Mandaluyong%20City%201550%2C%20Philippines';
assert(homepage.includes(`const VENUE_MAP_HREF = '${venueMapHref}';`),
  'The Forum venue map URL is missing or changed.');
assert(homepage.includes('class="tag tag-neutral hero__venue-link"') &&
  homepage.includes('>EDSA Shangri-La, Manila</a>') &&
  homepage.includes('aria-label="EDSA Shangri-La, Manila on Google Maps (opens in a new tab)"') &&
  homepage.includes('target="_blank" rel="noopener noreferrer"') &&
  !homepage.includes('View on Google Maps'),
  'The Forum venue must be the sole visible label of its accessible Google Maps chip.');
assert(devHomepage.includes('class="tag tag-neutral hero__venue-link"') &&
  devHomepage.includes('>EDSA Shangri-La, Manila</a>') &&
  !devHomepage.includes('View on Google Maps'),
  'The development preview is missing the venue-only Google Maps chip.');
assert(rendered.includes('Program of activities'), 'The Program heading is missing.');
for (const sessionTitle of [
  'Plenary 1 — Setting the Chrysalis: AI Readiness and Evidence Gaps in the Public Sector',
  'Breakout 1 — Unpacking the Cocoon: Practical AI Use Cases in Public Sector Monitoring',
  'Breakout 2 — Taking Shape: Emerging AI-Enabled Methodologies in Evaluation',
  'Plenary 2 — Blooming Forward: Safeguarding Trust, Integrity, and Governance in AI-Enabled M&E'
]) {
  assert(rendered.includes(sessionTitle), `The Program is missing or mislabels: ${sessionTitle}`);
}

const generatedDevHomepage = createDevPreview(homepage);
const intentionalDevSpeakerPreview = devHomepage.includes(
  '// DEV-ONLY SPEAKER PREVIEW: intentionally maintained ahead of production.'
);
assert(devHomepage === generatedDevHomepage || intentionalDevSpeakerPreview,
  'dev/index.html is stale. Run npm run sync:dev, or retain the reviewed dev-only preview marker.');
assert(!homepage.includes('DEV-ONLY SPEAKER PREVIEW'),
  'The development-only speaker preview marker must never enter production HTML.');
assert(homepage.includes('<meta name="robots" content="index,follow">'),
  'The production homepage must remain indexable.');
assert(devHomepage.includes('<meta name="robots" content="noindex,nofollow">'),
  'The development preview shell must not be indexed.');
assert(devHomepage.includes("'<meta name=\"robots\" content=\"noindex,nofollow\"><link rel=\"canonical\""),
  'The unpacked development document must retain its noindex directive.');
assert(homepage.includes('const speakerWaveOverride = new URLSearchParams(window.location.search).get("speakerWave");'),
  'Production speaker reveals must remain date-gated with the existing review override.');
assert(devHomepage.includes('const speakerWaveOverride = "all"; // Full-layout reviewer preview.'),
  'The development preview must reveal every populated speaker record.');
assert(!devHomepage.includes('const speakerWaveOverride = new URLSearchParams(window.location.search).get("speakerWave");'),
  'The development preview must not accept a query that re-conceals the layout.');
const pendingRoster = roster.roster.filter(record => record.status === 'pending_confirmation');
assert(pendingRoster.length === 0, `Expected no pending roster entries after directory confirmation; found ${pendingRoster.length}.`);
assert(!/for confirmation/i.test(homepage) && !/for confirmation/i.test(devHomepage),
  'Production and development HTML must not expose a For Confirmation label.');
assert(devHomepage.includes('<span class="tag tag-accent">Resource persons</span>'),
  'Development preview must label the complete directory-confirmed roster.');
assert(htaccess.includes('RewriteRule ^dev$ dev/index.html [END]'),
  'The Apache /dev route must serve the physical development preview.');
assert(htaccess.includes('RewriteRule ^$ dev/index.html [END]'),
  'The development subdomain must serve the physical development preview.');

const brandFonts = [
  'assets/fonts/Satoshi-Regular.woff2',
  'assets/fonts/Satoshi-Bold.woff2',
  'assets/fonts/Plein-Black.woff2'
];

for (const file of brandFonts) {
  const fontPath = path.join(root, file);
  assert(fs.existsSync(fontPath), `Missing local brand font: ${file}`);
  assert(fs.statSync(fontPath).size > 15000, `Local brand font is unexpectedly small: ${file}`);
  assert(homepage.includes(file), `The homepage does not preload ${file}.`);
}
assert(fs.existsSync(path.join(root, 'assets', 'fonts', 'Fontshare-FFL.txt')),
  'The Fontshare license supplied with the local brand fonts is missing.');
assert(!brandCss.includes('api.fontshare.com'),
  'The Forum brand stylesheet must not depend on the restricted Fontshare API.');
assert(brandCss.includes('fonts/Satoshi-Regular.woff2') &&
  brandCss.includes('fonts/Satoshi-Bold.woff2') &&
  brandCss.includes('fonts/Plein-Black.woff2'),
  'The Forum brand stylesheet does not register all approved local faces.');
assert(homepage.includes('meta: "Plenary 1", title: "Setting the Chrysalis: AI Readiness and Evidence Gaps in the Public Sector"'),
  'The Resource Persons area mislabels Plenary 1.');
assert(!homepage.includes('meta: "Plenary 1", title: "Unpacking the Cocoon:'),
  'The Resource Persons area still assigns the Breakout 1 title to Plenary 1.');
assert(homepage.includes('label: "Keynote, Forum voices, Plenary 1, and Breakout 1"') &&
  homepage.includes('label: "Plenary 2 and Breakout 2"'),
  'The live Resource Persons reveal schedule must include every session group.');
assert(homepage.includes('const revealedSpeakerSessionIds = SPEAKER_SESSIONS') &&
  homepage.includes('.filter(session => revealedWaveIds.includes(session.wave))') &&
  homepage.includes('.map(session => session.id);'),
  'The live speaker section must reveal every session in the released waves.');
assert(homepage.includes('const isConcealed = !revealedSpeakerSessionIds.includes(session.id);'),
  'Speaker cards must retain the date-aware concealment guard.');
assert(homepage.includes('{ id: "breakout-1", label: "Breakout 1" }') &&
  homepage.includes('{ id: "breakout-2", label: "Breakout 2" }'),
  'Resource-person filters must include both breakout groups.');
assert(!homepage.includes('.filter(session => visibleSpeakerSessionIds.includes(session.id))'),
  'Unrevealed session cards must not be removed from the live speaker section.');

const speakerRecords = Array.from(homepage.matchAll(
  /\{ name: "([^"]+)",(?: position: "([^"]+)",)? org: "([^"]+)", role: "([^"]+)", sessionId: "([^"]+)", wave: "([^"]+)", photo: "([^"]*)", objectPosition: "([^"]+)"(?:, photoScale: "([^"]+)")? \}/g
), match => ({
  name: match[1], position: match[2] || '', org: match[3], role: match[4], sessionId: match[5],
  wave: match[6], photo: match[7], objectPosition: match[8], photoScale: match[9] || ''
}));
const expectedSpeakerNames = [
  'Arsenio M. Balisacan',
  'Christophe Bahuet',
  'Roderick M. Planta',
  'Diane Gail L. Maharjan',
  'Rosemarie G. Edillon',
  'Suparna Roy',
  'Rosstyn Fallorina',
  'Cezar Pedraza',
  'Maria Victoria C. Castro',
  'Vivien E. Suerte-Cortez',
  'Atty. Johann Carlos S. Barcena, CESO III',
  'Joseph J. Capuno, PhD',
  'Wilford Will L. Wong',
  'Johannes Paulus B. Acuña',
  'Jasmin C. Zantua',
  'Syrus Gomari',
  'John Randy Cabanes',
  'Mario Christopher G. Gumba',
  'Maria Sherinna Ysabel S. Jose',
  'Ralph Camelo Mariano',
  'Pita S. Picpican',
  'Francis Camarao',
  'Mary Ash Day O. Malimit',
  'Sonia L. Asilo',
  'Mark Edwin A. Tupas',
  'Karl Robert L. Jandoc',
  'Jose Ramon “Toots” T. Albert',
  'Reinald Adrian D. Pugoy',
  'Josefina V. Almeda',
  'Sebastian Felipe Bundoc',
  'Aleli Kraft',
  'Christopher James R. Cabuay',
  'Kris Ann M. Melad',
  'Agnes E. Tolentino',
  'Lorraine Goyena',
  'David Joseph Emmanuel B. Yap Jr.',
  'Ryan S. Lita',
   'Yuko Lisette R. Domingo',
   'Kerry Albright'
];
assert(speakerRecords.length === expectedSpeakerNames.length,
  `Expected ${expectedSpeakerNames.length} resource-person records; found ${speakerRecords.length}.`);
assert(new Set(speakerRecords.map(speaker => speaker.name)).size === speakerRecords.length,
  'Resource-person names must be unique.');
for (const name of expectedSpeakerNames) {
  assert(speakerRecords.some(speaker => speaker.name === name), `Missing confirmed resource person: ${name}`);
}
assert(!speakerRecords.some(speaker => speaker.name === 'Kim Robert C. De Leon'),
  'The superseded Plenary 2 DBM representative is still present.');
assert(speakerRecords.filter(speaker => speaker.sessionId === 'plenary-2').every(speaker => speaker.position),
  'Every live Plenary 2 resource person must show a position or designation.');
assert(speakerRecords.filter(speaker => speaker.sessionId === 'plenary-1').every(speaker => speaker.position),
  'Every Plenary 1 resource person must show a position or designation.');
assert(speakerRecords.filter(speaker => speaker.sessionId === 'opening-closing').every(speaker => speaker.position),
  'Every keynote and Forum voice must show a position or designation.');
assert(speakerRecords.every(speaker => speaker.position),
  'Every resource-person card must show a position or designation.');
assert(!speakerRecords.some(speaker => /designation not provided/i.test(speaker.position)),
  'The confirmed breakout roster must not fall back to an unverified missing-designation label.');
const expectedBreakoutPositions = {
  'Suparna Roy': 'Digital Technology Specialist (AI & Data Analytics)',
  'Cezar Pedraza': 'Director, Planning and Evaluation Service',
  'Rosemarie G. Edillon': 'Undersecretary, Policy and Planning Group',
  'John Randy Cabanes': 'Officer-in-Charge, City Transportation Development and Management Office (CTDMO)',
  'Mario Christopher G. Gumba': 'Engineer I and concurrent Local Transport Specialist, City Planning and Development Office (CPDO)',
  'Pita S. Picpican': 'Assistant Regional Director for Technical Services',
  'Mark Edwin A. Tupas': 'Director IV, Space Information Infrastructure Bureau',
  'Reinald Adrian D. Pugoy': 'Associate Professor of Computer Science and Information Systems, and Director, Information and Communication Technology Development Office (ICTDO)',
  'Francis Camarao': 'Information Technology Officer II',
  'Sonia L. Asilo': 'Supervising Science Research Specialist',
  'Sebastian Felipe Bundoc': 'Senior Data Scientist',
  'Jose Ramon “Toots” T. Albert': 'Senior Research Fellow',
  'Lorraine Goyena': 'Enterprise Architect',
  'David Joseph Emmanuel B. Yap Jr.': 'Executive Director, Socio-Economic Research Bureau',
  'Ryan S. Lita': 'Undersecretary, Chief of Staff, and Functional Group Head of Local Government and Regional Operations (LGRO)',
  'Yuko Lisette R. Domingo': 'Chief Economic Development Specialist, Social Development Staff (SDS)',
  'Agnes E. Tolentino': 'Assistant Secretary, Regional Development Group (RDG)',
  'Kerry Albright': 'Advisor and Head of Evaluation Knowledge Management Unit'
};
for (const [name, position] of Object.entries(expectedBreakoutPositions)) {
  assert(speakerRecords.some(speaker => speaker.name === name && speaker.position === position),
    `${name} must show the repository-confirmed position: ${position}.`);
}
const expectedSessionCounts = {
  'opening-closing': 3,
  'plenary-1': 6,
  'plenary-2': 5,
  'breakout-1-1': 4,
  'breakout-1-2': 4,
  'breakout-1-3': 3,
  'breakout-2-1': 5,
  'breakout-2-2': 3,
  'breakout-2-3': 6
};
for (const [sessionId, expectedCount] of Object.entries(expectedSessionCounts)) {
  const actualCount = speakerRecords.filter(speaker => speaker.sessionId === sessionId).length;
  assert(actualCount === expectedCount,
    `${sessionId} must contain ${expectedCount} resource-person record(s); found ${actualCount}.`);
}
assert(homepage.includes('id: "breakout-1-3", wave: "wave1", order: 6, meta: "Breakout 1.3", title: "Flying from Afar: Advanced Technologies for Monitoring", teaserOnly: false'),
  'Breakout 1.3 must publish its confirmed moderator.');
assert(homepage.includes('id: "breakout-2-2", wave: "wave2", order: 8, meta: "Breakout 2.2", title: "Unfolding the Wings: Enhancing Causal Inference and Impact Evaluation with Machine Learning", teaserOnly: false'),
  'Breakout 2.2 must publish its confirmed lineup.');
const photoSpeakers = speakerRecords.filter(record => record.photo);
for (const speaker of photoSpeakers) {
  assert(fs.existsSync(path.join(root, speaker.photo)),
    `Missing resource-person photo for ${speaker.name}: ${speaker.photo}`);
  const scale = Number(speaker.photoScale);
  assert(Number.isFinite(scale) && scale >= 1 && scale <= 2,
    `Invalid face-focused scale for ${speaker.name}: ${speaker.photoScale || '(missing)'}`);
  assert(/^\d{1,3}% \d{1,3}%$/.test(speaker.objectPosition),
    `Invalid face focal position for ${speaker.name}: ${speaker.objectPosition}`);
}
assert(photoSpeakers.length === 30, `Expected 30 supplied resource-person photos; found ${photoSpeakers.length}.`);
assert(photoSpeakers.every(speaker => speaker.photoScale === '1.00' && speaker.objectPosition === '50% 50%'),
  'Pre-cropped speaker photos must render without browser zoom or focal repositioning.');
assert(!speakerRecords.some(speaker => /^(Usec\.|Asec\.|Mr\.|Ms\.|Dr\.|Engr\.|ARD\b|Assistant\b|Executive\b|Chief\b|OIC-)/.test(speaker.name)),
  'Displayed resource-person names must not include position titles.');
const speakerManifest = readText(path.join(root, 'assets', 'speakers', '2026', 'manifest.csv'));
assert(speakerManifest.includes('"Wilford Will L. Wong","wilford-wong.webp"') &&
  speakerManifest.includes('"225","225","7224","50% 50%","1.00","yes"'),
  'Wilford Wong photo provenance is missing or stale.');
const rosterPhotoRecords = roster.roster.filter(record => record.photo);
assert(rosterPhotoRecords.length === 27,
  `Expected 27 roster records with supplied portraits; found ${rosterPhotoRecords.length}.`);
for (const record of rosterPhotoRecords) {
  assert(fs.existsSync(path.join(root, record.photo)),
    `Missing roster portrait for ${record.id}: ${record.photo}`);
}
assert((speakerManifest.match(/"manual-square-crop"/g) || []).length === 30,
  'All supplied speaker photos must use the approved manual square crops.');
assert(speakerCss.includes('border-radius: 28%') && speakerCss.includes('clip-path: inset(0 round 28%)'),
  'Speaker avatars must use the approved squircle clipping geometry.');
assert(speakerCss.includes('border: 0;') && speakerCss.includes('background: transparent;') &&
  speakerCss.includes('outline: 0;'),
  'Speaker squircle edges must remain transparent.');
assert(homepage.includes('speaker-card__avatar-shell {{ s.avatarClass }}') &&
  homepage.includes('speaker-card__avatar {{ s.avatarClass }}') &&
  speakerCss.includes('.speaker-session .speaker-card__avatar.has-photo'),
  'Photo avatars must override the global initials background and inset border.');
assert(speakerCss.includes('drop-shadow(0 1px 1px rgba(5, 42, 82, .34))') &&
  speakerCss.includes('drop-shadow(0 5px 9px rgba(5, 42, 82, .22))'),
  'Photo squircles must use the approved two-layer silhouette shadow.');
assert(speakerCss.includes('.speaker-session .speaker-card__avatar img') &&
  speakerCss.includes('transform: none;'),
  'Pre-cropped speaker photos must not be enlarged by CSS transforms.');
const speakerSessionsMatch = homepage.match(/const SPEAKER_SESSIONS = \[([\s\S]*?)\n\];/);
assert(speakerSessionsMatch, 'The speaker-session definitions are missing.');
const speakerSessionsSource = speakerSessionsMatch[1];
for (const breakoutId of [
  'breakout-1-1', 'breakout-1-2', 'breakout-1-3',
  'breakout-2-1', 'breakout-2-2', 'breakout-2-3'
]) {
  const line = speakerSessionsSource.split('\n').find(value => value.includes(`id: "${breakoutId}"`));
  assert(line && !line.includes('promise:'), `${breakoutId} must not duplicate its Program description.`);
}
for (const retainedCaptionId of ['opening-closing', 'plenary-1', 'plenary-2']) {
  const line = speakerSessionsSource.split('\n').find(value => value.includes(`id: "${retainedCaptionId}"`));
  assert(line && line.includes('promise:'), `${retainedCaptionId} must retain its speaker-section caption.`);
}
assert(homepage.includes('<sc-if value="{{ session.hasPromise }}">') &&
  homepage.includes('hasPromise: !!session.promise'),
  'Speaker-session captions must render conditionally without leaving empty spacing.');
assert(count(rendered, /<section id="game"/g) === 1, 'The game section must render exactly once.');
assert(count(rendered, /\bdata-buzz-to-bloom\b/g) === 1, 'The game iframe must render exactly once.');
assert(rendered.includes('src="game/?embed=1&amp;pack=philippines-ai-v2"'), 'The deployed Philippine AI pack is not embedded.');
assert(rendered.includes('sandbox="allow-scripts"'), 'The game sandbox is missing allow-scripts.');
assert(!/sandbox="[^"]*(?:allow-same-origin|allow-forms)/.test(rendered), 'The game sandbox grants unnecessary privileges.');
assert(rendered.includes('href="#game"'), 'Primary/footer access to the game is missing.');
const navOverview = rendered.indexOf('<a href="#overview" aria-current=');
const navGame = rendered.indexOf('<a href="#game" aria-current=');
const navProgram = rendered.indexOf('<a href="#program" aria-current=');
assert(navOverview !== -1 && navGame !== -1 && navProgram !== -1,
  'Overview, Game, and Program must all appear in the primary navigation.');
assert(navOverview < navGame && navGame < navProgram,
  'Primary navigation must begin Overview, Game, Program.');

const expectedAddress = 'm&amp;enetworksecretariat@depdev.gov.ph';
const expectedMailto = 'mailto:m%26enetworksecretariat@depdev.gov.ph';
const expectedDivisionAddress = '&amp;mes-soed@depdev.gov.ph';
const expectedDivisionMailto = 'mailto:%26mes-soed@depdev.gov.ph';
assert(rendered.includes(expectedAddress), 'The visible Secretariat address is not HTML-escaped.');
assert(rendered.includes(expectedMailto), 'The Secretariat mailto is not percent-encoded.');
assert(rendered.includes(expectedDivisionAddress), 'The visible Strategic Outcome Evaluation Division address is missing or not HTML-escaped.');
assert(rendered.includes(expectedDivisionMailto), 'The Strategic Outcome Evaluation Division mailto is missing or not percent-encoded.');
assert(!/m(?:%26|&amp;)eforumsecretariat@depdev\.gov\.ph/i.test(rendered), 'The old Forum Secretariat address still renders.');

const sectionIds = Array.from(rendered.matchAll(/<section\b[^>]*\bid="([^"]+)"/g), match => match[1]);
assert(new Set(sectionIds).size === sectionIds.length, 'Rendered section IDs are not unique.');
assert(sectionIds.includes('overview') && sectionIds.includes('game') && sectionIds.includes('program') && sectionIds.includes('speakers') && sectionIds.includes('notes'),
  'The overview-to-game-to-program launch sequence is incomplete.');
assert(rendered.indexOf('<section id="overview"') < rendered.indexOf('<section id="game"'),
  'The game must follow the Overview section.');
assert(rendered.indexOf('<section id="game"') < rendered.indexOf('<section id="program"'),
  'The Game section must precede the Program section.');
assert(rendered.indexOf('<section id="program"') < rendered.indexOf('<section id="speakers"'),
  'The Program section must precede the speaker launch.');
assert(rendered.indexOf('<section id="speakers"') < rendered.indexOf('<section id="notes"'),
  'The speaker launch must precede notes and materials.');

for (const required of [
  'html,\nbody',
  '.game-frame iframe',
  'width: 100%',
  'max-width: 100%',
  'min-height: 48px',
  '@media (max-width: 600px)',
  '@media (max-width: 390px)',
  'scroll-margin-top: calc(var(--mobile-masthead, 62px) + 12px)',
  'padding-block: 0 !important',
  'grid-template-columns: 52px minmax(0, 1fr) !important',
  '.notes-section .brandcard[style*="display: flex"]',
  '#qa .qa-layout > div:first-child > .brandcard:first-child',
  '@media (prefers-reduced-motion: reduce)',
  'html[data-thinking-mode="ultra"] .game-section'
]) {
  assert(releaseCss.includes(required), `Missing release CSS safeguard: ${required}`);
}

assert(!/html,\s*\nbody\s*\{[^}]*overflow-x:\s*(?:hidden|clip)/.test(releaseCss),
  'The release stylesheet must not conceal page overflow at the root.');
assert(!/html,\s*\n\s*body\s*\{[^}]*overflow-x:\s*(?:hidden|clip)/.test(responsiveCss),
  'The responsive stylesheet must not conceal page overflow at the root.');
assert(responsiveCss.includes('.site-brand__tagline') && responsiveCss.includes('display: none !important'),
  'The compact phone masthead must remove the non-wrapping tagline width floor.');
assert(uiLockCss.includes('--forum-shell-gutter: clamp(32px, 10vw, 44px)'),
  'The phone shell must retain a deliberate 16px-to-22px side gutter.');
assert(uiLockCss.includes('--mobile-gutter: clamp(16px, 2.5vw, 24px)'),
  'Tablet mobile rails must align with the shell instead of widening the page.');
assert(uiLockCss.includes('--mobile-gutter: clamp(16px, 5vw, 22px)'),
  'Mobile edge rails must share the phone shell gutter and stay within the viewport.');

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
assert(!/#program,\s*\.program-section\s*\{\s*display:\s*none\s*!important\s*;\s*\}/.test(releaseCss),
  'The release stylesheet still hides the Program section.');
assert(buildScript.includes('"speaker-launch.css"'),
  'The static build must publish speaker-launch.css.');

process.stdout.write(`Verified ${Object.keys(deployedGameBlobs).length} deployed game files and ${Object.keys(visualBlobs).length} visual assets.\n`);
process.stdout.write('Forum release checks passed.\n');
