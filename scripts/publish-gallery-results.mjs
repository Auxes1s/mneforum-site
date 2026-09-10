import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import readline from 'node:readline/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {normalizeSnapshot, publicPodiumSnapshot} from '../assets/evaluation-gallery-leaderboard.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = path.join(root, 'index.html');
const eventConfigPath = path.join(root, 'data', 'evaluation-gallery-event.json');
const SNAPSHOT_PATTERN = /  \/\/ EVALUATION_GALLERY_SNAPSHOT_START\r?\n  const evaluationGallerySnapshot = Object\.freeze\([\s\S]*?\);\r?\n  \/\/ EVALUATION_GALLERY_SNAPSHOT_END/;

function run(name, args, options = {}) {
  const useWindowsNpmShell = process.platform === 'win32' && name === 'npm';
  const command = useWindowsNpmShell ? (process.env.ComSpec || 'cmd.exe') : name;
  const commandLine = `npm.cmd ${args.map(value => `"${String(value).replaceAll('"', '""')}"`).join(' ')}`;
  const commandArgs = useWindowsNpmShell ? ['/d', '/s', '/c', commandLine] : args;
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit'
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = options.capture ? String(result.stderr || result.stdout || '').trim() : '';
    throw new Error(`${name} ${args.join(' ')} failed${detail ? `: ${detail}` : '.'}`);
  }
  return String(result.stdout || '').trim();
}

function parseArgs(argv) {
  const args = {yes: false, dryRun: false};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--yes') args.yes = true;
    else if (value === '--dry-run') args.dryRun = true;
    else if (value === '--snapshot') {
      if (!argv[index + 1]) throw new Error('--snapshot requires a path.');
      args.snapshot = argv[++index];
    } else throw new Error(`Unexpected argument: ${value}`);
  }
  if (!args.snapshot) throw new Error('Missing required --snapshot path.');
  return args;
}

export function replaceSnapshotBlock(source, snapshot) {
  if (!SNAPSHOT_PATTERN.test(source)) throw new Error('The Evaluation Gallery snapshot marker is missing from index.html.');
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  const json = JSON.stringify(snapshot, null, 2).replace(/\n/g, `${newline}  `);
  const replacement = [
    '  // EVALUATION_GALLERY_SNAPSHOT_START',
    `  const evaluationGallerySnapshot = Object.freeze(${json});`,
    '  // EVALUATION_GALLERY_SNAPSHOT_END'
  ].join(newline);
  return source.replace(SNAPSHOT_PATTERN, replacement);
}

export function validateSnapshotForSite(value, config, now = Date.now()) {
  if (value?.status !== 'FINAL') throw new Error('Only a FINAL snapshot can be installed.');
  if (value?.schemaVersion !== config.schema_version || value?.eventId !== config.event_id) {
    throw new Error('Snapshot event contract does not match the website.');
  }
  const snapshot = normalizeSnapshot(value);
  if (Date.parse(snapshot.publishedAt) > now + 5 * 60 * 1000) {
    throw new Error('Snapshot publishedAt is unexpectedly in the future.');
  }
  const catalog = new Map(config.posters.map(poster => [poster.poster_id, poster]));
  snapshot.rows.forEach(row => {
    const poster = catalog.get(row.poster_id);
    if (!poster || row.display_title !== poster.display_title || row.presenting_unit !== poster.presenting_unit) {
      throw new Error(`Snapshot catalog details do not match ${row.poster_id}.`);
    }
  });
  return snapshot;
}

function preflight() {
  const branch = run('git', ['branch', '--show-current'], {capture: true});
  if (!branch) throw new Error('Install results from a named branch, not a detached HEAD.');
  const trackedChanges = run('git', ['status', '--porcelain', '--untracked-files=no'], {capture: true});
  if (trackedChanges) throw new Error('Commit or restore tracked website changes before installing results.');
}

function printSummary(snapshot) {
  process.stdout.write(`Valid ballots: ${snapshot.ballotCount}\n`);
  process.stdout.write(`Ignored ballots: ${snapshot.ignoredCount}\n`);
  process.stdout.write(`Snapshot ID: ${snapshot.snapshotId}\n`);
  process.stdout.write(`Source digest: ${snapshot.sourceDigest}\n`);
}

async function confirmInstallation() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Run interactively or pass --yes from the controlled closeout command.');
  }
  const prompt = readline.createInterface({input: process.stdin, output: process.stdout});
  try {
    const answer = await prompt.question('Type INSTALL to freeze these results into the website: ');
    if (answer.trim() !== 'INSTALL') throw new Error('Installation cancelled; no files were changed.');
  } finally {
    prompt.close();
  }
}

export async function prepareGalleryResults(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const config = JSON.parse(await readFile(eventConfigPath, 'utf8'));
  const input = JSON.parse(await readFile(path.resolve(args.snapshot), 'utf8'));
  const snapshot = validateSnapshotForSite(input, config);
  printSummary(snapshot);
  if (args.dryRun) {
    process.stdout.write('Dry run passed; website files were not changed.\n');
    return snapshot;
  }
  preflight();
  if (!args.yes) await confirmInstallation();

  const source = await readFile(indexPath, 'utf8');
  await writeFile(indexPath, replaceSnapshotBlock(source, publicPodiumSnapshot(snapshot)), 'utf8');
  run('npm', ['run', 'sync:dev']);
  run('npm', ['run', 'check']);
  run('npm', ['run', 'build']);
  run('git', ['diff', '--check']);

  const changed = run('git', ['diff', '--name-only'], {capture: true}).split(/\r?\n/).filter(Boolean).sort();
  const expected = ['dev/index.html', 'index.html'];
  if (JSON.stringify(changed) !== JSON.stringify(expected)) {
    throw new Error(`Unexpected tracked files changed: ${changed.join(', ') || 'none'}. Nothing was committed or pushed.`);
  }
  process.stdout.write(`Prepared snapshot ${snapshot.snapshotId} locally.\n`);
  return snapshot;
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) {
  prepareGalleryResults().catch(error => {
    process.stderr.write(`Preparation stopped: ${error.message}\n`);
    process.exitCode = 1;
  });
}
