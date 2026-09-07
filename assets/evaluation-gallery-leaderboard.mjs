const CONFIG = Object.freeze({
  spreadsheetId: '12kMj_aYeBsnbiEGEHZUfkiQlkNIyrdMb_q8UgQ1abQA',
  range: 'D1:P',
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
    const previous = ranked[index - 1];
    const tied = previous &&
      row.total_points === previous.total_points &&
      row.first_count === previous.first_count &&
      row.second_count === previous.second_count &&
      row.third_count === previous.third_count;
    row.rank = tied ? previous.rank : index + 1;
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
    const first = selections.reduce((count, value) => count + (value === CHOICES.first ? 1 : 0), 0);
    const second = selections.reduce((count, value) => count + (value === CHOICES.second ? 1 : 0), 0);
    const third = selections.reduce((count, value) => count + (value === CHOICES.third ? 1 : 0), 0);

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

  return Object.freeze({
    rows: assignRanks(tallies),
    ballotCount,
    ignoredCount
  });
}

export function podiumGroups(rows) {
  if (!rows.some(row => row.total_points > 0)) return [];
  return [1, 2, 3].map(rank => ({
    rank,
    rows: rows.filter(row => row.rank === rank)
  })).filter(group => group.rows.length);
}

export function buildLeaderboardUrl(cacheBuster = Date.now()) {
  const query = new URLSearchParams({
    range: CONFIG.range,
    headers: '1',
    tqx: 'out:json;responseHandler:forumGalleryLeaderboardReceive',
    _: String(cacheBuster)
  });
  return `https://docs.google.com/spreadsheets/d/${CONFIG.spreadsheetId}/gviz/tq?${query}`;
}

export function createDemoLeaderboard() {
  const first = [12, 9, 7, 5, 4, 3, 3, 2, 2, 1, 1, 1];
  const second = [8, 10, 7, 6, 5, 4, 3, 2, 2, 1, 1, 1];
  const third = [6, 7, 8, 6, 5, 5, 4, 3, 2, 2, 1, 1];
  const names = [
    ['P01', 'Impact Evaluation Study of the DOLE Integrated Livelihood Program for Parents of Child Laborers in Region I', 'DRO I'],
    ['P02', "An Impact Evaluation of the FRIMP's Role in Riverbank Erosion Mitigation and Socio-Economic Resilience in Brgy. Alibago, Enrile", 'DRO II'],
    ['P03', 'Impact Evaluation Study of Yolanda Permanent Housing Projects in Western Visayas', 'DRO VI'],
    ['P04', 'Impact Evaluation of the Convergence Strategy of the Tuburan Coffee Production Program', 'DRO VII'],
    ['P05', 'Impact Evaluation Study on Natural Resources Conservation and Upper River Basin Productivity in the Muleta Watershed', 'DRO X'],
    ['P06', 'Assessing the Impact of Built-in Right-of-Way Acquisition Cost in Project Implementation', 'DRO XI'],
    ['P07', 'Impact Evaluation on the Umayam River Irrigation System in Agusan del Sur', 'DRO Caraga'],
    ['P08', 'Impact Evaluation of the DOLE Integrated Livelihood Program', 'MES/SEED'],
    ['P09', 'Process Evaluation of the KADIWA ni Ani at Kita Program', 'MES/SEED'],
    ['P10', 'Process Evaluation of the PhilHealth Konsulta Package', 'MES/SEED'],
    ['P11', 'Process Evaluation of Telemedicine in Individual-Based Health Services', 'MES/SEED'],
    ['P12', 'Quasi-experimental Impact Evaluation of the TUPAD Program', 'MES/SEED']
  ];
  const rows = names.map(([poster_id, display_title, presenting_unit], index) => ({
    poster_id,
    display_title,
    presenting_unit,
    first_count: first[index],
    second_count: second[index],
    third_count: third[index],
    total_points: first[index] * 3 + second[index] * 2 + third[index],
    rank: 0
  }));
  return Object.freeze({rows: assignRanks(rows), ballotCount: 50, ignoredCount: 0});
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const state = {
  rows: [],
  ballotCount: 0,
  ignoredCount: 0,
  loading: false,
  error: '',
  lastLoadedAt: '',
  initialRequested: false,
  requestToken: 0,
  timeout: 0,
  script: null,
  demo: false
};

function renderPodium(root, rows) {
  const podium = root.querySelector('[data-eg-podium]');
  podium.replaceChildren();
  const groups = podiumGroups(rows);
  if (!groups.length) {
    podium.appendChild(element('p', 'eg-empty', 'The podium will appear after the first complete ballot.'));
    return;
  }

  groups.forEach(group => {
    const place = element('article', `eg-podium-place eg-podium-place--${group.rank}`);
    place.setAttribute('aria-label', `${group.rank === 1 ? 'First' : group.rank === 2 ? 'Second' : 'Third'} place`);
    const placeName = group.rank === 1 ? 'First place' : group.rank === 2 ? 'Second place' : 'Third place';
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
      if (group.rows.length > 1) entry.append(element('span', 'eg-tie-tag', 'Tied'));
      contenders.appendChild(entry);
    });
    place.appendChild(contenders);
    const plinth = element('div', 'eg-podium-plinth');
    plinth.setAttribute('aria-hidden', 'true');
    plinth.append(element('strong', 'eg-podium-rank', String(group.rank)));
    plinth.append(element('span', '', placeName));
    place.appendChild(plinth);
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
    detail.textContent = 'Reading the public Google Sheet.';
    return;
  }
  if (state.error && !state.rows.length) {
    status.textContent = 'Results unavailable';
    status.dataset.state = 'error';
    detail.textContent = state.error;
    return;
  }
  if (!state.rows.length) return;

  status.textContent = state.demo ? 'Demo data' : 'Live sheet';
  status.dataset.state = state.demo ? 'demo' : 'ready';
  const noun = state.ballotCount === 1 ? 'ballot' : 'ballots';
  detail.textContent = state.demo
    ? `Illustrative results using ${state.ballotCount} sample ${noun}. Add ?galleryDemo=1 to preview this design.`
    : `${state.ballotCount} complete ${noun} counted directly from the public Sheet · refreshed ${state.lastLoadedAt}.`;
  renderPodium(root, state.rows);
  renderRanking(root, state.rows);
}

function mount() {
  const root = document.querySelector('#evaluation-gallery-leaderboard');
  if (!root || root.dataset.egInitialized === 'true') return Boolean(root);
  state.demo = new URLSearchParams(window.location.search).get('galleryDemo') === '1';
  root.dataset.egInitialized = 'true';
  root.innerHTML = `
    <header class="eg-heading">
      <div>
        <p class="eg-kicker">People’s Choice Award</p>
        <h2>Evaluation Gallery</h2>
        <p class="eg-intro">First Choice receives 3 points, Second Choice 2 points, and Third Choice 1 point. Results are read directly from the public response Sheet.</p>
      </div>
      <div class="eg-actions">
        <a class="btn btn-primary eg-vote" href="${CONFIG.voteUrl}" target="_blank" rel="noopener noreferrer" aria-label="Vote for the Evaluation Gallery People’s Choice Award (opens in a new tab)">Vote now</a>
        <button class="btn btn-secondary eg-refresh" type="button" data-eg-refresh><span aria-hidden="true">↻</span> Refresh results</button>
      </div>
    </header>
    <div class="eg-status-line" role="status" aria-live="polite">
      <span class="eg-status" data-eg-status data-state="loading">Loading results…</span>
      <span class="eg-status-detail" data-eg-detail>Reading the public Google Sheet.</span>
    </div>
    <section class="eg-podium-section" aria-labelledby="eg-podium-title">
      <div class="eg-section-label"><span>Top three</span><h3 id="eg-podium-title">Podium</h3></div>
      <div class="eg-podium" data-eg-podium><p class="eg-empty">The podium will appear after the first complete ballot.</p></div>
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

function applyResult(result) {
  state.rows = result.rows;
  state.ballotCount = result.ballotCount;
  state.ignoredCount = result.ignoredCount;
  state.lastLoadedAt = new Intl.DateTimeFormat('en-PH', {
    hour: 'numeric', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Manila'
  }).format(new Date());
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
  render();

  if (state.demo) {
    applyResult(createDemoLeaderboard());
    state.loading = false;
    render();
    return;
  }

  const token = ++state.requestToken;
  globalThis.forumGalleryLeaderboardReceive = payload => {
    if (!settleRequest(token)) return;
    try {
      applyResult(parseLeaderboardResponse(payload));
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
    state.error = 'The public Sheet could not be reached. Please try Refresh results again.';
    render();
  };
  state.script = script;
  document.head.appendChild(script);
  state.timeout = window.setTimeout(() => {
    if (!settleRequest(token)) return;
    state.loading = false;
    state.error = 'The public Sheet took too long to respond. Please try Refresh results again.';
    render();
  }, 12000);
}

if (typeof document !== 'undefined') {
  const observer = new MutationObserver(() => mount());
  observer.observe(document.documentElement, {childList: true, subtree: true});
  if (!mount()) document.addEventListener('DOMContentLoaded', mount, {once: true});
}
