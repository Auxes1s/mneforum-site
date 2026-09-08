import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {interpolateScore, normalizeSnapshot, podiumGroups} from '../assets/evaluation-gallery-leaderboard.mjs';
import {replaceSnapshotBlock, validateSnapshotForSite} from './publish-gallery-results.mjs';
import {authorizationRecords, decryptRegistry, decryptRegistryBundle, encryptRegistry, parseCsv} from './lib/gallery-voter-registry.mjs';

const config = JSON.parse(await readFile(new URL('../data/evaluation-gallery-event.json', import.meta.url), 'utf8'));
const publishedAt = '2026-09-09T08:00:00.000Z';

function publishedSnapshot(overrides = {}) {
  return {
    schemaVersion: config.schema_version,
    eventId: config.event_id,
    status: 'FINAL',
    snapshotId: 'abc123def456',
    sourceDigest: 'a'.repeat(64),
    publishedAt,
    ballotCount: 12,
    ignoredCount: 2,
    rows: config.posters.map(poster => ({
      rank: 1,
      poster_id: poster.poster_id,
      display_title: poster.display_title,
      presenting_unit: poster.presenting_unit,
      first_count: 1,
      second_count: 1,
      third_count: 1,
      total_points: 6
    })),
    ...overrides
  };
}

const published = validateSnapshotForSite(publishedSnapshot(), config, Date.parse('2026-09-09T09:00:00.000Z'));
assert.equal(published.status, 'FINAL');
assert.equal(published.ballotCount, 12);
assert.equal(published.rows.length, 12);
assert.deepEqual(podiumGroups(published.rows).map(group => group.rank), [1]);

assert.equal(normalizeSnapshot({
  schemaVersion: 1,
  eventId: config.event_id,
  status: 'PENDING',
  rows: []
}).status, 'PENDING');
assert.equal(interpolateScore(10, 0), 0);
assert.equal(interpolateScore(10, 0.5), 9);
assert.equal(interpolateScore(10, 1), 10);

const testNow = Date.parse('2026-09-09T09:00:00.000Z');
assert.throws(() => validateSnapshotForSite({...publishedSnapshot(), status: 'PENDING', rows: []}, config, testNow), /Only a FINAL/);
assert.throws(() => validateSnapshotForSite(publishedSnapshot({eventId: 'wrong-event'}), config, testNow), /event contract/);
assert.throws(() => validateSnapshotForSite(publishedSnapshot({sourceDigest: 'bad'}), config, testNow), /incomplete/);
assert.throws(() => validateSnapshotForSite(publishedSnapshot({ballotCount: 13}), config, testNow), /accounting/);
const wrongCatalog = publishedSnapshot();
wrongCatalog.rows[0].display_title = 'Wrong title';
assert.throws(() => validateSnapshotForSite(wrongCatalog, config, testNow), /catalog details/);

const marker = [
  'before',
  '  // EVALUATION_GALLERY_SNAPSHOT_START',
  '  const evaluationGallerySnapshot = Object.freeze({"status":"PENDING"});',
  '  // EVALUATION_GALLERY_SNAPSHOT_END',
  'after'
].join('\n');
const replaced = replaceSnapshotBlock(marker, published);
assert.match(replaced, new RegExp(published.snapshotId));
assert.doesNotMatch(replaced, /"status":"PENDING"/);
assert.throws(() => replaceSnapshotBlock('missing markers', published), /marker is missing/);

const serialized = JSON.stringify(published);
assert.doesNotMatch(serialized, /(email|voting.?code|uuid|response.?id)/i);
assert.doesNotMatch(await readFile(new URL('./publish-gallery-results.mjs', import.meta.url), 'utf8'), /docs\.google\.com\/spreadsheets|GALLERY_PUBLIC_SPREADSHEET_ID|Public_Leaderboard/);

const testPassphrase = 'correct horse battery staple for tests';
const sampleAuthorization = authorizationRecords([{
  vote_code: '2345', active: 'true', eligible_to_vote: 'true',
  authorized_google_email: '', bound_email: ''
}]);
const testSource = {type: 'google-sheets-gviz-csv', spreadsheet_id: 'test-sheet'};
const encrypted = encryptRegistry(sampleAuthorization, testPassphrase, publishedAt, testSource);
assert.deepEqual(decryptRegistry(encrypted, testPassphrase), sampleAuthorization);
assert.deepEqual(decryptRegistryBundle(encrypted, testPassphrase).source, testSource);
assert.throws(() => decryptRegistry(encrypted, 'incorrect passphrase that is long enough'), /Could not decrypt/);
assert.equal(parseCsv('vote_code,active,eligible_to_vote,authorized_google_email,bound_email\r\n2345,true,true,,\r\n').length, 1);

console.log('Evaluation Gallery frozen-snapshot tests passed.');
