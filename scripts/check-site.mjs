import { access, readFile, readdir } from "node:fs/promises";
import { constants, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

// The original bundled runtime is intentionally preserved. These are the
// files that belong in the reviewed static site, not the removed alternate
// implementation or the retired 2025 archive.
const productionFiles = [
  "index.html",
  "dro-register/index.html",
  "eg-submission/index.html",
  "register/index.html",
  "rp-register/index.html",
  "sec-reg/index.html",
  "evalform/index.html",
  "assets/forum-brand.css",
  "assets/forum-responsive.css",
  "assets/redirect.css",
  "game/index.html",
  "game/game-v2.css",
  "game/content-loader-v1.js",
  "game/engine-v1.js",
  "game/ui-v2.js",
  "game/embed-v1.js",
  "game/cases/forum-v1.js",
  "game/cases/philippines-v1.js",
  "game/cases/philippines-ai-v2.js",
  "site.webmanifest"
];

const expectedFiles = [
  ...productionFiles,
  "dev/index.html",
  ".htaccess",
  "network_logo.svg",
  "robots.txt",
  "sitemap.xml",
  "assets/butterfly-mark.svg",
  "assets/forum-logo-v5-static.svg",
  "assets/forum-logo-transformation.svg",
  "assets/og-teaser.png",
  "assets/depdev-logo-color-192.png",
  "assets/depdev-logo-color.png",
  "assets/undp-logo-color.svg",
  "assets/fonts/OpenSans-OFL.txt",
  "assets/fonts/OpenSans-SemiCondensed-Bold.ttf",
  "assets/partners/depdev.svg",
  "assets/partners/mne-network.svg",
  "assets/partners/undp.svg",
  "game/.htaccess",
  // Pre-launch teaser artwork.
  "assets/background.png",
  "shapes/shape1.png",
  "shapes/shape2.png",
  "shapes/shape3.png",
  "shapes/shape4.png",
  "shapes/shape5.png",
  "shapes/shape6.png"
];

// assets/background.png is deliberately absent here: it is the pre-launch
// teaser's backdrop and is live again while the root serves the construction
// page. See the pre-launch posture note below.
const forbiddenMarkers = [
  "assets/forum.css",
  "assets/forum.js",
  "data/forum-config.js",
  "data/forum-content.js",
  "assets/redirect.js",
  "style_orig.css",
  "main.js",
  "agency_logo.svg",
  "assets/std.png",
  "archive/",
  "assets/presenters/",
  "example.com"
];

const routePaths = new Set([
  "/",
  "/dev",
  "/register/",
  "/dro-register/",
  "/rp-register/",
  "/sec-reg/",
  "/evalform/",
  "/eg-submission/",
  "/agenda",
  "/logistics-note"
]);

const assetAllowlist = new Set([
  "butterfly-mark.svg",
  "fonts/OpenSans-OFL.txt",
  "fonts/OpenSans-SemiCondensed-Bold.ttf",
  "forum-brand.css",
  "forum-logo-transformation.svg",
  "forum-logo-v5-static.svg",
  "forum-responsive.css",
  "og-teaser.png",
  "depdev-logo-color-192.png",
  "depdev-logo-color.png",
  "undp-logo-color.svg",
  "partners/depdev.svg",
  "partners/mne-network.svg",
  "partners/undp.svg",
  "redirect.css",
  "background.png"
]);

const formUrls = {
  "register/index.html": "https://forms.gle/vTPDTZkByMbfVTt6A",
  "dro-register/index.html": "https://forms.gle/dwqog8oEkqnNUXqU8",
  "rp-register/index.html": "https://docs.google.com/forms/d/e/1FAIpQLScULCsJGfhJyCg14w9g34CTtLkbp9Kvhx-8S0DoJ0pgo2_TyA/viewform",
  "sec-reg/index.html": "https://forms.gle/4hGEt4nkJygYAD1e8",
  "evalform/index.html": "https://forms.office.com/pages/responsepage.aspx?id=zITAUhXNcUaKV8GVZbzfwhLmvB3coLdNjeQZqbXaWg5UQ09PR0lTMURMQzQ2N1FVT0tOMVYwMkNFSi4u&route=shorturl",
  "eg-submission/index.html": "https://drive.google.com/drive/folders/1EJFDxDgp_Q5tlzz6im742qdg_6zduvkt?usp=sharing"
};

const exists = async relativePath => {
  try {
    await access(path.join(root, relativePath), constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const read = async relativePath => readFile(path.join(root, relativePath), "utf8");

const fail = message => failures.push(message);

async function walk(relativeDirectory) {
  const directory = path.join(root, relativeDirectory);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(relativePath));
    else files.push(relativePath.split(path.sep).join("/"));
  }
  return files;
}

function checkLocalReference(owner, reference) {
  const cleanReference = reference.split(/[?#]/, 1)[0];
  if (!cleanReference || cleanReference.startsWith("#") || /^(?:data:|mailto:|tel:|https?:|javascript:)/i.test(cleanReference)) return;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanReference)) return;
  if (routePaths.has(cleanReference)) return;

  const candidate = cleanReference.startsWith("/")
    ? cleanReference.slice(1)
    : path.relative(root, path.resolve(root, path.dirname(owner), cleanReference)).split(path.sep).join("/");
  if (!candidate || candidate.endsWith("/")) return;
  if (!existsSync(path.join(root, candidate))) fail(`${owner} references missing local path: ${reference}`);
}

function checkReferences(owner, source) {
  const attributePattern = /\b(?:src|href)=(['"])([^'"]+)\1/gi;
  for (const match of source.matchAll(attributePattern)) checkLocalReference(owner, match[2]);

  const cssUrlPattern = /url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/gi;
  for (const match of source.matchAll(cssUrlPattern)) checkLocalReference(owner, match[2]);
}

for (const relativePath of expectedFiles) {
  if (!await exists(relativePath)) fail(`Missing expected file: ${relativePath}`);
}

const sources = new Map();
for (const relativePath of productionFiles) {
  if (await exists(relativePath)) sources.set(relativePath, await read(relativePath));
}

for (const [relativePath, source] of sources) {
  for (const marker of forbiddenMarkers) {
    if (source.includes(marker)) fail(`${relativePath} contains retired marker: ${marker}`);
  }
  // The preserved page stores its decoded template and bootstrap code inside
  // script tags. Check ordinary document markup here; the decoded template is
  // checked separately below so UUID placeholders are not mistaken for files.
  const structuralSource = relativePath.endsWith(".html")
    ? source.replace(/<script\b[\s\S]*?<\/script>/gi, "")
    : source;
  checkReferences(relativePath, structuralSource);
}

// PRE-LAUNCH POSTURE
//
// The 13th Forum has not launched publicly yet. The root serves the
// "Something's Cooking" construction teaser, and the full bundled forum page
// lives at /dev, which robots.txt disallows, so it can be shared for review
// without being indexed. Every preserved-runtime assertion below therefore
// targets dev/index.html; the root is checked as a teaser instead.
//
// AT LAUNCH: promote dev/index.html back to the root, point these assertions
// at index.html again, and retire the teaser assets from expectedFiles.
const teaser = sources.get("index.html") ?? "";
const index = await exists("dev/index.html") ? await read("dev/index.html") : "";
let bundledTemplate = "";
try {
  const templateMatch = index.match(/<script type=["']__bundler\/template["']>([\s\S]*?)<\/script>/i);
  if (!templateMatch) throw new Error("template script is missing");
  bundledTemplate = JSON.parse(templateMatch[1]);
  if ((bundledTemplate.match(/<h1\b/gi) ?? []).length !== 1) fail("dev/index.html must contain exactly one h1 in the mounted template");
  // Reference checking is skipped here: dev/index.html carries <base href="/">
  // so its relative paths resolve against the site root, which the resolver in
  // checkLocalReference does not model.
} catch (error) {
  fail(`dev/index.html bundled template is not valid JSON: ${error.message}`);
}
for (const marker of [
  '<script type="__bundler/manifest">',
  '<script type="__bundler/template">',
  '<script type="__bundler/page_order">',
  "data-thinking-mode"
]) {
  if (!index.includes(marker)) fail(`dev/index.html is missing preserved runtime marker: ${marker}`);
}
if (!/class="hero\b/.test(bundledTemplate) || !/class="site-header\b/.test(bundledTemplate) || !/class="thinking-mode\b/.test(index)) {
  fail("dev/index.html does not contain the locked original design markers");
}
if (!index.includes('<base href="/">')) {
  fail("dev/index.html is missing the <base href=\"/\"> that resolves its assets from the site root");
}
for (const [label, source] of [["dev/index.html", index]]) {
  for (const marker of [
    "site-brand__partner-strip",
    'value="ultra"',
    "runReducedCycle",
    "masterStartedAt",
    "syncMobileMasthead",
    "assets/forum-brand.css?v=20260813-daymode-depdev"
  ]) {
    if (!source.includes(marker)) fail(`${label} is missing the reviewed runtime marker: ${marker}`);
  }
}

// The pre-launch root must stay a teaser: no forum content, no bundled runtime.
if (!/Something's Cooking/.test(teaser)) fail("index.html is not the pre-launch construction teaser");
for (const leak of [
  '<script type="__bundler/manifest">',
  "site-brand__partner-strip",
  "Resource persons",
  "past-forums"
]) {
  if (teaser.includes(leak)) fail(`index.html leaks unlaunched forum content: ${leak}`);
}

// The portable game is deliberately composed into the teaser while the full
// Forum site remains at /dev. Keep the iframe's strict boundary, the parent
// bridge needed for score submission/leaderboard reads, and phone-safe layout.
if ((teaser.match(/\bdata-buzz-to-bloom\b/g) ?? []).length !== 1) fail("index.html must contain exactly one Buzz to Bloom iframe");
if (!/<section\b[^>]*class=["'][^"']*\bgame-section\b[^"']*["'][^>]*aria-labelledby=["']buzz-to-bloom-title["']/i.test(teaser)) fail("index.html is missing the labelled game invitation section");
if (!/<iframe\b[^>]*\bdata-buzz-to-bloom\b[^>]*\bsrc=["']game\/\?embed=1&amp;pack=philippines-ai-v2["'][^>]*\bsandbox=["']allow-scripts["']/i.test(teaser)) fail("index.html is missing the reviewed sandboxed game iframe");
if (/sandbox=["'][^"']*(?:allow-same-origin|allow-forms)/i.test(teaser)) fail("index.html weakens the game iframe sandbox");
if (!/<script\b[^>]*\bdefer\b[^>]*\bsrc=["']game\/embed-v1\.js["'][^>]*><\/script>/i.test(teaser)) fail("index.html is missing the deferred game parent bridge");
if (!/<a\b[^>]*class=["'][^"']*\bgame-frame-link\b[^"']*["'][^>]*href=["']game\/\?pack=philippines-ai-v2["'][^>]*target=["']_blank["'][^>]*rel=["']noopener["']/i.test(teaser)) fail("index.html is missing the accessible full-page game fallback");
for (const marker of [
  ".game-section__inner {",
  "grid-template-columns: minmax(230px, 315px) minmax(0, 1fr);",
  ".game-frame iframe {",
  "width: 100%;",
  "min-height: 48px;",
  "@media (max-width: 680px)",
  "@media (max-width: 390px)"
]) {
  if (!teaser.includes(marker)) fail(`index.html is missing responsive game marker: ${marker}`);
}
if (/<meta[^>]+http-equiv=["']refresh/i.test(index)) fail("dev/index.html must not use meta refresh");
if (!/<link[^>]+rel=["']canonical["'][^>]+https:\/\/mnenetwork\.forum\//i.test(index)) fail("dev/index.html is missing the canonical URL");
if (!/<meta[^>]+name=["']description["']/i.test(index)) fail("dev/index.html is missing the description metadata");
if (!/og:image/.test(index) || !/twitter:image/.test(index)) fail("dev/index.html is missing social preview metadata");
if (!/rel=["']preload["'][^>]+assets\/forum-logo-v5-static\.svg/i.test(index)) fail("dev/index.html is missing the static identity preload");
// The startup guard still skips manifest entries the mounted template no longer
// references, but it must keep the ext_resources uuids (React, ReactDOM). Those
// are reached through window.__resources keyed by CDN URL, never substituted
// into the template, so a template-text-only filter dropped them and sent the
// page to unpkg.com for bytes already embedded there. Assert both halves.
if (!/Object\.keys\(manifest\)\.filter\(\s*uuid => pageSet\.has\(uuid\) \|\| extUuids\.has\(uuid\) \|\| template\.includes\(uuid\)\s*\)/.test(index)) {
  fail("dev/index.html is missing the unreferenced-resource startup guard");
}
if (!/extUuids = new Set\(JSON\.parse\(extManifestEl\.textContent\)\.map\(entry => entry\.uuid\)\)/.test(index)) {
  fail("dev/index.html is missing the ext_resources exemption that keeps React bundled");
}
if (!index.includes("assets/forum-brand.css") || !index.includes("assets/forum-responsive.css")) fail("dev/index.html is missing the preserved stylesheet mounts");
if (!index.includes("Slido room pending") || !index.includes("Poll results pending")) fail("dev/index.html still has unguarded live-room placeholders");

// The preserved bundle receives the Past Forums section and contact labels in
// the bootstrap immediately before mounting. Check both the source template
// and the runtime replacement markers so those additions cannot silently drop.
if (bundledTemplate) {
  if (!/<section\b[^>]*\bid=["']gallery["']/i.test(bundledTemplate)) {
    fail("decoded bundled template is missing the Evaluation Gallery section anchor");
  }
  if (!/<a\b[^>]*\bhref=["']#gallery["'][^>]*>Gallery<\/a>/i.test(bundledTemplate)) {
    fail("decoded bundled template is missing the Gallery navigation anchor");
  }
  for (const marker of [
    "Regional M&amp;E Knowledge Gallery",
    "Strategic Outcome Evaluation Division<br><a href=\"mailto:mes-soed@depdev.gov.ph\"",
    ">mes-soed@depdev.gov.ph</a>"
  ]) {
    if (!bundledTemplate.includes(marker)) fail(`decoded bundled template is missing the preserved replacement anchor: ${marker}`);
  }
}
if (!index.includes('href="#past-forums"') || !index.includes(">Past Forums</a>")) {
  fail("dev/index.html is missing the Past Forums navigation item");
}
if (!index.includes('const pastForumsSection = `<section id="past-forums" class="past-forums-section">')) {
  fail("dev/index.html is missing the Past Forums section markup");
}
if (!index.includes("https://www.facebook.com/plugins/video.php?href=")) {
  fail("dev/index.html is missing the Facebook video plugin endpoint");
}
if (!index.includes("https://www.facebook.com/share/v/1BgZTCeDcA/")) {
  fail("dev/index.html is missing the supplied SDE Facebook fallback URL");
}
if (!index.includes(".replace('Regional M&amp;E Knowledge Gallery', 'Evaluation Gallery')")) {
  fail("dev/index.html is missing the Evaluation Gallery title replacement");
}
if (!index.includes(".replace('>Knowledge Gallery</a>', '>Evaluation Gallery</a>')")) {
  fail("dev/index.html is missing the Evaluation Gallery footer-link replacement");
}

const mastheadMne = index.indexOf('<img class="site-brand__partner-logo site-brand__partner-logo--mne" src="network_logo.svg"');
const mastheadDepdev = index.indexOf('<img class="site-brand__partner-logo site-brand__partner-logo--depdev" src="assets/depdev-logo-color-192.png"', mastheadMne);
const mastheadUndp = index.indexOf('<img class="site-brand__partner-logo site-brand__partner-logo--undp" src="assets/undp-logo-color.svg"', mastheadDepdev);
const mastheadDivider = index.indexOf('<span class="site-brand__divider"', mastheadUndp);
const mastheadWordmark = index.indexOf('<span class="site-brand__wordmark"', mastheadDivider);
if (mastheadMne < 0 || mastheadDepdev < 0 || mastheadUndp < 0 || mastheadDivider < 0 || mastheadWordmark < 0 || !(mastheadMne < mastheadDepdev && mastheadDepdev < mastheadUndp && mastheadUndp < mastheadDivider && mastheadDivider < mastheadWordmark)) {
  fail("dev/index.html is missing the ordered masthead marks: M&E, DEPDev, UNDP, divider, wordmark");
}

const brandStyles = await read("assets/forum-brand.css");
for (const marker of [
  'html[data-thinking-mode="ultra"] .site-brand__partner-logo--mne',
  'html[data-thinking-mode="ultra"] .site-brand__partner-logo--depdev',
  "filter: brightness(0) invert(1) !important;"
]) {
  if (!brandStyles.includes(marker)) fail(`forum-brand.css is missing the Ultra white-header-logo marker: ${marker}`);
}

for (const marker of [
  "M&amp;E Forum Secretariat",
  "m&amp;eforumsecretariat@depdev.gov.ph",
  "mailto:m%26eforumsecretariat@depdev.gov.ph",
  "MES-Strategic Outcome Evaluation Division",
  "&amp;mes-soed@depdev.gov.ph",
  "mailto:%26mes-soed@depdev.gov.ph"
]) {
  if (!index.includes(marker)) fail(`dev/index.html is missing the reviewed Secretariat contact marker: ${marker}`);
}

// Thinking Mode is assembled by the preserved bootstrap after the template
// mounts. Keep its wiring under the same static guard so a future export cannot
// silently ship the panel without its three transitions or persistence.
for (const marker of [
  "const thinkingModeControl",
  'value="instant"',
  'value="high"',
  'value="ultra"',
  "const modes =",
  "const selectMode =",
  "const restartSequence =",
  "const runReducedCycle =",
  "const getModeControl =",
  "document.addEventListener('change'",
  "document.addEventListener('click'",
  "document.addEventListener('keydown'",
  "const modeDomObserver =",
  "sessionStorage.getItem('forum-thinking-mode')",
  "sessionStorage.setItem(key, value)",
  "applyMode(document.documentElement.getAttribute('data-thinking-mode') || 'instant')",
  "assets/forum-logo-transformation.svg",
  "site-brand__partner-strip",
  "m&amp;eforumsecretariat@depdev.gov.ph"
]) {
  if (!index.includes(marker)) fail(`dev/index.html is missing Thinking Mode wiring: ${marker}`);
}
if (/applyMode\(['"]instant['"]\)/.test(index)) fail("Thinking Mode forcibly resets to Instant at startup");
if (!index.includes("dataset.transformationReady = 'fallback'")) {
  fail("Thinking Mode is missing its transformation fallback state");
}

for (const [relativePath, url] of Object.entries(formUrls)) {
  const source = sources.get(relativePath) ?? "";
  if (!/<meta[^>]+http-equiv=["']refresh["']/i.test(source)) fail(`${relativePath} is missing its automatic redirect`);
  if (!/window\.location\.replace\(/i.test(source)) fail(`${relativePath} is missing its JavaScript redirect fallback`);
  if (!/redirect does not start/i.test(source)) fail(`${relativePath} is missing its manual redirect fallback notice`);
  if (!source.includes(url) && !source.includes(url.replaceAll("&", "&amp;"))) {
    fail(`${relativePath} does not contain its reviewed form destination`);
  }
}

try {
  const manifest = JSON.parse(await read("site.webmanifest"));
  if (manifest.start_url !== "/" || manifest.scope !== "/") fail("site.webmanifest must be rooted at /");
  if (!manifest.icons?.some(icon => icon.src === "/network_logo.svg")) fail("site.webmanifest is missing the rooted network icon");
} catch (error) {
  fail(`site.webmanifest is not valid JSON: ${error.message}`);
}

const assetFiles = await walk("assets");
for (const relativePath of assetFiles) {
  if (!assetAllowlist.has(relativePath.slice("assets/".length))) fail(`Unlisted asset remains in production tree: ${relativePath}`);
}

for (const retiredPath of [
  "archive",
  "assets/presenters",
  "main.js",
  "style.css",
  "style_orig.css",
  "agency_logo.svg",
  "assets/std.png",
  "assets/forum.css",
  "assets/forum.js",
  "assets/redirect.js",
  "assets/forum-logo-transformation.gif",
  "assets/forum-logo-transformation-canva.mp4",
  "data/forum-config.js",
  "data/forum-content.js"
]) {
  if (await exists(retiredPath)) fail(`Retired path still exists: ${retiredPath}`);
}

const htaccess = await read(".htaccess");
for (const marker of [
  "Options -Indexes",
  "DirectoryIndex index.html",
  "RewriteRule ^register/?$ https://forms.gle/vTPDTZkByMbfVTt6A [R=302,END,NE]",
  "RewriteRule ^dro-register/?$ https://forms.gle/dwqog8oEkqnNUXqU8 [R=302,END,NE]",
  "RewriteRule ^rp-register/?$ https://docs.google.com/forms/d/e/1FAIpQLScULCsJGfhJyCg14w9g34CTtLkbp9Kvhx-8S0DoJ0pgo2_TyA/viewform [R=302,END,NE]",
  "RewriteRule ^evalform/?$ https://forms.office.com/pages/responsepage.aspx?id=zITAUhXNcUaKV8GVZbzfwhLmvB3coLdNjeQZqbXaWg5UQ09PR0lTMURMQzQ2N1FVT0tOMVYwMkNFSi4u&route=shorturl [R=302,END,NE]",
  "RewriteRule ^eg-submission/?$ https://drive.google.com/drive/folders/1EJFDxDgp_Q5tlzz6im742qdg_6zduvkt?usp=sharing [R=302,END,NE]",
  "RewriteRule ^archive(?:/|$) - [G,L]",
  "RewriteRule ^participantflow(?:/|$) - [G,L]",
  "X-Content-Type-Options",
  "Referrer-Policy"
]) {
  if (!htaccess.includes(marker)) fail(`.htaccess is missing required release rule/header: ${marker}`);
}
if (/assets\/redirect\.js/i.test(htaccess)) fail(".htaccess contains an obsolete redirect script reference");

if (failures.length) {
  console.error(`Site check failed with ${failures.length} issue${failures.length === 1 ? "" : "s"}:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Site check passed: ${productionFiles.length} source files and ${assetFiles.length} production assets verified.`);
}
