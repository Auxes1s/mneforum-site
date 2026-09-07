import {createHash} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import readline from 'node:readline/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {parseLeaderboardResponse} from '../assets/evaluation-gallery-leaderboard.mjs';

const SPREADSHEET_ID = '12kMj_aYeBsnbiEGEHZUfkiQlkNIyrdMb_q8UgQ1abQA';
const SHEET_RANGE = 'D1:P';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = path.join(root, 'index.html');
const SNAPSHOT_PATTERN = /  \/\/ EVALUATION_GALLERY_SNAPSHOT_START\r?\n  const evaluationGallerySnapshot = Object\.freeze\([\s\S]*?\);\r?\n  \/\/ EVALUATION_GALLERY_SNAPSHOT_END/;

function run(name, args, options = {}) {
  const useWindowsNpmShell = process.platform === 'win32' && name === 'npm';
  const command = useWindowsNpmShell ? (process.env.ComSpec || 'cmd.exe') : name;
  const commandArgs = useWindowsNpmShell ? ['/d', '/s', '/c', `npm.cmd ${args.join(' ')}`] : args;
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

export function parseGvizResponse(text) {
  const match = String(text).match(/google\.visualization\.Query\.setResponse\((.*)\);?\s*$/s);
  if (!match) throw new Error('Google Sheets returned an unexpected response.');
  return JSON.parse(match[1]);
}

export function createPublishedSnapshot(result, publishedAt = new Date().toISOString()) {
  if (!result || result.ballotCount < 1 || !Array.isArray(result.rows) || result.rows.length !== 12) {
    throw new Error('No complete ballots are available to publish.');
  }
  const firstTotal = result.rows.reduce((sum, row) => sum + row.first_count, 0);
  const secondTotal = result.rows.reduce((sum, row) => sum + row.second_count, 0);
  const thirdTotal = result.rows.reduce((sum, row) => sum + row.third_count, 0);
  const pointTotal = result.rows.reduce((sum, row) => sum + row.total_points, 0);
  if ([firstTotal, secondTotal, thirdTotal].some(total => total !== result.ballotCount) || pointTotal !== result.ballotCount * 6) {
    throw new Error('The computed tally failed its 3-2-1 accounting check.');
  }
  const publicRows = result.rows.map(row => ({
    rank: row.rank,
    poster_id: row.poster_id,
    display_title: row.display_title,
    presenting_unit: row.presenting_unit,
    first_count: row.first_count,
    second_count: row.second_count,
    third_count: row.third_count,
    total_points: row.total_points
  }));
  const snapshotBody = {
    status: 'published',
    publishedAt,
    ballotCount: result.ballotCount,
    ignoredCount: result.ignoredCount,
    rows: publicRows
  };
  const snapshotId = createHash('sha256').update(JSON.stringify(snapshotBody)).digest('hex').slice(0, 12);
  return {status: 'published', snapshotId, ...snapshotBody};
}

export function replaceSnapshotBlock(source, snapshot) {
  if (!SNAPSHOT_PATTERN.test(source)) {
    throw new Error('The Evaluation Gallery snapshot marker is missing from index.html.');
  }
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  const json = JSON.stringify(snapshot, null, 2).replace(/\n/g, `${newline}  `);
  const replacement = [
    '  // EVALUATION_GALLERY_SNAPSHOT_START',
    `  const evaluationGallerySnapshot = Object.freeze(${json});`,
    '  // EVALUATION_GALLERY_SNAPSHOT_END'
  ].join(newline);
  return source.replace(SNAPSHOT_PATTERN, replacement);
}

function preflight() {
  const branch = run('git', ['branch', '--show-current'], {capture: true});
  if (branch !== 'master') throw new Error(`Run this command from master, not ${branch || 'a detached HEAD'}.`);
  const trackedChanges = run('git', ['status', '--porcelain', '--untracked-files=no'], {capture: true});
  if (trackedChanges) throw new Error('Commit or restore tracked website changes before publishing results.');
  run('git', ['fetch', 'origin']);
  const parity = run('git', ['rev-list', '--left-right', '--count', 'HEAD...origin/master'], {capture: true});
  if (!/^0\s+0$/.test(parity)) throw new Error('Local master must exactly match origin/master before publishing results.');
}

async function fetchLiveTally() {
  const query = new URLSearchParams({headers: '1', range: SHEET_RANGE, tqx: 'out:json'});
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?${query}`;
  const response = await fetch(url, {redirect: 'follow'});
  if (!response.ok) throw new Error(`Google Sheets returned HTTP ${response.status}.`);
  return parseLeaderboardResponse(parseGvizResponse(await response.text()));
}

function printSummary(snapshot) {
  process.stdout.write(`\nComplete ballots: ${snapshot.ballotCount}\n`);
  process.stdout.write(`Ignored rows: ${snapshot.ignoredCount}\n\n`);
  process.stdout.write('Podium to publish:\n');
  snapshot.rows.slice(0, 3).forEach(row => {
    process.stdout.write(`${row.rank}. ${row.poster_id} — ${row.display_title} — ${row.total_points} points\n`);
  });
}

async function confirmPublication() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Run this command in an interactive terminal so the final podium can be confirmed.');
  }
  const prompt = readline.createInterface({input: process.stdin, output: process.stdout});
  try {
    const answer = await prompt.question('\nType PUBLISH to freeze and release these results: ');
    if (answer.trim() !== 'PUBLISH') throw new Error('Publication cancelled; no files were changed.');
  } finally {
    prompt.close();
  }
}

export async function publishGalleryResults() {
  preflight();
  process.stdout.write(`Reading the live Evaluation Gallery Sheet once (${SHEET_RANGE})...\n`);
  const tally = await fetchLiveTally();
  const snapshot = createPublishedSnapshot(tally);
  printSummary(snapshot);
  await confirmPublication();

  const source = await readFile(indexPath, 'utf8');
  await writeFile(indexPath, replaceSnapshotBlock(source, snapshot), 'utf8');
  run('npm', ['run', 'sync:dev']);
  run('npm', ['run', 'check']);
  run('npm', ['run', 'build']);
  run('git', ['diff', '--check']);

  const changed = run('git', ['diff', '--name-only'], {capture: true}).split(/\r?\n/).filter(Boolean).sort();
  const expected = ['dev/index.html', 'index.html'];
  if (JSON.stringify(changed) !== JSON.stringify(expected)) {
    throw new Error(`Unexpected tracked files changed: ${changed.join(', ') || 'none'}. Nothing was committed or pushed.`);
  }

  run('git', ['add', '--', 'index.html', 'dev/index.html']);
  run('git', ['commit', '-m', `Publish Evaluation Gallery results ${snapshot.snapshotId}`]);
  run('git', ['push', 'origin', 'master']);
  process.stdout.write(`\nPublished snapshot ${snapshot.snapshotId}. DigitalOcean deployment has started.\n`);
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) {
  publishGalleryResults().catch(error => {
    process.stderr.write(`\nPublication stopped: ${error.message}\n`);
    process.exitCode = 1;
  });
}
