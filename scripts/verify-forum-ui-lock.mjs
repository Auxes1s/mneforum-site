import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const indexPath = path.resolve(process.argv[2] || path.join(repoRoot, 'index.html'));
const lockPath = path.join(repoRoot, 'assets', 'forum-ui-lock.css');
const releasePath = path.join(repoRoot, 'assets', 'forum-release.css');

const html = fs.readFileSync(indexPath, 'utf8');
const css = fs.readFileSync(lockPath, 'utf8');
const releaseCss = fs.readFileSync(releasePath, 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

function luminance(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map(value => parseInt(value, 16) / 255);
  const linear = channels.map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
}

function contrast(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

assert(fs.existsSync(lockPath), 'Missing assets/forum-ui-lock.css.');
assert(count(html, 'forum-ui-lock.css?v=20260826-night-layout') >= 2,
  'The shell must preload and mount the UI-lock stylesheet.');
assert(count(html, 'forum-release.css?v=20260827-program-mobile') >= 3,
  'The shell must preload, inject, and mount the release stylesheet.');
assert(html.includes('document.head.lastElementChild === releaseLink'),
  'The release stylesheet is not the final author stylesheet.');
assert(html.includes('releaseLink.previousElementSibling === uiLockLink'),
  'The UI-lock-to-release stylesheet order invariant is missing.');
assert(html.includes('uiLockLink.previousElementSibling === responsiveLink'),
  'The responsive-to-lock stylesheet order invariant is missing.');
assert(html.includes("['instant', 'high', 'ultra'].includes(storedMode)"),
  'Thinking Mode session restoration is missing.');
assert(html.includes('const selectMode = (nextMode'),
  'The shared Thinking Mode selection path is missing.');
assert(html.includes('const SPEAKER_LAUNCH_WAVES = ['),
  'The confirmed speaker-launch customization is missing.');

for (const required of [
  '--forum-shell-max: 1680px',
  '@media (min-width: 1440px)',
  '@media (max-width: 1024px)',
  '@media (max-width: 600px)',
  'html[data-thinking-mode="ultra"] .theme-card',
  'html[data-thinking-mode="ultra"] .speaker-wave',
  'html[data-thinking-mode="ultra"] .speaker-session',
  'html[data-thinking-mode="ultra"] .qa-empty',
  'html[data-thinking-mode="ultra"] .qa-section .brandcard :where(div, span, ul, p)[style*="color: color-mix"]',
  'html[data-thinking-mode="ultra"] .notes-section .brandcard :where(div, span, ul, p)[style*="color: color-mix"]',
  'html[data-thinking-mode="ultra"] .qa-section .brandcard [style*="background: var(--color-accent-100)"]',
  'html[data-thinking-mode="ultra"] .gallery-section .brandcard :where(div, span, ul, p)[style*="color: color-mix"]',
  'html[data-thinking-mode="ultra"] .qa-section .brandcard [style*="color: var(--color-accent-700)"]',
  'html[data-thinking-mode="ultra"] .notes-section .brandcard [style*="color: var(--color-accent-700)"]',
  'html[data-thinking-mode="ultra"] .gallery-section .brandcard [style*="color: var(--color-accent-700)"]',
  'html[data-thinking-mode="ultra"] .thinking-mode__panel',
  'html[data-thinking-mode="ultra"] .primary-nav.is-open a'
]) {
  assert(css.includes(required), `Missing locked rule: ${required}`);
}

const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
assert(count(cssWithoutComments, '{') === count(cssWithoutComments, '}'),
  'Unbalanced braces in assets/forum-ui-lock.css.');
const releaseWithoutComments = releaseCss.replace(/\/\*[\s\S]*?\*\//g, '');
assert(count(releaseWithoutComments, '{') === count(releaseWithoutComments, '}'),
  'Unbalanced braces in assets/forum-release.css.');

const contrastPairs = [
  ['primary card text', '#eef4fa', '#12283f', 4.5],
  ['muted card text', '#b9d2e8', '#12283f', 4.5],
  ['primary button', '#06182a', '#78bdf1', 4.5],
  ['night link', '#9fd2f7', '#0a1a2b', 4.5],
  ['night eyebrow', '#ff9bb0', '#12283f', 4.5],
  ['Q&A empty state', '#b9d2e8', '#12283f', 4.5],
  ['Q&A nested accent', '#9fd2f7', '#17324d', 4.5],
  ['Gallery status text', '#b9d2e8', '#12283f', 4.5]
];

for (const [label, foreground, background, minimum] of contrastPairs) {
  const ratio = contrast(foreground, background);
  assert(ratio >= minimum, `${label} contrast ${ratio.toFixed(2)}:1 is below ${minimum}:1.`);
  process.stdout.write(`${label}: ${ratio.toFixed(2)}:1\n`);
}

const inlineScripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter(match => !/\bsrc\s*=/.test(match[1]) && !/__bundler\/(?:manifest|template)/.test(match[1]))
  .map(match => match[2].trim())
  .filter(Boolean);

for (const [index, source] of inlineScripts.entries()) {
  try {
    // Syntax only. Do not execute the browser loader in Node.
    new Function(source);
  } catch (error) {
    throw new Error(`Inline script ${index + 1} has invalid syntax: ${error.message}`);
  }
}

process.stdout.write(`Validated ${inlineScripts.length} inline script(s).\n`);
process.stdout.write('Forum UI lock checks passed.\n');
