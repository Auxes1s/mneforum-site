import crypto from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import readline from 'node:readline/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {decryptRegistry, parseCsvMatrix, votingCodePattern} from './lib/gallery-voter-registry.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultOpen = '2026-09-09T10:15:00+08:00';
const defaultClose = '2026-09-09T15:30:00+08:00';
const ranks = ['1st', '2nd', '3rd'];

function parseArgs(argv) {
  const result = {dryRun: false, deploy: false, yes: false};
  const valued = ['--input', '--registry', '--passphrase-file', '--published-at', '--voting-open', '--voting-close', '--live-url'];
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--dry-run') result.dryRun = true;
    else if (value === '--deploy') result.deploy = true;
    else if (value === '--yes') result.yes = true;
    else if (valued.includes(value) && argv[index + 1]) result[value.slice(2).replaceAll('-', '_')] = argv[++index];
    else throw new Error(`Unexpected or incomplete argument: ${value}`);
  }
  if (!result.input) throw new Error('Missing required --input CSV path.');
  if (result.deploy && result.dryRun) throw new Error('--deploy cannot be combined with --dry-run.');
  return result;
}

function run(command, args, options = {}) {
  const isWindowsNpm = process.platform === 'win32' && command === 'npm';
  const executable = isWindowsNpm ? (process.env.ComSpec || 'cmd.exe') : command;
  const commandArgs = isWindowsNpm
    ? ['/d', '/s', '/c', `npm.cmd ${args.map(value => `"${String(value).replaceAll('"', '""')}"`).join(' ')}`]
    : args;
  const result = spawnSync(executable, commandArgs, {
    cwd: root, encoding: 'utf8', stdio: options.capture ? 'pipe' : 'inherit'
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = options.capture ? String(result.stderr || result.stdout || '').trim() : '';
    throw new Error(`${command} ${args.join(' ')} failed${detail ? `: ${detail}` : '.'}`);
  }
  return String(result.stdout || '').trim();
}

function normalize(value) {
  return String(value ?? '').replace(/\u00a0/g, ' ').trim().replace(/\s+/g, ' ');
}

function parseTimestamp(value) {
  const text = normalize(value);
  if (/^\d{4}-\d\d-\d\dT/.test(text)) {
    const milliseconds = Date.parse(text);
    if (!Number.isFinite(milliseconds)) throw new Error('Unsupported timestamp');
    return milliseconds;
  }
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([AP]M))?$/i);
  if (!match) throw new Error('Unsupported timestamp');
  let hour = Number(match[4]);
  if (match[7]) {
    hour %= 12;
    if (match[7].toUpperCase() === 'PM') hour += 12;
  }
  return Date.UTC(Number(match[3]), Number(match[1]) - 1, Number(match[2]), hour - 8, Number(match[5]), Number(match[6] || 0));
}

function classifyHeaders(headers, posters) {
  const canonical = new Map(headers.map((header, index) => [normalize(header), index]));
  for (const required of ['Timestamp', 'Voting Code']) if (!canonical.has(required)) throw new Error(`Missing required column: ${required}`);
  const emailHeaders = ['Email Address', 'Username'].filter(header => canonical.has(header));
  if (emailHeaders.length !== 1) throw new Error('CSV must contain exactly one verified-email column.');
  const posterColumns = new Map();
  let certification = -1;
  headers.forEach((header, index) => {
    const text = normalize(header);
    const match = text.match(/\[(P(?:0[1-9]|1[0-2]))(?:\s|—|-)/);
    if (match) {
      if (posterColumns.has(match[1])) throw new Error(`Duplicate poster column: ${match[1]}`);
      posterColumns.set(match[1], index);
    } else if (text.toLowerCase().startsWith('i certify that i am personally submitting this ranking')) certification = index;
  });
  const expected = posters.map(poster => poster.poster_id).sort();
  if (JSON.stringify([...posterColumns.keys()].sort()) !== JSON.stringify(expected)) throw new Error('Voting grid must contain P01 through P12 exactly once.');
  if (certification < 0) throw new Error('Missing certification column.');
  return {timestamp: canonical.get('Timestamp'), code: canonical.get('Voting Code'), email: canonical.get(emailHeaders[0]), certification, posterColumns};
}

function tally(matrix, authorization, config, votingOpen, votingClose) {
  if (!matrix.length) throw new Error('Voting CSV is empty.');
  const schema = classifyHeaders(matrix[0], config.posters);
  const registry = new Map(authorization.map(record => [record.vote_code, record]));
  const counts = new Map(config.posters.map(poster => [poster.poster_id, {first_count: 0, second_count: 0, third_count: 0}]));
  const acceptedCodes = new Set();
  const acceptedEmails = new Set();
  const reasons = {};
  const addReason = reason => { reasons[reason] = (reasons[reason] || 0) + 1; };
  const opensAt = parseTimestamp(votingOpen);
  const closesAt = parseTimestamp(votingClose);
  let responseRows = 0;
  for (const values of matrix.slice(1)) {
    if (!values.some(normalize)) continue;
    responseRows += 1;
    if (values.length !== matrix[0].length) { addReason('MALFORMED'); continue; }
    const valueAt = index => normalize(values[index]);
    const email = valueAt(schema.email).toLowerCase();
    const code = valueAt(schema.code).replace(/\s/g, '').toUpperCase();
    let submittedAt;
    try { submittedAt = parseTimestamp(valueAt(schema.timestamp)); } catch { addReason('MALFORMED'); continue; }
    if (!email) { addReason('MALFORMED'); continue; }
    if (submittedAt < opensAt || submittedAt > closesAt) { addReason('OUTSIDE_WINDOW'); continue; }
    if (!votingCodePattern.test(code) || !registry.has(code)) { addReason('INVALID_CODE'); continue; }
    const voter = registry.get(code);
    if (!voter.active || !voter.eligible_to_vote) { addReason('INACTIVE_CODE'); continue; }
    if ((voter.authorized_google_email && voter.authorized_google_email !== email) || (voter.bound_email && voter.bound_email !== email)) {
      addReason('EMAIL_MISMATCH'); continue;
    }
    if (valueAt(schema.certification).toLowerCase() !== 'yes') { addReason('UNCERTIFIED'); continue; }
    const selections = new Map();
    let invalidRank = false;
    for (const [posterId, index] of schema.posterColumns) {
      const rank = valueAt(index);
      if (!rank) continue;
      if (!ranks.includes(rank) || selections.has(rank)) { invalidRank = true; break; }
      selections.set(rank, posterId);
    }
    if (invalidRank) { addReason('INVALID_OR_DUPLICATE_RANK'); continue; }
    if (selections.size !== 3) { addReason('INCOMPLETE_RANKING'); continue; }
    if (acceptedCodes.has(code)) { addReason('DUPLICATE_CODE'); continue; }
    if (acceptedEmails.has(email)) { addReason('DUPLICATE_EMAIL'); continue; }
    acceptedCodes.add(code);
    acceptedEmails.add(email);
    addReason('VALID');
    counts.get(selections.get('1st')).first_count += 1;
    counts.get(selections.get('2nd')).second_count += 1;
    counts.get(selections.get('3rd')).third_count += 1;
  }
  const rows = config.posters.map(poster => {
    const count = counts.get(poster.poster_id);
    return {...poster, ...count, total_points: count.first_count * 3 + count.second_count * 2 + count.third_count};
  }).sort((a, b) => b.total_points - a.total_points || b.first_count - a.first_count || b.second_count - a.second_count || b.third_count - a.third_count || a.poster_id.localeCompare(b.poster_id));
  rows.forEach((row, index) => {
    const prior = rows[index - 1];
    row.rank = prior && ['total_points', 'first_count', 'second_count', 'third_count'].every(key => row[key] === prior[key]) ? prior.rank : index + 1;
  });
  return {rows, summary: {response_rows: responseRows, valid_ballots: reasons.VALID || 0, invalid_ballots: responseRows - (reasons.VALID || 0), reason_counts: Object.fromEntries(Object.entries(reasons).sort())}};
}

function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function csvCell(value) { const text = String(value ?? ''); return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }
function rankingsCsv(rows) {
  const fields = ['rank', 'poster_id', 'display_title', 'presenting_unit', 'first_count', 'second_count', 'third_count', 'total_points'];
  return [fields.join(','), ...rows.map(row => fields.map(field => csvCell(row[field])).join(','))].join('\r\n') + '\r\n';
}
function runId(now = new Date()) { return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z'); }

async function getPassphrase(options) {
  if (process.env.MNEFORUM_VOTER_REGISTRY_PASSPHRASE) return process.env.MNEFORUM_VOTER_REGISTRY_PASSPHRASE;
  const keyFile = path.resolve(options.passphrase_file || path.join(root, '.gallery-closeout.key'));
  try { return (await readFile(keyFile, 'utf8')).trim(); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    if (!process.stdin.isTTY) throw new Error('Set MNEFORUM_VOTER_REGISTRY_PASSPHRASE or provide --passphrase-file.');
    const prompt = readline.createInterface({input: process.stdin, output: process.stdout});
    try { return (await prompt.question('Encrypted voter registry passphrase: ')).trim(); } finally { prompt.close(); }
  }
}

async function confirmPublish() {
  if (!process.stdin.isTTY) throw new Error('Run interactively or pass --yes only after aggregate QA approval.');
  const prompt = readline.createInterface({input: process.stdin, output: process.stdout});
  try {
    if ((await prompt.question('Type PUBLISH to install and optionally deploy the FINAL snapshot: ')).trim() !== 'PUBLISH') throw new Error('Closeout cancelled before website files were changed.');
  } finally { prompt.close(); }
}

async function waitForLive(snapshotId, liveUrl) {
  for (let attempt = 1; attempt <= 18; attempt += 1) {
    const response = await fetch(`${liveUrl}?snapshot=${snapshotId}-${attempt}`, {headers: {'cache-control': 'no-cache'}});
    if (response.ok && (await response.text()).includes(`"snapshotId": "${snapshotId}"`)) return;
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  throw new Error(`Push completed, but the live page did not expose snapshot ${snapshotId} within 90 seconds.`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(options.input);
  if (path.extname(inputPath).toLowerCase() !== '.csv') throw new Error('Download the closed Google response sheet as CSV.');
  const registryPath = path.resolve(options.registry || path.join(root, 'data', 'evaluation-gallery-voters.enc.json'));
  const [inputBytes, bundleBytes, config] = await Promise.all([
    readFile(inputPath), readFile(registryPath), readFile(path.join(root, 'data', 'evaluation-gallery-event.json'), 'utf8').then(JSON.parse)
  ]);
  const authorization = decryptRegistry(JSON.parse(bundleBytes), await getPassphrase(options));
  const votingOpen = options.voting_open || defaultOpen;
  const votingClose = options.voting_close || defaultClose;
  const publishedAt = options.published_at || new Date().toISOString();
  const {rows, summary} = tally(parseCsvMatrix(inputBytes.toString('utf8')), authorization, config, votingOpen, votingClose);
  const releaseId = runId();
  const output = path.join(root, '.gallery-closeout-runs', releaseId);
  await mkdir(output, {recursive: true});
  const csv = rankingsCsv(rows);
  summary.input_sha256 = sha256(inputBytes);
  summary.encrypted_registry_sha256 = sha256(bundleBytes);
  summary.rankings_sha256 = sha256(Buffer.from(csv));
  summary.voting_open = votingOpen;
  summary.voting_close = votingClose;
  const snapshotRows = rows.map(row => Object.fromEntries(['rank', 'poster_id', 'display_title', 'presenting_unit', 'first_count', 'second_count', 'third_count', 'total_points'].map(key => [key, row[key]])));
  const sourceDigest = sha256(JSON.stringify({summary, rows: snapshotRows}));
  const snapshot = {schemaVersion: config.schema_version, eventId: config.event_id, status: 'FINAL', snapshotId: sourceDigest.slice(0, 12), sourceDigest, publishedAt, ballotCount: summary.valid_ballots, ignoredCount: summary.invalid_ballots, rows: snapshotRows};
  const snapshotPath = path.join(output, 'evaluation-gallery-snapshot.json');
  await Promise.all([
    writeFile(path.join(output, 'voting-rankings.csv'), csv, 'utf8'),
    writeFile(path.join(output, 'voting-audit-summary.json'), JSON.stringify(summary, null, 2) + '\n', 'utf8'),
    writeFile(snapshotPath, JSON.stringify(snapshot, null, 2) + '\n', 'utf8')
  ]);
  run('npm', ['run', 'gallery:prepare', '--', '--snapshot', snapshotPath, '--dry-run']);
  process.stdout.write(`Aggregate QA passed: ${summary.valid_ballots} valid, ${summary.invalid_ballots} ignored, 12 poster rows.\nRun artifacts: ${output}\n`);
  if (options.dryRun) { run('npm', ['run', 'check']); run('npm', ['run', 'build']); process.stdout.write('Dry run complete; website source was not changed.\n'); return; }
  if (!options.yes) await confirmPublish();
  run('npm', ['run', 'gallery:prepare', '--', '--snapshot', snapshotPath, '--yes']);
  if (!options.deploy) { process.stdout.write('Website prepared locally. Review index.html and dev/index.html, then commit and push through the normal release workflow.\n'); return; }
  run('git', ['add', 'index.html', 'dev/index.html']);
  run('git', ['commit', '-m', `Publish Evaluation Gallery results ${snapshot.snapshotId}`]);
  const branch = run('git', ['branch', '--show-current'], {capture: true});
  run('git', ['push', 'origin', branch]);
  const liveUrl = options.live_url || 'https://mnenetwork.forum/';
  await waitForLive(snapshot.snapshotId, liveUrl);
  process.stdout.write(`Deployment smoke test passed: snapshot ${snapshot.snapshotId}.\n`);
}

main().catch(error => {
  process.stderr.write(`Closeout stopped: ${error.message}\n`);
  process.exitCode = 1;
});
