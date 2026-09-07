import assert from 'node:assert/strict';
import {
  buildLeaderboardUrl,
  createDemoLeaderboard,
  parseLeaderboardResponse,
  podiumGroups
} from '../assets/evaluation-gallery-leaderboard.mjs';

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

const ballot = Array(13).fill('');
ballot[0] = '1st';
ballot[4] = '3rd';
ballot[11] = '2nd';
ballot[12] = 'Yes';

const parsed = parseLeaderboardResponse(payload([ballot]));
assert.equal(parsed.rows.length, 12);
assert.equal(parsed.ballotCount, 1);
assert.equal(parsed.ignoredCount, 0);
assert.deepEqual(parsed.rows.slice(0, 3).map(row => row.poster_id), ['P01', 'P12', 'P05']);
assert.deepEqual(parsed.rows.slice(0, 3).map(row => row.total_points), [3, 2, 1]);
assert.deepEqual(podiumGroups(parsed.rows).map(group => group.rank), [1, 2, 3]);

const invalid = [...ballot];
invalid[12] = '';
const withInvalid = parseLeaderboardResponse(payload([ballot, invalid]));
assert.equal(withInvalid.ballotCount, 1);
assert.equal(withInvalid.ignoredCount, 1);

assert.throws(() => parseLeaderboardResponse(payload().table), /could not be read/);
assert.throws(() => parseLeaderboardResponse({status: 'ok', table: {cols: [], rows: []}}), /12 poster columns/);
assert.throws(() => parseLeaderboardResponse({status: 'error', errors: [{message: 'missing'}]}), /missing/);

const demo = createDemoLeaderboard();
assert.equal(demo.ballotCount, 50);
assert.equal(demo.rows.length, 12);
assert.deepEqual(demo.rows.slice(0, 3).map(row => row.poster_id), ['P01', 'P02', 'P03']);
assert.deepEqual(demo.rows.slice(0, 3).map(row => row.total_points), [58, 54, 43]);

const url = new URL(buildLeaderboardUrl(123));
assert.equal(url.hostname, 'docs.google.com');
assert.equal(url.searchParams.get('range'), 'D1:P');
assert.equal(url.searchParams.get('headers'), '1');
assert.equal(url.searchParams.get('_'), '123');
assert.match(url.searchParams.get('tqx'), /forumGalleryLeaderboardReceive/);
assert.equal(url.searchParams.has('sheet'), false);
assert.equal(url.searchParams.has('tq'), false);

console.log('Evaluation Gallery leaderboard tests passed.');
