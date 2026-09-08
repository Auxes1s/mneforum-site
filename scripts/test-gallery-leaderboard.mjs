import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {interpolateScore, normalizeSnapshot, podiumGroups} from '../assets/evaluation-gallery-leaderboard.mjs';
import {
  createPublishedSnapshot,
  parseGvizResponse,
  parsePublicLeaderboard,
  parsePublicMetadata,
  replaceSnapshotBlock
} from './publish-gallery-results.mjs';

const config = JSON.parse(await readFile(new URL('../data/evaluation-gallery-event.json', import.meta.url), 'utf8'));
const publishedAt = '2026-09-09T08:00:00.000Z';
const digest = 'a'.repeat(64);
const afterPublication = Date.parse('2026-09-09T09:00:00.000Z');

function payload(rows) {
  return {
    status: 'ok',
    table: {rows: rows.map(values => ({c: values.map(value => ({v: value}))}))}
  };
}

function metadataRows(overrides = {}) {
  const values = {
    schema_version: 1,
    event_id: config.event_id,
    publication_state: 'FINAL',
    published_at: publishedAt,
    valid_ballot_count: 12,
    invalid_ballot_count: 2,
    audit_digest: digest,
    ...overrides
  };
  return config.public_contract.metadata.keys.map(key => [key, values[key]]);
}

function leaderboardRows(overrides = {}) {
  return [config.public_contract.leaderboard.columns, ...config.posters.map((poster, index) => {
    const row = {
      rank: 1,
      poster_id: poster.poster_id,
      display_title: poster.display_title,
      presenting_unit: poster.presenting_unit,
      first_count: 1,
      second_count: 1,
      third_count: 1,
      total_points: 6,
      status: 'FINAL',
      updated_at: publishedAt,
      ...(overrides[index] || {})
    };
    return config.public_contract.leaderboard.columns.map(column => row[column]);
  })];
}

const metadata = parsePublicMetadata(payload(metadataRows()), config, afterPublication);
assert.equal(metadata.eventId, config.event_id);
assert.equal(metadata.validBallotCount, 12);
assert.equal(metadata.invalidBallotCount, 2);
const rows = parsePublicLeaderboard(payload(leaderboardRows()), config, metadata);
assert.equal(rows.length, 12);
assert.deepEqual(rows.map(row => row.poster_id), config.posters.map(poster => poster.poster_id));

const competitionRows = leaderboardRows();
const columns = config.public_contract.leaderboard.columns;
const dataById = new Map(competitionRows.slice(1).map(row => [row[1], [...row]]));
Object.assign(dataById.get('P01'), {[columns.indexOf('rank')]: 1, [columns.indexOf('first_count')]: 2, [columns.indexOf('third_count')]: 0, [columns.indexOf('total_points')]: 8});
Object.assign(dataById.get('P02'), {[columns.indexOf('rank')]: 12, [columns.indexOf('first_count')]: 0, [columns.indexOf('third_count')]: 2, [columns.indexOf('total_points')]: 4});
config.posters.slice(2).forEach(poster => { dataById.get(poster.poster_id)[columns.indexOf('rank')] = 2; });
const canonicalCompetition = [competitionRows[0], dataById.get('P01'), ...config.posters.slice(2).map(poster => dataById.get(poster.poster_id)), dataById.get('P02')];
assert.deepEqual(
  parsePublicLeaderboard(payload(canonicalCompetition), config, metadata).map(row => row.rank),
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 12]
);

const published = createPublishedSnapshot(metadata, rows);
assert.equal(published.status, 'FINAL');
assert.equal(published.schemaVersion, 1);
assert.equal(published.sourceDigest, digest);
assert.equal(published.ballotCount, 12);
assert.match(published.snapshotId, /^[a-f0-9]{12}$/);
assert.equal(normalizeSnapshot(published).rows.length, 12);
assert.equal(normalizeSnapshot({
  schemaVersion: 1,
  eventId: config.event_id,
  status: 'PENDING',
  rows: []
}).status, 'PENDING');

assert.equal(interpolateScore(10, 0), 0);
assert.equal(interpolateScore(10, 0.5), 9);
assert.equal(interpolateScore(10, 1), 10);
assert.deepEqual(podiumGroups(rows).map(group => group.rank), [1]);

assert.throws(() => parsePublicMetadata(payload(metadataRows({publication_state: 'CLOSED'})), config, afterPublication), /Only a FINAL/);
assert.throws(() => parsePublicMetadata(payload(metadataRows({event_id: 'wrong-event'})), config, afterPublication), /event_id/);
assert.throws(() => parsePublicMetadata(payload(metadataRows({audit_digest: 'not-a-digest'})), config, afterPublication), /SHA-256/);
assert.throws(() => parsePublicMetadata(payload(metadataRows({valid_ballot_count: ''})), config, afterPublication), /non-negative integer/);
assert.throws(() => parsePublicMetadata(payload(metadataRows({published_at: '2026-09-09'})), config, afterPublication), /ISO 8601/);
assert.throws(() => parsePublicMetadata(payload(metadataRows().slice(1)), config, afterPublication), /exactly 7/);

assert.throws(() => parsePublicLeaderboard(payload(leaderboardRows({0: {status: 'TIE_REQUIRES_SECRETARIAT_DECISION'}})), config, metadata), /not FINAL/);
assert.throws(() => parsePublicLeaderboard(payload(leaderboardRows({1: {rank: 2}})), config, metadata), /competition ranks/);
assert.throws(() => parsePublicLeaderboard(payload(leaderboardRows({0: {updated_at: '2026-09-09T07:59:00.000Z'}})), config, metadata), /stale/);
assert.throws(() => parsePublicLeaderboard(payload(leaderboardRows({0: {total_points: 5}})), config, metadata), /score calculation/);
assert.throws(() => parsePublicLeaderboard(payload(leaderboardRows({0: {display_title: 'Wrong title'}})), config, metadata), /catalog details/);
assert.throws(() => parsePublicLeaderboard(payload(leaderboardRows({1: {
  poster_id: 'P01',
  display_title: config.posters[0].display_title,
  presenting_unit: config.posters[0].presenting_unit
}})), config, metadata), /every configured poster/);
assert.throws(() => parsePublicLeaderboard(payload(leaderboardRows({11: {rank: 12, first_count: 0, total_points: 3}})), config, metadata), /accounting/);
const badHeaders = leaderboardRows();
badHeaders[0] = [...badHeaders[0]];
badHeaders[0][9] = 'last_updated';
assert.throws(() => parsePublicLeaderboard(payload(badHeaders), config, metadata), /headers must be exactly/);

assert.throws(() => normalizeSnapshot({...published, sourceDigest: 'bad'}), /incomplete/);
assert.throws(() => normalizeSnapshot({...published, rows: published.rows.slice(1)}), /all 12 posters/);
assert.throws(() => normalizeSnapshot({...published, ballotCount: 13}), /accounting/);
assert.throws(() => normalizeSnapshot({status: 'published'}), /invalid/);

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

const wrapped = `/*O_o*/\ngoogle.visualization.Query.setResponse(${JSON.stringify(payload(metadataRows()))});`;
assert.equal(parseGvizResponse(wrapped).table.rows.length, 7);
assert.throws(() => parseGvizResponse('{}'), /unexpected response/);

const serialized = JSON.stringify(published);
assert.doesNotMatch(serialized, /(email|voting.?code|uuid|response.?id)/i);
assert.doesNotMatch(await readFile(new URL('./publish-gallery-results.mjs', import.meta.url), 'utf8'), /12kMj_aYeBsnbiEGEHZUfkiQlkNIyrdMb_q8UgQ1abQA|D1:P/);

console.log('Evaluation Gallery sanitized aggregate and preparation tests passed.');
