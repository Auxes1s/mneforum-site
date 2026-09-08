import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {authorizationRecords, encryptRegistry, parseCsv} from './lib/gallery-voter-registry.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function args(argv) {
  const result = {output: path.join(root, 'data', 'evaluation-gallery-voters.enc.json')};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!['--registry', '--output', '--passphrase-file', '--spreadsheet-id'].includes(key) || !argv[index + 1]) throw new Error(`Invalid argument: ${key}`);
    result[key.slice(2).replaceAll('-', '_')] = argv[++index];
  }
  if (!result.registry) throw new Error('Missing required --registry path.');
  if (!result.spreadsheet_id && !process.env.MNEFORUM_RESPONSE_SPREADSHEET_ID) {
    throw new Error('Missing --spreadsheet-id or MNEFORUM_RESPONSE_SPREADSHEET_ID.');
  }
  return result;
}

async function passphraseFor(options) {
  if (process.env.MNEFORUM_VOTER_REGISTRY_PASSPHRASE) return process.env.MNEFORUM_VOTER_REGISTRY_PASSPHRASE;
  const file = path.resolve(options.passphrase_file || path.join(root, '.gallery-closeout.key'));
  return (await readFile(file, 'utf8')).trim();
}

async function main() {
  const options = args(process.argv.slice(2));
  const rows = parseCsv(await readFile(path.resolve(options.registry), 'utf8'));
  const records = authorizationRecords(rows);
  const spreadsheetId = options.spreadsheet_id || process.env.MNEFORUM_RESPONSE_SPREADSHEET_ID;
  const bundle = encryptRegistry(records, await passphraseFor(options), new Date().toISOString(), {
    type: 'google-sheets-gviz-csv', spreadsheet_id: spreadsheetId
  });
  await writeFile(path.resolve(options.output), JSON.stringify(bundle, null, 2) + '\n', {encoding: 'utf8', mode: 0o600});
  process.stdout.write(`Encrypted voter authorization registry written safely (${records.length} records; no codes printed).\n`);
}

main().catch(error => {
  process.stderr.write(`Registry sealing failed: ${error.message}\n`);
  process.exitCode = 1;
});
