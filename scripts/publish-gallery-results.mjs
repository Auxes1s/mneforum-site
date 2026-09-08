import {createHash} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import readline from 'node:readline/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = path.join(root, 'index.html');
const eventConfigPath = path.join(root, 'data', 'evaluation-gallery-event.json');
const SNAPSHOT_PATTERN = /  \/\/ EVALUATION_GALLERY_SNAPSHOT_START\r?\n  const evaluationGallerySnapshot = Object\.freeze\([\s\S]*?\);\r?\n  \/\/ EVALUATION_GALLERY_SNAPSHOT_END/;
const SHA256 = /^[a-f0-9]{64}$/;
const POSTER_ID = /^P(?:0[1-9]|1[0-2])$/;

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

function cellValue(cell) {
  if (!cell) return '';
  return cell.v === undefined || cell.v === null ? '' : cell.v;
}

function tableRows(payload, label) {
  if (!payload || payload.status !== 'ok' || !payload.table) {
    const message = payload?.errors?.[0]?.detailed_message || payload?.errors?.[0]?.message;
    throw new Error(message || `${label} could not be read from the public workbook.`);
  }
  return (payload.table.rows || []).map(row => (row.c || []).map(cellValue));
}

function exactInteger(value, label) {
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new Error(`${label} must be a non-negative integer.`);
  }
  const number = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isSafeInteger(number) || number < 0) throw new Error(`${label} must be a non-negative integer.`);
  return number;
}

function isoTimestamp(value, label) {
  const text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(text) || !Number.isFinite(Date.parse(text))) {
    throw new Error(`${label} must be an ISO 8601 UTC timestamp.`);
  }
  return text;
}

export function parseGvizResponse(text) {
  const match = String(text).match(/google\.visualization\.Query\.setResponse\((.*)\);?\s*$/s);
  if (!match) throw new Error('Google Sheets returned an unexpected response.');
  return JSON.parse(match[1]);
}

export function parsePublicMetadata(payload, config, now = Date.now()) {
  const rows = tableRows(payload, 'Public_Metadata');
  const expectedKeys = config.public_contract.metadata.keys;
  if (rows.length !== expectedKeys.length || rows.some(row => row.length > 2)) {
    throw new Error(`Public_Metadata must contain exactly ${expectedKeys.length} key/value rows.`);
  }
  const metadata = {};
  rows.forEach((row, index) => {
    const key = String(row[0] || '').trim();
    if (key !== expectedKeys[index] || Object.hasOwn(metadata, key)) {
      throw new Error(`Public_Metadata row ${index + 1} must be ${expectedKeys[index]}.`);
    }
    metadata[key] = row[1];
  });

  if (exactInteger(metadata.schema_version, 'schema_version') !== config.schema_version) {
    throw new Error('Public_Metadata schema_version does not match the site configuration.');
  }
  if (String(metadata.event_id || '').trim() !== config.event_id) {
    throw new Error('Public_Metadata event_id does not match the site configuration.');
  }
  if (String(metadata.publication_state || '').trim() !== config.public_contract.publication_state) {
    throw new Error('Only a FINAL public aggregate can be prepared for the website.');
  }
  const publishedAt = isoTimestamp(metadata.published_at, 'published_at');
  if (Date.parse(publishedAt) > now + 5 * 60 * 1000) throw new Error('published_at is unexpectedly in the future.');
  const validBallotCount = exactInteger(metadata.valid_ballot_count, 'valid_ballot_count');
  const invalidBallotCount = exactInteger(metadata.invalid_ballot_count, 'invalid_ballot_count');
  if (validBallotCount < 1) throw new Error('A FINAL aggregate must contain at least one valid ballot.');
  const auditDigest = String(metadata.audit_digest || '').trim();
  if (!SHA256.test(auditDigest)) throw new Error('audit_digest must be a lowercase SHA-256 digest.');

  return Object.freeze({
    schemaVersion: config.schema_version,
    eventId: config.event_id,
    publicationState: config.public_contract.publication_state,
    publishedAt,
    validBallotCount,
    invalidBallotCount,
    auditDigest
  });
}

export function parsePublicLeaderboard(payload, config, metadata) {
  const rows = tableRows(payload, 'Public_Leaderboard');
  const expectedColumns = config.public_contract.leaderboard.columns;
  if (rows.length !== 13) throw new Error('Public_Leaderboard must contain one header and exactly 12 poster rows.');
  const headers = rows[0].map(value => String(value || '').trim());
  if (headers.length !== expectedColumns.length || headers.some((value, index) => value !== expectedColumns[index])) {
    throw new Error(`Public_Leaderboard headers must be exactly: ${expectedColumns.join(', ')}.`);
  }

  const catalog = new Map(config.posters.map(poster => [poster.poster_id, poster]));
  const publicRows = rows.slice(1).map((values, index) => {
    if (values.length > expectedColumns.length) throw new Error(`Public_Leaderboard row ${index + 3} has unexpected columns.`);
    const record = Object.fromEntries(expectedColumns.map((column, columnIndex) => [column, values[columnIndex]]));
    const rank = exactInteger(record.rank, `rank at row ${index + 3}`);
    const posterId = String(record.poster_id || '').trim().toUpperCase();
    const poster = catalog.get(posterId);
    if (!POSTER_ID.test(posterId) || !poster) throw new Error(`Unknown poster_id at row ${index + 3}.`);
    if (String(record.display_title || '').trim() !== poster.display_title ||
        String(record.presenting_unit || '').trim() !== poster.presenting_unit) {
      throw new Error(`Public_Leaderboard catalog details do not match ${posterId}.`);
    }
    const firstCount = exactInteger(record.first_count, `${posterId} first_count`);
    const secondCount = exactInteger(record.second_count, `${posterId} second_count`);
    const thirdCount = exactInteger(record.third_count, `${posterId} third_count`);
    const totalPoints = exactInteger(record.total_points, `${posterId} total_points`);
    const expectedPoints = firstCount * config.scoring.first + secondCount * config.scoring.second + thirdCount * config.scoring.third;
    if (totalPoints !== expectedPoints) throw new Error(`${posterId} fails the configured 3-2-1 score calculation.`);
    if (String(record.status || '').trim() !== config.public_contract.publication_state) {
      throw new Error(`${posterId} is not FINAL; review ballots and unresolved ties must be cleared before publication.`);
    }
    const updatedAt = isoTimestamp(record.updated_at, `${posterId} updated_at`);
    if (updatedAt !== metadata.publishedAt) throw new Error(`${posterId} updated_at is stale or does not match published_at.`);
    return Object.freeze({
      rank,
      poster_id: posterId,
      display_title: poster.display_title,
      presenting_unit: poster.presenting_unit,
      first_count: firstCount,
      second_count: secondCount,
      third_count: thirdCount,
      total_points: totalPoints
    });
  });

  if (new Set(publicRows.map(row => row.poster_id)).size !== config.posters.length) {
    throw new Error('Public_Leaderboard must contain every configured poster exactly once.');
  }
  const compareScore = (left, right) =>
    right.total_points - left.total_points ||
    right.first_count - left.first_count ||
    right.second_count - left.second_count ||
    right.third_count - left.third_count ||
    left.poster_id.localeCompare(right.poster_id);
  const sameScore = (left, right) =>
    left.total_points === right.total_points && left.first_count === right.first_count &&
    left.second_count === right.second_count && left.third_count === right.third_count;
  publicRows.forEach((row, index) => {
    const previous = publicRows[index - 1];
    if (previous && compareScore(previous, row) > 0) {
      throw new Error('Public_Leaderboard is not in canonical score order.');
    }
    const expectedRank = previous && sameScore(previous, row) ? previous.rank : index + 1;
    if (row.rank !== expectedRank) {
      throw new Error('Public_Leaderboard does not use canonical competition ranks for exact ties.');
    }
  });
  const firstTotal = publicRows.reduce((sum, row) => sum + row.first_count, 0);
  const secondTotal = publicRows.reduce((sum, row) => sum + row.second_count, 0);
  const thirdTotal = publicRows.reduce((sum, row) => sum + row.third_count, 0);
  const pointTotal = publicRows.reduce((sum, row) => sum + row.total_points, 0);
  if ([firstTotal, secondTotal, thirdTotal].some(total => total !== metadata.validBallotCount) ||
      pointTotal !== metadata.validBallotCount * (config.scoring.first + config.scoring.second + config.scoring.third)) {
    throw new Error('The public aggregate failed its 3-2-1 ballot accounting check.');
  }
  return Object.freeze(publicRows);
}

export function createPublishedSnapshot(metadata, rows) {
  if (!metadata || metadata.publicationState !== 'FINAL' || !Array.isArray(rows) || rows.length !== 12) {
    throw new Error('A complete FINAL public aggregate is required.');
  }
  const snapshotBody = {
    schemaVersion: metadata.schemaVersion,
    eventId: metadata.eventId,
    status: 'FINAL',
    sourceDigest: metadata.auditDigest,
    publishedAt: metadata.publishedAt,
    ballotCount: metadata.validBallotCount,
    ignoredCount: metadata.invalidBallotCount,
    rows
  };
  const snapshotId = createHash('sha256').update(JSON.stringify(snapshotBody)).digest('hex').slice(0, 12);
  return Object.freeze({...snapshotBody, snapshotId});
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

function preflight() {
  const branch = run('git', ['branch', '--show-current'], {capture: true});
  if (!branch) throw new Error('Prepare results from a named release branch, not a detached HEAD.');
  const trackedChanges = run('git', ['status', '--porcelain', '--untracked-files=no'], {capture: true});
  if (trackedChanges) throw new Error('Commit or restore tracked website changes before preparing results.');
}

function gvizUrl(spreadsheetId, sheetName, range) {
  const query = new URLSearchParams({headers: '0', sheet: sheetName, range, tqx: 'out:json'});
  return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/gviz/tq?${query}`;
}

async function fetchRange(spreadsheetId, sheetName, range) {
  const response = await fetch(gvizUrl(spreadsheetId, sheetName, range), {redirect: 'follow'});
  if (!response.ok) throw new Error(`Google Sheets returned HTTP ${response.status} for ${sheetName}!${range}.`);
  return parseGvizResponse(await response.text());
}

export async function fetchPublicAggregate(config, spreadsheetId) {
  if (!String(spreadsheetId || '').trim()) {
    throw new Error('Set GALLERY_PUBLIC_SPREADSHEET_ID to the PII-free public workbook ID.');
  }
  const contract = config.public_contract;
  const [metadataPayload, leaderboardPayload] = await Promise.all([
    fetchRange(spreadsheetId, contract.metadata.sheet_name, contract.metadata.range),
    fetchRange(spreadsheetId, contract.leaderboard.sheet_name, contract.leaderboard.range)
  ]);
  const metadata = parsePublicMetadata(metadataPayload, config);
  const rows = parsePublicLeaderboard(leaderboardPayload, config, metadata);
  return createPublishedSnapshot(metadata, rows);
}

function printSummary(snapshot) {
  process.stdout.write(`\nValid ballots: ${snapshot.ballotCount}\n`);
  process.stdout.write(`Invalid/review ballots: ${snapshot.ignoredCount}\n`);
  process.stdout.write(`Audit digest: ${snapshot.sourceDigest}\n\n`);
  process.stdout.write('Final podium to prepare:\n');
  snapshot.rows.slice(0, 3).forEach(row => {
    process.stdout.write(`${row.rank}. ${row.poster_id} — ${row.display_title} — ${row.total_points} points\n`);
  });
}

async function confirmPreparation() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Run this command interactively so the FINAL aggregate can be confirmed.');
  }
  const prompt = readline.createInterface({input: process.stdin, output: process.stdout});
  try {
    const answer = await prompt.question('\nType PREPARE to freeze these results locally: ');
    if (answer.trim() !== 'PREPARE') throw new Error('Preparation cancelled; no files were changed.');
  } finally {
    prompt.close();
  }
}

export async function prepareGalleryResults() {
  preflight();
  const config = JSON.parse(await readFile(eventConfigPath, 'utf8'));
  process.stdout.write(`Reading the PII-free public aggregate (${config.public_contract.leaderboard.range})...\n`);
  const snapshot = await fetchPublicAggregate(config, process.env.GALLERY_PUBLIC_SPREADSHEET_ID);
  printSummary(snapshot);
  await confirmPreparation();

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
  process.stdout.write(`\nPrepared snapshot ${snapshot.snapshotId} locally. Review, commit, and deploy through the normal release process.\n`);
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) {
  prepareGalleryResults().catch(error => {
    process.stderr.write(`\nPreparation stopped: ${error.message}\n`);
    process.exitCode = 1;
  });
}
