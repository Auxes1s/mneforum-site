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
  "register/index.html",
  "rp-register/index.html",
  "evalform/index.html",
  "assets/forum-brand.css",
  "assets/forum-responsive.css",
  "assets/redirect.css",
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
  "assets/partners/undp.svg"
];

const forbiddenMarkers = [
  "assets/forum.css",
  "assets/forum.js",
  "data/forum-config.js",
  "data/forum-content.js",
  "assets/redirect.js",
  "style_orig.css",
  "main.js",
  "agency_logo.svg",
  "assets/background.png",
  "assets/std.png",
  "archive/",
  "assets/presenters/",
  "example.com"
];

const routePaths = new Set([
  "/",
  "/dev",
  "/register/",
  "/rp-register/",
  "/evalform/",
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
  "redirect.css"
]);

const formUrls = {
  "register/index.html": "https://docs.google.com/forms/d/e/1FAIpQLSfPj5AaCY1EGU6OsxfZWNB6E6AsYeuNix9hmrrvBJfhyuQbSw/viewform?usp=header",
  "rp-register/index.html": "https://docs.google.com/forms/d/e/1FAIpQLSflAhrccdPL-g0J-6Cce3T28RL3v5VIdXhvPeNaWc_6VPd4GA/viewform?usp=header",
  "evalform/index.html": "https://forms.office.com/pages/responsepage.aspx?id=zITAUhXNcUaKV8GVZbzfwhLmvB3coLdNjeQZqbXaWg5UQ09PR0lTMURMQzQ2N1FVT0tOMVYwMkNFSi4u&route=shorturl"
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

const index = sources.get("index.html") ?? "";
const devIndex = await exists("dev/index.html") ? await read("dev/index.html") : "";
let bundledTemplate = "";
try {
  const templateMatch = index.match(/<script type=["']__bundler\/template["']>([\s\S]*?)<\/script>/i);
  if (!templateMatch) throw new Error("template script is missing");
  bundledTemplate = JSON.parse(templateMatch[1]);
  if ((bundledTemplate.match(/<h1\b/gi) ?? []).length !== 1) fail("index.html must contain exactly one h1 in the mounted template");
  checkReferences("index.html", bundledTemplate);
} catch (error) {
  fail(`index.html bundled template is not valid JSON: ${error.message}`);
}
for (const marker of [
  '<script type="__bundler/manifest">',
  '<script type="__bundler/template">',
  '<script type="__bundler/page_order">',
  "data-thinking-mode"
]) {
  if (!index.includes(marker)) fail(`index.html is missing preserved runtime marker: ${marker}`);
}
if (!/class="hero\b/.test(bundledTemplate) || !/class="site-header\b/.test(bundledTemplate) || !/class="thinking-mode\b/.test(index)) {
  fail("index.html does not contain the locked original design markers");
}
for (const [label, source] of [["index.html", index], ["dev/index.html", devIndex]]) {
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
if (/<meta[^>]+http-equiv=["']refresh/i.test(index)) fail("index.html must not use meta refresh");
if (!/<link[^>]+rel=["']canonical["'][^>]+https:\/\/mnenetwork\.forum\//i.test(index)) fail("index.html is missing the canonical URL");
if (!/<meta[^>]+name=["']description["']/i.test(index)) fail("index.html is missing the description metadata");
if (!/og:image/.test(index) || !/twitter:image/.test(index)) fail("index.html is missing social preview metadata");
if (!/rel=["']preload["'][^>]+assets\/forum-logo-v5-static\.svg/i.test(index)) fail("index.html is missing the static identity preload");
if (!/Object\.keys\(manifest\)\.filter\(uuid => pageSet\.has\(uuid\) \|\| template\.includes\(uuid\)\)/.test(index)) fail("index.html is missing the unreferenced-resource startup guard");
if (!index.includes("assets/forum-brand.css") || !index.includes("assets/forum-responsive.css")) fail("index.html is missing the preserved stylesheet mounts");
if (!index.includes("Slido room pending") || !index.includes("Poll results pending")) fail("index.html still has unguarded live-room placeholders");

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
  fail("index.html is missing the Past Forums navigation item");
}
if (!index.includes('const pastForumsSection = `<section id="past-forums" class="past-forums-section">')) {
  fail("index.html is missing the Past Forums section markup");
}
if (!index.includes("https://www.facebook.com/plugins/video.php?href=")) {
  fail("index.html is missing the Facebook video plugin endpoint");
}
if (!index.includes("https://www.facebook.com/share/v/1BgZTCeDcA/")) {
  fail("index.html is missing the supplied SDE Facebook fallback URL");
}
if (!index.includes(".replace('Regional M&amp;E Knowledge Gallery', 'Evaluation Gallery')")) {
  fail("index.html is missing the Evaluation Gallery title replacement");
}
if (!index.includes(".replace('>Knowledge Gallery</a>', '>Evaluation Gallery</a>')")) {
  fail("index.html is missing the Evaluation Gallery footer-link replacement");
}

const mastheadMne = index.indexOf('<img class="site-brand__partner-logo site-brand__partner-logo--mne" src="network_logo.svg"');
const mastheadDepdev = index.indexOf('<img class="site-brand__partner-logo site-brand__partner-logo--depdev" src="assets/depdev-logo-color-192.png"', mastheadMne);
const mastheadUndp = index.indexOf('<img class="site-brand__partner-logo site-brand__partner-logo--undp" src="assets/undp-logo-color.svg"', mastheadDepdev);
const mastheadDivider = index.indexOf('<span class="site-brand__divider"', mastheadUndp);
const mastheadWordmark = index.indexOf('<span class="site-brand__wordmark"', mastheadDivider);
if (mastheadMne < 0 || mastheadDepdev < 0 || mastheadUndp < 0 || mastheadDivider < 0 || mastheadWordmark < 0 || !(mastheadMne < mastheadDepdev && mastheadDepdev < mastheadUndp && mastheadUndp < mastheadDivider && mastheadDivider < mastheadWordmark)) {
  fail("index.html is missing the ordered masthead marks: M&E, DEPDev, UNDP, divider, wordmark");
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
  if (!index.includes(marker)) fail(`index.html is missing the reviewed Secretariat contact marker: ${marker}`);
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
  if (!index.includes(marker)) fail(`index.html is missing Thinking Mode wiring: ${marker}`);
}
if (/applyMode\(['"]instant['"]\)/.test(index)) fail("Thinking Mode forcibly resets to Instant at startup");
if (!index.includes("dataset.transformationReady = 'fallback'")) {
  fail("Thinking Mode is missing its transformation fallback state");
}

for (const [relativePath, url] of Object.entries(formUrls)) {
  const source = sources.get(relativePath) ?? "";
  if (/<meta[^>]+http-equiv=["']refresh/i.test(source)) fail(`${relativePath} must not auto-redirect`);
  if (/<script\b/i.test(source)) fail(`${relativePath} should be JavaScript-free`);
  if (!/target=["']_blank["']/i.test(source)) fail(`${relativePath} must open the external form deliberately`);
  if (!/does not redirect automatically/i.test(source)) fail(`${relativePath} is missing the no-auto-redirect notice`);
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
  "assets/background.png",
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
  "RewriteRule ^register/?$ register/index.html",
  "RewriteRule ^rp-register/?$ rp-register/index.html",
  "RewriteRule ^evalform/?$ evalform/index.html",
  "RewriteRule ^archive(?:/|$) - [G,L]",
  "RewriteRule ^participantflow(?:/|$) - [G,L]",
  "X-Content-Type-Options",
  "Referrer-Policy"
]) {
  if (!htaccess.includes(marker)) fail(`.htaccess is missing required release rule/header: ${marker}`);
}
if (/assets\/redirect\.js|meta refresh/i.test(htaccess)) fail(".htaccess contains an unsafe redirect reference");

if (failures.length) {
  console.error(`Site check failed with ${failures.length} issue${failures.length === 1 ? "" : "s"}:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Site check passed: ${productionFiles.length} source files and ${assetFiles.length} production assets verified.`);
}
