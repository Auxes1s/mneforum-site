import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "dist");

// DigitalOcean's static-site build scans for _static, dist, public, or build.
// The reviewed site is intentionally rooted at the repository root, so publish
// an explicit dist/ tree without copying source-control, tooling, or dependency
// files into the deploy artifact.
const publishEntries = [
  ".htaccess",
  "assets",
  "dro-register",
  "eg-submission",
  "dev",
  "evalform",
  "game",
  "index.html",
  "network_logo.svg",
  "register",
  "robots.txt",
  "rp-register",
  "sec-reg",
  // Backdrop artwork for the pre-launch construction teaser at the root.
  // Retire this with the teaser at launch.
  "shapes",
  "site.webmanifest",
  "sitemap.xml"
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const entry of publishEntries) {
  await cp(path.join(root, entry), path.join(output, entry), { recursive: true });
}

// Keep source documentation and automated tests in the repository without
// exposing them in the static deploy artifact.
await rm(path.join(output, "game", "README.md"), { force: true });
await rm(path.join(output, "game", "tests"), { recursive: true, force: true });

console.log(`Static site built in ${path.relative(root, output)}/`);
