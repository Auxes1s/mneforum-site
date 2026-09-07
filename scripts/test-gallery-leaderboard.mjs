import assert from 'node:assert/strict';
import {buildLeaderboardUrl, parseLeaderboardResponse, podiumGroups} from '../assets/evaluation-gallery-leaderboard.mjs';

const headers = [
  'rank', 'poster_id', 'display_title', 'presenting_unit', 'first_count',
  'second_count', 'third_count', 'total_points', 'status', 'last_updated'
];
const rows = Array.from({length: 12}, (_, index) => ({
  rank: index + 1,
  poster_id: `P${String(index + 1).padStart(2, '0')}`,
  display_title: `Evaluation ${index + 1}`,
  presenting_unit: index < 7 ? `DRO ${index + 1}` : 'MES/SEED',
  first_count: Math.max(0, 12 - index),
  second_count: 2,
  third_count: 1,
  total_points: Math.max(0, 40 - index * 3),
  status: 'LIVE - UNOFFICIAL',
  last_updated: '9/7/2026 12:00:00'
}));

function payload(data = rows, labels = headers) {
  return {
    status: 'ok',
    table: {
      cols: labels.map(label => ({label})),
      rows: data.map(row => ({c: headers.map(header => ({v: row[header]}))}))
    }
  };
}

const parsed = parseLeaderboardResponse(payload());
assert.equal(parsed.length, 12);
assert.deepEqual(parsed.slice(0, 3).map(row => row.poster_id), ['P01', 'P02', 'P03']);
assert.deepEqual(podiumGroups(parsed).map(group => group.rank), [1, 2, 3]);

const tiedRows = rows.map(row => ({...row}));
tiedRows[1].rank = 1;
assert.deepEqual(podiumGroups(parseLeaderboardResponse(payload(tiedRows)))[0].rows.map(row => row.poster_id), ['P01', 'P02']);

assert.throws(() => parseLeaderboardResponse(payload(rows.slice(0, 11))), /one row for each poster/);
assert.throws(() => parseLeaderboardResponse(payload(rows, ['Email Address', ...headers.slice(1)])), /not ready/);
assert.throws(() => parseLeaderboardResponse({status: 'error', errors: [{message: 'missing'}]}), /missing/);

const url = new URL(buildLeaderboardUrl(123));
assert.equal(url.hostname, 'docs.google.com');
assert.equal(url.searchParams.get('sheet'), 'Public_Leaderboard');
assert.equal(url.searchParams.get('range'), 'A2:J14');
assert.match(url.searchParams.get('tq'), /where B matches 'P\(0\[1-9\]\|1\[0-2\]\)'/);
assert.match(url.searchParams.get('tq'), /label A 'rank', B 'poster_id'/);
assert.equal(url.searchParams.get('_'), '123');
assert.match(url.searchParams.get('tqx'), /forumGalleryLeaderboardReceive/);

console.log('Evaluation Gallery leaderboard tests passed.');
