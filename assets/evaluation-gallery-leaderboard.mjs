const CONFIG = Object.freeze({
  schemaVersion: 1,
  eventId: '13th-me-network-forum-2026',
  voteUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSeDM6dpnmSMSehh682HVQUO7TP9Cx-Md_lEtM0HOC-iwhtTLQ/viewform'
});

const POSTER_ID = /^P(?:0[1-9]|1[0-2])$/;

export function podiumGroups(rows) {
  if (!rows.some(row => row.total_points > 0)) return [];
  return [1, 2, 3].map(rank => ({rank, rows: rows.filter(row => row.rank === rank)}))
    .filter(group => group.rows.length);
}

export function interpolateScore(target, progress) {
  const finalScore = Math.max(0, Math.floor(Number(target) || 0));
  const boundedProgress = Math.max(0, Math.min(1, Number(progress) || 0));
  const easedProgress = 1 - Math.pow(1 - boundedProgress, 3);
  return Math.min(finalScore, Math.round(finalScore * easedProgress));
}

export function normalizeSnapshot(snapshot) {
  if (!snapshot || !['PENDING', 'FINAL'].includes(snapshot.status)) {
    throw new Error('The Evaluation Gallery snapshot is invalid.');
  }
  if (snapshot.status === 'PENDING') {
    if (snapshot.schemaVersion !== CONFIG.schemaVersion || snapshot.eventId !== CONFIG.eventId ||
        (Array.isArray(snapshot.rows) && snapshot.rows.length !== 0)) {
      throw new Error('The pending Evaluation Gallery snapshot has the wrong event contract.');
    }
    return Object.freeze({
      schemaVersion: CONFIG.schemaVersion,
      eventId: CONFIG.eventId,
      status: 'PENDING',
      snapshotId: '',
      sourceDigest: '',
      publishedAt: '',
      ballotCount: 0,
      ignoredCount: 0,
      rows: []
    });
  }
  if (snapshot.schemaVersion !== CONFIG.schemaVersion || snapshot.eventId !== CONFIG.eventId ||
      !/^[a-f0-9]{12}$/.test(String(snapshot.snapshotId || '')) ||
      !/^[a-f0-9]{64}$/.test(String(snapshot.sourceDigest || '')) ||
      !Number.isSafeInteger(Number(snapshot.ballotCount)) || Number(snapshot.ballotCount) < 1 ||
      !Number.isSafeInteger(Number(snapshot.ignoredCount)) || Number(snapshot.ignoredCount) < 0 ||
      !String(snapshot.publishedAt || '').trim() || !Number.isFinite(Date.parse(snapshot.publishedAt))) {
    throw new Error('The published Evaluation Gallery snapshot is incomplete.');
  }
  if (!Array.isArray(snapshot.rows) || snapshot.rows.length !== 12) {
    throw new Error('The published Evaluation Gallery snapshot must contain all 12 posters.');
  }
  const rows = snapshot.rows.map((row, index) => {
    const posterId = String(row.poster_id || '').trim().toUpperCase();
    const values = ['first_count', 'second_count', 'third_count', 'total_points'].map(field => Number(row[field]));
    if (!POSTER_ID.test(posterId) || !String(row.display_title || '').trim() || !String(row.presenting_unit || '').trim() ||
        values.some(value => !Number.isSafeInteger(value) || value < 0) || !Number.isSafeInteger(Number(row.rank)) || Number(row.rank) < 1 ||
        values[3] !== values[0] * 3 + values[1] * 2 + values[2]) {
      throw new Error('The published Evaluation Gallery snapshot contains an invalid poster row.');
    }
    return Object.freeze({
      rank: Number(row.rank),
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
  const sameScore = (left, right) =>
    left.total_points === right.total_points && left.first_count === right.first_count &&
    left.second_count === right.second_count && left.third_count === right.third_count;
  rows.forEach((row, index) => {
    const previous = rows[index - 1];
    const scoreOrder = previous && (
      previous.total_points - row.total_points ||
      previous.first_count - row.first_count ||
      previous.second_count - row.second_count ||
      previous.third_count - row.third_count ||
      row.poster_id.localeCompare(previous.poster_id)
    );
    if (previous && scoreOrder < 0) throw new Error('The published Evaluation Gallery snapshot is not in canonical score order.');
    const expectedRank = previous && sameScore(previous, row) ? previous.rank : index + 1;
    if (row.rank !== expectedRank) throw new Error('The published Evaluation Gallery snapshot has invalid competition ranks.');
  });
  const ballotCount = Number(snapshot.ballotCount);
  if (rows.reduce((sum, row) => sum + row.first_count, 0) !== ballotCount ||
      rows.reduce((sum, row) => sum + row.second_count, 0) !== ballotCount ||
      rows.reduce((sum, row) => sum + row.third_count, 0) !== ballotCount ||
      rows.reduce((sum, row) => sum + row.total_points, 0) !== ballotCount * 6) {
    throw new Error('The published Evaluation Gallery snapshot fails ballot accounting.');
  }
  return Object.freeze({
    schemaVersion: CONFIG.schemaVersion,
    eventId: CONFIG.eventId,
    status: 'FINAL',
    snapshotId: String(snapshot.snapshotId).trim(),
    sourceDigest: String(snapshot.sourceDigest).trim(),
    publishedAt: String(snapshot.publishedAt).trim(),
    ballotCount,
    ignoredCount: Number(snapshot.ignoredCount),
    rows
  });
}

export function publicPodiumSnapshot(snapshot) {
  const full = normalizeSnapshot(snapshot);
  if (full.status === 'PENDING') return {...full, resultScope: 'PODIUM'};
  return Object.freeze({
    schemaVersion: full.schemaVersion,
    eventId: full.eventId,
    status: full.status,
    resultScope: 'PODIUM',
    snapshotId: full.snapshotId,
    sourceDigest: full.sourceDigest,
    publishedAt: full.publishedAt,
    ballotCount: full.ballotCount,
    ignoredCount: full.ignoredCount,
    rows: Object.freeze(full.rows.filter(row => row.rank <= 3).map(row => Object.freeze({
      rank: row.rank,
      poster_id: row.poster_id,
      display_title: row.display_title,
      presenting_unit: row.presenting_unit,
      total_points: row.total_points
    })))
  });
}

export function normalizePublicSnapshot(snapshot) {
  if (!snapshot || !['PENDING', 'FINAL'].includes(snapshot.status) || snapshot.resultScope !== 'PODIUM') {
    throw new Error('The public Evaluation Gallery snapshot is invalid.');
  }
  if (snapshot.status === 'PENDING') {
    if (snapshot.schemaVersion !== CONFIG.schemaVersion || snapshot.eventId !== CONFIG.eventId ||
        (Array.isArray(snapshot.rows) && snapshot.rows.length !== 0)) {
      throw new Error('The pending public Evaluation Gallery snapshot has the wrong event contract.');
    }
    return Object.freeze({...snapshot, rows: Object.freeze([])});
  }
  if (snapshot.schemaVersion !== CONFIG.schemaVersion || snapshot.eventId !== CONFIG.eventId ||
      !/^[a-f0-9]{12}$/.test(String(snapshot.snapshotId || '')) ||
      !/^[a-f0-9]{64}$/.test(String(snapshot.sourceDigest || '')) ||
      !Number.isSafeInteger(Number(snapshot.ballotCount)) || Number(snapshot.ballotCount) < 1 ||
      !Number.isSafeInteger(Number(snapshot.ignoredCount)) || Number(snapshot.ignoredCount) < 0 ||
      !String(snapshot.publishedAt || '').trim() || !Number.isFinite(Date.parse(snapshot.publishedAt)) ||
      !Array.isArray(snapshot.rows) || snapshot.rows.length < 1) {
    throw new Error('The published public Evaluation Gallery snapshot is incomplete.');
  }
  const rows = snapshot.rows.map(row => {
    const normalized = {
      rank: Number(row.rank),
      poster_id: String(row.poster_id || '').trim().toUpperCase(),
      display_title: String(row.display_title || '').trim(),
      presenting_unit: String(row.presenting_unit || '').trim(),
      total_points: Number(row.total_points)
    };
    if (!POSTER_ID.test(normalized.poster_id) || !normalized.display_title || !normalized.presenting_unit ||
        !Number.isSafeInteger(normalized.rank) || normalized.rank < 1 || normalized.rank > 3 ||
        !Number.isSafeInteger(normalized.total_points) || normalized.total_points < 0) {
      throw new Error('The published public Evaluation Gallery snapshot contains an invalid podium row.');
    }
    return Object.freeze(normalized);
  });
  if (new Set(rows.map(row => row.poster_id)).size !== rows.length ||
      rows.some((row, index) => index > 0 && (rows[index - 1].rank > row.rank || rows[index - 1].total_points < row.total_points)) ||
      rows[0].rank !== 1) {
    throw new Error('The published public Evaluation Gallery podium is not canonical.');
  }
  return Object.freeze({...snapshot, rows: Object.freeze(rows)});
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const state = {
  snapshot: Object.freeze({schemaVersion: 1, eventId: CONFIG.eventId, status: 'PENDING', snapshotId: '', sourceDigest: '', publishedAt: '', ballotCount: 0, ignoredCount: 0, rows: []}),
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

function createWinnerFlight() {
  const flight = element('div', 'eg-winner-flight');
  flight.setAttribute('aria-hidden', 'true');
  for (let index = 0; index < 5; index += 1) {
    const butterfly = element('img', 'eg-winner-flight-mark');
    butterfly.src = 'assets/butterfly-mark.svg';
    butterfly.alt = '';
    butterfly.width = 42;
    butterfly.height = 47;
    flight.appendChild(butterfly);
  }
  return flight;
}

function renderPodium(root, rows, pending = false) {
  const podium = root.querySelector('[data-eg-podium]');
  podium.replaceChildren();
  const groups = pending ? [1, 2, 3].map(rank => ({rank, rows: []})) : podiumGroups(rows);

  groups.forEach(group => {
    const place = element('article', `eg-podium-place eg-podium-place--${group.rank}${pending ? ' eg-podium-place--pending' : ''}`);
    const placeName = group.rank === 1 ? 'First place' : group.rank === 2 ? 'Second place' : 'Third place';
    place.dataset.egRank = String(group.rank);
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
        points.setAttribute('aria-label', `${row.total_points} point${row.total_points === 1 ? '' : 's'}`);
        const score = element('strong', 'eg-score-value', String(row.total_points));
        score.dataset.finalScore = String(row.total_points);
        score.setAttribute('aria-hidden', 'true');
        points.append(score);
        const pointLabel = element('span', 'eg-score-label', ` point${row.total_points === 1 ? '' : 's'}`);
        pointLabel.setAttribute('aria-hidden', 'true');
        points.append(pointLabel);
        entry.appendChild(points);
        contenders.appendChild(entry);
      });
      place.appendChild(contenders);
    }
    place.appendChild(createPlinth(group.rank));
    if (!pending && group.rank === 1) place.appendChild(createWinnerFlight());
    podium.appendChild(place);
  });
}

function setFinalScores(root) {
  root.querySelectorAll('[data-final-score]').forEach(node => {
    node.textContent = String(Math.max(0, Math.floor(Number(node.dataset.finalScore) || 0)));
  });
}

function animateScores(root, reduceMotion) {
  const scores = Array.from(root.querySelectorAll('[data-final-score]')).map(node => ({
    node,
    finalScore: Math.max(0, Math.floor(Number(node.dataset.finalScore) || 0)),
    delay: Math.max(0, Number.parseFloat(
      window.getComputedStyle(node.closest('[data-eg-rank]')).getPropertyValue('--eg-score-delay-ms')
    ) || 0)
  }));
  const duration = 900;
  const startedAt = performance.now();

  const frame = now => {
    if (reduceMotion.matches) {
      setFinalScores(root);
      return;
    }
    let complete = true;
    scores.forEach(score => {
      const progress = Math.max(0, Math.min(1, (now - startedAt - score.delay) / duration));
      score.node.textContent = String(interpolateScore(score.finalScore, progress));
      if (progress < 1) complete = false;
    });
    if (!complete) window.requestAnimationFrame(frame);
  };

  scores.forEach(score => { score.node.textContent = '0'; });
  window.requestAnimationFrame(frame);
}

function prepareCeremony(root) {
  if (root.dataset.egCeremonyReady === 'true') return;
  root.dataset.egCeremonyReady = 'true';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const podiumSection = root.querySelector('.eg-podium-section');

  if (!podiumSection || reduceMotion.matches || document.hidden) {
    root.classList.add('eg-is-revealed');
    setFinalScores(root);
    return;
  }

  root.classList.add('eg-motion-ready');
  const reveal = () => {
    if (root.dataset.egCeremonyPlayed === 'true') return;
    root.dataset.egCeremonyPlayed = 'true';
    root.classList.add('eg-is-revealed');
    animateScores(root, reduceMotion);
  };

  if (!('IntersectionObserver' in window)) {
    reveal();
    return;
  }

  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    reveal();
  }, {rootMargin: '0px 0px -4% 0px', threshold: 0.05});
  observer.observe(podiumSection);
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
  const snapshot = state.snapshot;

  if (state.error) {
    root.dataset.egState = 'error';
    status.textContent = 'Results unavailable';
    status.dataset.state = 'error';
    detail.textContent = 'The saved results could not be read.';
    renderPodium(root, [], true);
    return;
  }

  if (snapshot.status === 'PENDING') {
    root.dataset.egState = 'pending';
    status.textContent = 'Results will be announced';
    status.dataset.state = 'pending';
    detail.textContent = 'The final tally will appear here after voting closes.';
    renderPodium(root, [], true);
    return;
  }

  status.textContent = 'Official results';
  root.dataset.egState = 'published';
  status.dataset.state = 'ready';
  const noun = snapshot.ballotCount === 1 ? 'ballot' : 'ballots';
  detail.textContent = `${snapshot.ballotCount} complete ${noun} counted · published ${formatPublishedAt(snapshot.publishedAt)}.`;
  renderPodium(root, snapshot.rows);
  prepareCeremony(root);
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
    </section>`;
  try {
    const snapshotElement = document.querySelector('#evaluation-gallery-results');
    state.snapshot = normalizePublicSnapshot(JSON.parse(snapshotElement?.textContent || 'null'));
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
