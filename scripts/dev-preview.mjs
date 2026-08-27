import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

function replaceExactlyOnce(source, needle, replacement, label) {
  const first = source.indexOf(needle);
  const last = source.lastIndexOf(needle);
  if (first === -1 || first !== last) {
    throw new Error(`Expected exactly one ${label}; found ${first === -1 ? 0 : 'multiple'}.`);
  }
  return source.slice(0, first) + replacement + source.slice(first + needle.length);
}

export function createDevPreview(productionHtml) {
  let preview = productionHtml;

  preview = replaceExactlyOnce(
    preview,
    '<meta name="robots" content="index,follow">',
    '<meta name="robots" content="noindex,nofollow">',
    'outer robots directive'
  );
  preview = replaceExactlyOnce(
    preview,
    "'<link rel=\"canonical\" href=\"https://mnenetwork.forum/\"><link rel=\"icon\"",
    "'<meta name=\"robots\" content=\"noindex,nofollow\"><link rel=\"canonical\" href=\"https://mnenetwork.forum/\"><link rel=\"icon\"",
    'unpacked-document canonical injection'
  );
  preview = replaceExactlyOnce(
    preview,
    'const speakerWaveOverride = new URLSearchParams(window.location.search).get("speakerWave");',
    'const speakerWaveOverride = "all"; // Full-layout reviewer preview.',
    'speaker reveal override'
  );

  return preview;
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const source = path.join(root, 'index.html');
  const destination = path.join(root, 'dev', 'index.html');
  const productionHtml = fs.readFileSync(source, 'utf8');
  fs.writeFileSync(destination, createDevPreview(productionHtml), 'utf8');
  process.stdout.write(`Synchronized ${path.relative(root, destination)} from ${path.relative(root, source)}.\n`);
}
