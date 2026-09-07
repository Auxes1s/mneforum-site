const CONFIG = Object.freeze({
  voteUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSeDM6dpnmSMSehh682HVQUO7TP9Cx-Md_lEtM0HOC-iwhtTLQ/viewform'
});

const POSTER_ID = /^P(?:0[1-9]|1[0-2])$/;
const CHOICES = Object.freeze({first: '1st', second: '2nd', third: '3rd'});

function cellValue(cell) {
  if (!cell) return '';
  if (cell.f !== undefined && cell.f !== null) return cell.f;
  return cell.v === undefined || cell.v === null ? '' : cell.v;
}

function parsePosterHeader(label) {
  const bracketed = String(label || '').match(/\[([^\]]+)\]\s*$/)?.[1] || '';
  const parts = bracketed.split(' — ').map(part => part.trim()).filter(Boolean);
  const posterId = parts.shift()?.toUpperCase() || '';
  const presentingUnit = parts.pop() || '';
  const displayTitle = parts.join(' — ');
  if (!POSTER_ID.test(posterId) || !displayTitle || !presentingUnit) {
    throw new Error('The public Sheet poster headings are not in the expected format.');
  }
  return {poster_id: posterId, display_title: displayTitle, presenting_unit: presentingUnit};
}

function assignRanks(rows) {
  const ranked = [...rows].sort((a, b) =>
    b.total_points - a.total_points ||
    b.first_count - a.first_count ||
    b.second_count - a.second_count ||
    b.third_count - a.third_count ||
    a.poster_id.localeCompare(b.poster_id)
  );
  ranked.forEach((row, index) => {
    row.rank = index + 1;
    Object.freeze(row);
  });
  return ranked;
}

export function parseLeaderboardResponse(payload) {
  if (!payload || payload.status !== 'ok' || !payload.table) {
    const message = payload?.errors?.[0]?.detailed_message || payload?.errors?.[0]?.message;
    throw new Error(message || 'The public Sheet could not be read.');
  }

  const columns = payload.table.cols || [];
  if (columns.length !== 13) {
    throw new Error('The public Sheet must contain 12 poster columns and the certification column.');
  }

  const posters = columns.slice(0, 12).map(column => parsePosterHeader(column.label));
  if (new Set(posters.map(poster => poster.poster_id)).size !== 12) {
    throw new Error('The public Sheet must contain one heading for each poster from P01 to P12.');
  }

  const tallies = posters.map(poster => ({
    ...poster,
    first_count: 0,
    second_count: 0,
    third_count: 0,
    total_points: 0,
    rank: 0
  }));
  let ballotCount = 0;
  let ignoredCount = 0;

  for (const {c = []} of payload.table.rows || []) {
    const selections = tallies.map((_, index) => String(cellValue(c[index])).trim());
    const certified = /^yes$/i.test(String(cellValue(c[12])).trim());
    const first = selections.filter(value => value === CHOICES.first).length;
    const second = selections.filter(value => value === CHOICES.second).length;
    const third = selections.filter(value => value === CHOICES.third).length;

    if (!certified || first !== 1 || second !== 1 || third !== 1) {
      ignoredCount += 1;
      continue;
    }

    ballotCount += 1;
    selections.forEach((choice, index) => {
      if (choice === CHOICES.first) tallies[index].first_count += 1;
      if (choice === CHOICES.second) tallies[index].second_count += 1;
      if (choice === CHOICES.third) tallies[index].third_count += 1;
    });
  }

  tallies.forEach(row => {
    row.total_points = row.first_count * 3 + row.second_count * 2 + row.third_count;
  });

  return Object.freeze({rows: assignRanks(tallies), ballotCount, ignoredCount});
}

export function podiumGroups(rows) {
  if (!rows.some(row => row.total_points > 0)) return [];
  return [1, 2, 3].map(rank => ({rank, rows: rows.filter(row => row.rank === rank)}))
    .filter(group => group.rows.length);
}

export function normalizeSnapshot(snapshot) {
  if (!snapshot || !['pending', 'published'].includes(snapshot.status)) {
    throw new Error('The Evaluation Gallery snapshot is invalid.');
  }
  if (snapshot.status === 'pending') {
    return Object.freeze({status: 'pending', snapshotId: '', publishedAt: '', ballotCount: 0, ignoredCount: 0, rows: []});
  }
  if (!String(snapshot.snapshotId || '').trim() || Number(snapshot.ballotCount) < 1 || !String(snapshot.publishedAt || '').trim()) {
    throw new Error('The published Evaluation Gallery snapshot is incomplete.');
  }
  if (!Array.isArray(snapshot.rows) || snapshot.rows.length !== 12) {
    throw new Error('The published Evaluation Gallery snapshot must contain all 12 posters.');
  }
  const rows = snapshot.rows.map((row, index) => {
    const posterId = String(row.poster_id || '').trim().toUpperCase();
    const values = ['first_count', 'second_count', 'third_count', 'total_points'].map(field => Number(row[field]));
    if (!POSTER_ID.test(posterId) || !String(row.display_title || '').trim() || !String(row.presenting_unit || '').trim() ||
        values.some(value => !Number.isFinite(value) || value < 0) || Number(row.rank) !== index + 1) {
      throw new Error('The published Evaluation Gallery snapshot contains an invalid poster row.');
    }
    return Object.freeze({
      rank: index + 1,
      poster_id: posterId,
      display_title: String(row.display_title).trim(),
      presenting_unit: String(row.presenting_unit).trim(),
      first_count: values[0],
      second_count: values[1],
      third_count: values[2],
      total_points: values[3]
    });
  });
  if (new Set(rows.map(row => row.poster_id)).size !== 12) {
    throw new Error('The published Evaluation Gallery snapshot contains duplicate posters.');
  }
  return Object.freeze({
    status: 'published',
    snapshotId: String(snapshot.snapshotId).trim(),
    publishedAt: String(snapshot.publishedAt).trim(),
    ballotCount: Number(snapshot.ballotCount),
    ignoredCount: Math.max(0, Number(snapshot.ignoredCount) || 0),
    rows
  });
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const state = {
  snapshot: Object.freeze({status: 'pending', snapshotId: '', publishedAt: '', ballotCount: 0, ignoredCount: 0, rows: []}),
  error: ''
};

function createPlinth(rank) {
  const placeName = rank === 1 ? 'First place' : rank === 2 ? 'Second place' : 'Third place';
  const plinth = element('div', 'eg-podium-plinth');
  plinth.setAttribute('aria-hidden', 'true');
  if (rank === 1) {
    const butterfly = element('img', 'eg-podium-winner-mark');
    butterfly.src = 'assets/butterfly-mark.svg';
    butterfly.alt = '';
    butterfly.width = 42;
    butterfly.height = 47;
    plinth.appendChild(butterfly);
  }
  plinth.append(element('strong', 'eg-podium-rank', String(rank)));
  plinth.append(element('span', '', placeName));
  return plinth;
}

function renderPodium(root, rows, pending = false) {
  const podium = root.querySelector('[data-eg-podium]');
  podium.replaceChildren();
  const groups = pending ? [1, 2, 3].map(rank => ({rank, rows: []})) : podiumGroups(rows);

  groups.forEach(group => {
    const place = element('article', `eg-podium-place eg-podium-place--${group.rank}${pending ? ' eg-podium-place--pending' : ''}`);
    const placeName = group.rank === 1 ? 'First place' : group.rank === 2 ? 'Second place' : 'Third place';
    place.setAttribute('aria-label', placeName);
    if (!pending) {
      const contenders = element('div', 'eg-podium-contenders');
      group.rows.forEach(row => {
        const entry = element('div', 'eg-podium-entry');
        const meta = element('div', 'eg-podium-meta');
        meta.append(element('span', 'eg-poster-code', row.poster_id));
        meta.append(element('span', 'eg-podium-place-label', placeName));
        entry.appendChild(meta);
        const title = element('h3', 'eg-podium-title', row.display_title);
        title.title = row.display_title;
        entry.appendChild(title);
        entry.append(element('p', 'eg-podium-unit', row.presenting_unit));
        const points = element('p', 'eg-podium-points');
        points.append(element('strong', '', String(row.total_points)));
        points.append(document.createTextNode(` point${row.total_points === 1 ? '' : 's'}`));
        entry.appendChild(points);
        contenders.appendChild(entry);
      });
      place.appendChild(contenders);
    }
    place.appendChild(createPlinth(group.rank));
    podium.appendChild(place);
  });
}

function renderRanking(root, rows) {
  const list = root.querySelector('[data-eg-ranking]');
  list.replaceChildren();
  const maximum = Math.max(1, ...rows.map(row => row.total_points));
  rows.forEach(row => {
    const item = element('li', 'eg-ranking-row');
    item.append(element('span', 'eg-ranking-position', String(row.rank)));
    const identity = element('div', 'eg-ranking-identity');
    const heading = element('div', 'eg-ranking-heading');
    heading.append(element('span', 'eg-poster-code', row.poster_id));
    heading.append(element('strong', '', row.display_title));
    identity.appendChild(heading);
    identity.append(element('span', 'eg-ranking-unit', row.presenting_unit));
    const track = element('span', 'eg-ranking-track');
    const bar = element('span', 'eg-ranking-bar');
    bar.style.width = `${Math.max(0, Math.min(100, row.total_points / maximum * 100))}%`;
    track.appendChild(bar);
    identity.appendChild(track);
    item.appendChild(identity);
    const score = element('div', 'eg-ranking-score');
    score.append(element('strong', '', String(row.total_points)));
    score.append(element('span', '', `point${row.total_points === 1 ? '' : 's'}`));
    item.appendChild(score);
    list.appendChild(item);
  });
}

function formatPublishedAt(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila'
  }).format(date);
}

function render() {
  const root = document.querySelector('#evaluation-gallery-leaderboard');
  if (!root || root.dataset.egInitialized !== 'true') return;
  const status = root.querySelector('[data-eg-status]');
  const detail = root.querySelector('[data-eg-detail]');
  const rankingSection = root.querySelector('[data-eg-ranking-section]');
  const snapshot = state.snapshot;

  if (state.error) {
    status.textContent = 'Results unavailable';
    status.dataset.state = 'error';
    detail.textContent = 'The saved results could not be read.';
    rankingSection.hidden = true;
    renderPodium(root, [], true);
    return;
  }

  if (snapshot.status === 'pending') {
    status.textContent = 'Results will be announced';
    status.dataset.state = 'pending';
    detail.textContent = 'The final tally will appear here after voting closes.';
    rankingSection.hidden = true;
    renderPodium(root, [], true);
    return;
  }

  status.textContent = 'Official results';
  status.dataset.state = 'ready';
  const noun = snapshot.ballotCount === 1 ? 'ballot' : 'ballots';
  detail.textContent = `${snapshot.ballotCount} complete ${noun} counted · published ${formatPublishedAt(snapshot.publishedAt)}.`;
  rankingSection.hidden = false;
  renderPodium(root, snapshot.rows);
  renderRanking(root, snapshot.rows);
}

function mount() {
  const root = document.querySelector('#evaluation-gallery-leaderboard');
  if (!root || root.dataset.egInitialized === 'true') return Boolean(root);
  root.dataset.egInitialized = 'true';
  root.innerHTML = `
    <header class="eg-heading">
      <div>
        <p class="eg-kicker">People’s Choice Award</p>
        <h2>Evaluation Gallery</h2>
        <p class="eg-intro">First Choice receives 3 points, Second Choice 2 points, and Third Choice 1 point. Official standings will be published after voting closes.</p>
      </div>
      <div class="eg-actions">
        <a class="btn btn-primary eg-vote" href="${CONFIG.voteUrl}" target="_blank" rel="noopener noreferrer" aria-label="Vote for the Evaluation Gallery People’s Choice Award (opens in a new tab)">Vote now</a>
      </div>
    </header>
    <div class="eg-status-line" role="status" aria-live="polite">
      <span class="eg-status" data-eg-status data-state="pending">Results will be announced</span>
      <span class="eg-status-detail" data-eg-detail>The final tally will appear here after voting closes.</span>
    </div>
    <section class="eg-podium-section" aria-labelledby="eg-podium-title">
      <img class="eg-butterfly eg-butterfly--left" src="assets/butterfly-mark.svg" width="255" height="285" alt="" aria-hidden="true">
      <img class="eg-butterfly eg-butterfly--right" src="assets/butterfly-mark.svg" width="255" height="285" alt="" aria-hidden="true">
      <div class="eg-section-label"><span>Top three</span><h3 id="eg-podium-title">Podium</h3></div>
      <div class="eg-podium" data-eg-podium></div>
    </section>
    <section class="eg-ranking-section" data-eg-ranking-section aria-labelledby="eg-ranking-title" hidden>
      <div class="eg-section-label"><span>All entries</span><h3 id="eg-ranking-title">Final ranking</h3></div>
      <ol class="eg-ranking" data-eg-ranking></ol>
    </section>`;
  try {
    const snapshotElement = document.querySelector('#evaluation-gallery-results');
    state.snapshot = normalizeSnapshot(JSON.parse(snapshotElement?.textContent || 'null'));
  } catch (error) {
    state.error = error.message;
  }
  root.setAttribute('aria-busy', 'false');
  render();
  return true;
}

if (typeof document !== 'undefined') {
  const observer = new MutationObserver(() => mount());
  observer.observe(document.documentElement, {childList: true, subtree: true});
  if (!mount()) document.addEventListener('DOMContentLoaded', mount, {once: true});
}
