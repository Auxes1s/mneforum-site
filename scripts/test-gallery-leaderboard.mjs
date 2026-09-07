import assert from 'node:assert/strict';
import {interpolateScore, normalizeSnapshot, parseLeaderboardResponse, podiumGroups} from '../assets/evaluation-gallery-leaderboard.mjs';
import {createPublishedSnapshot, parseGvizResponse, replaceSnapshotBlock} from './publish-gallery-results.mjs';

const posterHeaders = Array.from({length: 12}, (_, index) => {
  const id = `P${String(index + 1).padStart(2, '0')}`;
  return `Your ranking of the Evaluation Gallery [${id} — Evaluation ${index + 1} — ${index < 7 ? `DRO ${index + 1}` : 'MES/SEED'}]`;
});

function payload(ballots = []) {
  return {
    status: 'ok',
    table: {
      cols: [...posterHeaders, 'I certify this ballot'].map(label => ({label})),
      rows: ballots.map(values => ({c: values.map(value => value ? {v: value} : null)}))
    }
  };
}

function ballot(first, second, third, certified = true) {
  const values = Array(13).fill('');
  values[first] = '1st';
  values[second] = '2nd';
  values[third] = '3rd';
  values[12] = certified ? 'Yes' : '';
  return values;
}

const parsed = parseLeaderboardResponse(payload([ballot(0, 11, 4)]));
assert.equal(parsed.rows.length, 12);
assert.equal(parsed.ballotCount, 1);
assert.equal(parsed.ignoredCount, 0);
assert.deepEqual(parsed.rows.slice(0, 3).map(row => row.poster_id), ['P01', 'P12', 'P05']);
assert.deepEqual(parsed.rows.slice(0, 3).map(row => row.total_points), [3, 2, 1]);
assert.deepEqual(podiumGroups(parsed.rows).map(group => group.rank), [1, 2, 3]);

assert.equal(interpolateScore(10, 0), 0);
assert.equal(interpolateScore(10, 0.5), 9);
assert.equal(interpolateScore(10, 1), 10);
assert.equal(interpolateScore(10, 2), 10);
assert.equal(interpolateScore(10, -1), 0);
assert.equal(interpolateScore(0, 0.7), 0);
assert.equal(interpolateScore(7.9, 1), 7);

const withInvalid = parseLeaderboardResponse(payload([ballot(0, 11, 4), ballot(1, 2, 3, false)]));
assert.equal(withInvalid.ballotCount, 1);
assert.equal(withInvalid.ignoredCount, 1);

const tied = parseLeaderboardResponse(payload([ballot(0, 2, 3), ballot(1, 2, 3)]));
assert.deepEqual(tied.rows.slice(0, 3).map(row => row.poster_id), ['P03', 'P01', 'P02']);
assert.deepEqual(tied.rows.slice(0, 3).map(row => row.rank), [1, 2, 3]);

assert.throws(() => parseLeaderboardResponse(payload().table), /could not be read/);
assert.throws(() => parseLeaderboardResponse({status: 'ok', table: {cols: [], rows: []}}), /12 poster columns/);
assert.throws(() => parseLeaderboardResponse({status: 'error', errors: [{message: 'missing'}]}), /missing/);

const published = createPublishedSnapshot(parsed, '2026-09-09T08:00:00.000Z');
assert.equal(published.status, 'published');
assert.equal(published.ballotCount, 1);
assert.match(published.snapshotId, /^[a-f0-9]{12}$/);
assert.equal(published.rows.length, 12);
assert.deepEqual(normalizeSnapshot(published).rows.slice(0, 3).map(row => row.poster_id), ['P01', 'P12', 'P05']);
assert.equal(normalizeSnapshot({status: 'pending'}).rows.length, 0);
assert.throws(() => createPublishedSnapshot({rows: [], ballotCount: 0}), /No complete ballots/);
assert.throws(() => normalizeSnapshot({...published, rows: published.rows.slice(1)}), /all 12 posters/);

const marker = [
  'before',
  '  // EVALUATION_GALLERY_SNAPSHOT_START',
  '  const evaluationGallerySnapshot = Object.freeze({"status":"pending"});',
  '  // EVALUATION_GALLERY_SNAPSHOT_END',
  'after'
].join('\n');
const replaced = replaceSnapshotBlock(marker, published);
assert.match(replaced, new RegExp(published.snapshotId));
assert.doesNotMatch(replaced, /"status":"pending"/);
assert.throws(() => replaceSnapshotBlock('missing markers', published), /marker is missing/);

const wrapped = `/*O_o*/\ngoogle.visualization.Query.setResponse(${JSON.stringify(payload([ballot(0, 11, 4)]))});`;
assert.equal(parseGvizResponse(wrapped).table.rows.length, 1);
assert.throws(() => parseGvizResponse('{}'), /unexpected response/);

console.log('Evaluation Gallery snapshot and publication tests passed.');
