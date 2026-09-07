const CONFIG = Object.freeze({
  spreadsheetId: '12kMj_aYeBsnbiEGEHZUfkiQlkNIyrdMb_q8UgQ1abQA',
  sheetName: 'Public_Leaderboard',
  range: 'A2:J14',
  voteUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSeDM6dpnmSMSehh682HVQUO7TP9Cx-Md_lEtM0HOC-iwhtTLQ/viewform'
});

const EXPECTED_HEADERS = Object.freeze([
  'rank', 'poster_id', 'display_title', 'presenting_unit', 'first_count',
  'second_count', 'third_count', 'total_points', 'status', 'last_updated'
]);

function cellValue(cell) {
  if (!cell) return '';
  if (cell.f !== undefined && cell.f !== null) return cell.f;
  return cell.v === undefined || cell.v === null ? '' : cell.v;
}

function finiteNonNegative(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error(`Invalid ${field} in leaderboard feed.`);
  return number;
}

export function parseLeaderboardResponse(payload) {
  if (!payload || payload.status !== 'ok' || !payload.table) {
    const message = payload?.errors?.[0]?.detailed_message || payload?.errors?.[0]?.message;
    throw new Error(message || 'The leaderboard feed is not ready.');
  }

  const headers = (payload.table.cols || []).map(column => String(column.label || column.id || '').trim());
  if (JSON.stringify(headers) !== JSON.stringify(EXPECTED_HEADERS)) {
    throw new Error('The Public_Leaderboard tab is not ready yet.');
  }

  const rows = (payload.table.rows || []).map(({c = []}) => {
    const values = EXPECTED_HEADERS.map((header, index) => [header, cellValue(c[index])]);
    const row = Object.fromEntries(values);
    const posterId = String(row.poster_id).trim().toUpperCase();
    if (!/^P(?:0[1-9]|1[0-2])$/.test(posterId)) throw new Error('Unexpected poster ID in leaderboard feed.');
    if (!String(row.display_title).trim() || !String(row.presenting_unit).trim()) {
      throw new Error(`Incomplete leaderboard entry for ${posterId}.`);
    }
    return Object.freeze({
      rank: finiteNonNegative(row.rank, 'rank'),
      poster_id: posterId,
      display_title: String(row.display_title).trim(),
      presenting_unit: String(row.presenting_unit).trim(),
      first_count: finiteNonNegative(row.first_count, 'first_count'),
      second_count: finiteNonNegative(row.second_count, 'second_count'),
      third_count: finiteNonNegative(row.third_count, 'third_count'),
      total_points: finiteNonNegative(row.total_points, 'total_points'),
      status: String(row.status || '').trim(),
      last_updated: String(row.last_updated || '').trim()
    });
  });

  if (rows.length !== 12 || new Set(rows.map(row => row.poster_id)).size !== 12) {
    throw new Error('The leaderboard must contain one row for each poster from P01 to P12.');
  }
  return rows.sort((a, b) => a.rank - b.rank || a.poster_id.localeCompare(b.poster_id));
}

export function podiumGroups(rows) {
  if (!rows.some(row => row.total_points > 0)) return [];
  return [1, 2, 3].map(rank => ({
    rank,
    rows: rows.filter(row => row.rank === rank)
  })).filter(group => group.rows.length);
}

export function buildLeaderboardUrl(cacheBuster = Date.now()) {
  const aggregateOnlyQuery = [
    'select A,B,C,D,E,F,G,H,I,J',
    "where B matches 'P(0[1-9]|1[0-2])'",
    "label A 'rank', B 'poster_id', C 'display_title', D 'presenting_unit',",
    "E 'first_count', F 'second_count', G 'third_count', H 'total_points',",
    "I 'status', J 'last_updated'"
  ].join(' ');
  const query = new URLSearchParams({
    sheet: CONFIG.sheetName,
    range: CONFIG.range,
    headers: '1',
    tq: aggregateOnlyQuery,
    tqx: 'out:json;responseHandler:forumGalleryLeaderboardReceive',
    _: String(cacheBuster)
  });
  return `https://docs.google.com/spreadsheets/d/${CONFIG.spreadsheetId}/gviz/tq?${query}`;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function statusLabel(rows) {
  if (rows.every(row => row.status === 'FINAL')) return 'Final';
  if (rows.some(row => row.status.includes('TIE_'))) return 'Live — tie pending';
  return 'Live — unofficial';
}

function latestUpdate(rows) {
  return rows.map(row => row.last_updated).filter(Boolean).sort().at(-1) || '';
}

const state = {
  rows: [],
  loading: false,
  error: '',
  lastLoadedAt: '',
  initialRequested: false,
  requestToken: 0,
  timeout: 0,
  script: null
};

function renderPodium(root, rows) {
  const podium = root.querySelector('[data-eg-podium]');
  podium.replaceChildren();
  const groups = podiumGroups(rows);
  if (!groups.length) {
    podium.appendChild(element('p', 'eg-empty', 'The podium will appear after the first validated vote.'));
    return;
  }

  groups.forEach(group => {
    const place = element('article', `eg-podium-place eg-podium-place--${group.rank}`);
    place.setAttribute('aria-label', `${group.rank === 1 ? 'First' : group.rank === 2 ? 'Second' : 'Third'} place`);
    const cap = element('div', 'eg-podium-cap');
    cap.append(element('span', 'eg-podium-rank', String(group.rank)));
    cap.append(element('span', 'eg-podium-place-label', group.rank === 1 ? 'First place' : group.rank === 2 ? 'Second place' : 'Third place'));
    place.appendChild(cap);
    group.rows.forEach(row => {
      const entry = element('div', 'eg-podium-entry');
      entry.append(element('div', 'eg-poster-code', row.poster_id));
      entry.append(element('h3', 'eg-podium-title', row.display_title));
      entry.append(element('p', 'eg-podium-unit', row.presenting_unit));
      const points = element('p', 'eg-podium-points');
      points.append(element('strong', '', String(row.total_points)));
      points.append(document.createTextNode(` point${row.total_points === 1 ? '' : 's'}`));
      entry.appendChild(points);
      if (group.rows.length > 1) entry.append(element('span', 'eg-tie-tag', 'Tied'));
      place.appendChild(entry);
    });
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

function render() {
  const root = document.querySelector('#evaluation-gallery-leaderboard');
  if (!root || root.dataset.egInitialized !== 'true') return;
  const status = root.querySelector('[data-eg-status]');
  const refresh = root.querySelector('[data-eg-refresh]');
  const detail = root.querySelector('[data-eg-detail]');
  refresh.disabled = state.loading;
  refresh.setAttribute('aria-busy', String(state.loading));

  if (state.loading && !state.rows.length) {
    status.textContent = 'Loading results…';
    status.dataset.state = 'loading';
    detail.textContent = 'Connecting to the Forum voting tally.';
    return;
  }
  if (state.error && !state.rows.length) {
    status.textContent = 'Results are being prepared';
    status.dataset.state = 'error';
    detail.textContent = state.error;
    return;
  }
  if (!state.rows.length) return;

  status.textContent = statusLabel(state.rows);
  status.dataset.state = 'ready';
  const sourceUpdate = latestUpdate(state.rows);
  detail.textContent = sourceUpdate
    ? `Tally updated ${sourceUpdate}. Refreshed on this page ${state.lastLoadedAt}.`
    : `Refreshed on this page ${state.lastLoadedAt}.`;
  renderPodium(root, state.rows);
  renderRanking(root, state.rows);
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
        <p class="eg-intro">Rank three different entries: First Choice receives 3 points, Second Choice 2 points, and Third Choice 1 point.</p>
      </div>
      <div class="eg-actions">
        <a class="btn btn-primary eg-vote" href="${CONFIG.voteUrl}" target="_blank" rel="noopener noreferrer" aria-label="Vote for the Evaluation Gallery People’s Choice Award (opens in a new tab)">Vote now</a>
        <button class="btn btn-secondary eg-refresh" type="button" data-eg-refresh><span aria-hidden="true">↻</span> Refresh results</button>
      </div>
    </header>
    <div class="eg-status-line" role="status" aria-live="polite">
      <span class="eg-status" data-eg-status data-state="loading">Loading results…</span>
      <span class="eg-status-detail" data-eg-detail>Connecting to the Forum voting tally.</span>
    </div>
    <section class="eg-podium-section" aria-labelledby="eg-podium-title">
      <div class="eg-section-label"><span>Top three</span><h3 id="eg-podium-title">Podium</h3></div>
      <div class="eg-podium" data-eg-podium><p class="eg-empty">The podium will appear after the first validated vote.</p></div>
    </section>
    <section class="eg-ranking-section" aria-labelledby="eg-ranking-title">
      <div class="eg-section-label"><span>All entries</span><h3 id="eg-ranking-title">Live ranking</h3></div>
      <ol class="eg-ranking" data-eg-ranking></ol>
    </section>`;
  root.querySelector('[data-eg-refresh]').addEventListener('click', () => loadLeaderboard());
  render();
  if (!state.initialRequested) {
    state.initialRequested = true;
    loadLeaderboard();
  }
  return true;
}

function settleRequest(token) {
  if (token !== state.requestToken) return false;
  window.clearTimeout(state.timeout);
  if (state.script) state.script.remove();
  state.script = null;
  return true;
}

export function loadLeaderboard() {
  if (state.loading) return;
  state.loading = true;
  state.error = '';
  const token = ++state.requestToken;
  render();

  globalThis.forumGalleryLeaderboardReceive = payload => {
    if (!settleRequest(token)) return;
    try {
      state.rows = parseLeaderboardResponse(payload);
      state.lastLoadedAt = new Intl.DateTimeFormat('en-PH', {
        hour: 'numeric', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Manila'
      }).format(new Date());
    } catch (error) {
      state.error = error.message;
    } finally {
      state.loading = false;
      render();
    }
  };

  const script = document.createElement('script');
  script.src = buildLeaderboardUrl();
  script.async = true;
  script.dataset.egFeed = 'true';
  script.onerror = () => {
    if (!settleRequest(token)) return;
    state.loading = false;
    state.error = 'The live tally could not be reached. Please try Refresh results again.';
    render();
  };
  state.script = script;
  document.head.appendChild(script);
  state.timeout = window.setTimeout(() => {
    if (!settleRequest(token)) return;
    state.loading = false;
    state.error = 'The live tally took too long to respond. Please try Refresh results again.';
    render();
  }, 12000);
}

if (typeof document !== 'undefined') {
  const observer = new MutationObserver(() => mount());
  observer.observe(document.documentElement, {childList: true, subtree: true});
  if (!mount()) document.addEventListener('DOMContentLoaded', mount, {once: true});
}
