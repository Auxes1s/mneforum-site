import { access, readFile, readdir } from "node:fs/promises";
import { constants, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

const productionFiles = [
  "index.html",
  "register/index.html",
  "rp-register/index.html",
  "evalform/index.html",
  "assets/forum.css",
  "assets/forum.js",
  "assets/redirect.css",
  "data/forum-config.js",
  "data/forum-content.js",
  "site.webmanifest"
];

const expectedFiles = [
  ...productionFiles,
  ".htaccess",
  "network_logo.svg",
  "robots.txt",
  "sitemap.xml",
  "assets/butterfly-mark.svg",
  "assets/forum-logo-v5-static.svg",
  "assets/forum-logo-transformation.svg",
  "assets/og-teaser.png",
  "assets/fonts/OpenSans-SemiCondensed-Bold.ttf",
  "assets/partners/depdev.svg",
  "assets/partners/mne-network.svg",
  "assets/partners/undp.svg"
];

const forbiddenMarkers = [
  "__bundler",
  "unpkg.com/react",
  "api.fontshare.com",
  "app.sli.do",
  "example.com",
  "assets/forum-brand.css",
  "assets/forum-responsive.css",
  "assets/redirect.js",
  "style_orig.css",
  "main.js",
  "archive/",
  "assets/presenters/"
];

const routePaths = new Set(["/", "/register/", "/rp-register/", "/evalform/", "/agenda", "/logistics-note"]);
const assetAllowlist = new Set([
  "butterfly-mark.svg",
  "forum.css",
  "forum.js",
  "forum-logo-transformation.svg",
  "forum-logo-v5-static.svg",
  "fonts/OpenSans-OFL.txt",
  "fonts/OpenSans-SemiCondensed-Bold.ttf",
  "og-teaser.png",
  "partners/depdev.svg",
  "partners/mne-network.svg",
  "partners/undp.svg",
  "redirect.css"
]);

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
  checkReferences(relativePath, source);
}

const index = sources.get("index.html") ?? "";
if ((index.match(/<h1\b/gi) ?? []).length !== 1) fail("index.html must contain exactly one h1");
if (!/<script\s+type=["']module["'][^>]+src=["']\/assets\/forum\.js["']/i.test(index)) fail("index.html must load the source-first module");
if (/<meta[^>]+http-equiv=["']refresh/i.test(index)) fail("index.html must not use meta refresh");
if (!/<link[^>]+rel=["']canonical["'][^>]+https:\/\/mnenetwork\.forum\//i.test(index)) fail("index.html is missing the canonical URL");
if (!/og:image/.test(index) || !/twitter:image/.test(index)) fail("index.html is missing social preview metadata");

for (const relativePath of ["register/index.html", "rp-register/index.html", "evalform/index.html"]) {
  const source = sources.get(relativePath) ?? "";
  if (/<meta[^>]+http-equiv=["']refresh/i.test(source)) fail(`${relativePath} must not auto-redirect`);
  if (/<script\b/i.test(source)) fail(`${relativePath} should be JavaScript-free`);
  if (!/target=["']_blank["']/i.test(source)) fail(`${relativePath} must open the external form deliberately`);
  if (!/This page never redirects automatically/i.test(source)) fail(`${relativePath} is missing the no-auto-redirect notice`);
}

try {
  const { FORUM_CONFIG } = await import(pathToFileURL(path.join(root, "data/forum-config.js")).href);
  const formPagePairs = [
    ["register/index.html", FORUM_CONFIG.forms.registration.url],
    ["rp-register/index.html", FORUM_CONFIG.forms.resourcePerson.url],
    ["evalform/index.html", FORUM_CONFIG.forms.evaluation.url]
  ];
  for (const [page, url] of formPagePairs) {
    const htmlUrl = url.replaceAll("&", "&amp;");
    if (!sources.get(page)?.includes(url) && !sources.get(page)?.includes(htmlUrl)) {
      fail(`${page} is out of sync with data/forum-config.js`);
    }
  }
} catch (error) {
  fail(`Could not load data/forum-config.js for consistency checking: ${error.message}`);
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
  "assets/forum-brand.css",
  "assets/forum-responsive.css",
  "assets/redirect.js",
  "assets/forum-logo-transformation.gif",
  "assets/forum-logo-transformation-canva.mp4"
]) {
  if (await exists(retiredPath)) fail(`Retired path still exists: ${retiredPath}`);
}

if (failures.length) {
  console.error(`Site check failed with ${failures.length} issue${failures.length === 1 ? "" : "s"}:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Site check passed: ${productionFiles.length} source files and ${assetFiles.length} production assets verified.`);
}
