import { FORUM_CONFIG } from "/data/forum-config.js";
import { PROGRAM, SPEAKERS, SUBTHEMES, TALLY_HOW } from "/data/forum-content.js";

const MODE_KEY = "forum-thinking-mode";
const VALID_MODES = new Set(["instant", "high", "ultra"]);
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const isDev = window.location.pathname === "/dev" || window.location.pathname === "/dev/";
const requestedPreviewPhase = isDev
  ? new URLSearchParams(window.location.search).get("phase")
  : null;
const previewPhase = ["before", "live", "after"].includes(requestedPreviewPhase)
  ? requestedPreviewPhase
  : null;
let revealObserver;

const escapeHtml = value => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const getStoredMode = () => {
  try {
    const mode = window.sessionStorage.getItem(MODE_KEY);
    return VALID_MODES.has(mode) ? mode : "instant";
  } catch {
    return "instant";
  }
};

const setStoredMode = mode => {
  try { window.sessionStorage.setItem(MODE_KEY, mode); } catch { /* private mode */ }
};

const initialsFor = name => name
  .replace(/[^A-Za-z ]/g, "")
  .split(" ")
  .filter(Boolean)
  .slice(0, 2)
  .map(word => word[0])
  .join("")
  .toUpperCase();

const tagClass = tag => tag.toLowerCase().replace(/[^a-z]+/g, "-");

function renderSubthemes() {
  const target = document.querySelector("[data-subthemes]");
  if (!target) return;
  target.innerHTML = SUBTHEMES.map(theme => `
    <article class="theme-card theme-card--${escapeHtml(theme.color)}" data-reveal>
      <span class="theme-card__index">${escapeHtml(theme.no)}</span>
      <div><h3>${escapeHtml(theme.title)}</h3><p>${escapeHtml(theme.body)}</p></div>
    </article>`).join("");
}

function renderProgram(filter = "all") {
  const target = document.querySelector("[data-program]");
  if (!target) return;
  target.innerHTML = PROGRAM.map((item, index) => {
    const category = item.tag.toLowerCase();
    const visible = filter === "all" || category === filter;
    const details = item.tracks?.length ? `
      <div class="program-row__details" id="program-details-${index}">
        ${item.tracks.map(track => `
          <article class="track-card">
            <strong>${escapeHtml(track.room)}</strong>
            <span>${escapeHtml(track.title)}</span>
            <small>${escapeHtml(track.focus)}<br><br>${track.people.map(escapeHtml).join(" · ")}</small>
          </article>`).join("")}
      </div>` : "";
    const toggle = item.kind === "session" ? `<button class="program-row__toggle" type="button" aria-expanded="false" aria-controls="program-details-${index}" data-program-toggle>+</button>` : "";
    const [hour, minute = "00"] = item.time.split(":");
    const numericHour = Number(hour);
    const hour24 = numericHour >= 1 && numericHour <= 5 ? numericHour + 12 : numericHour;
    const datetime = `2026-09-09T${String(hour24).padStart(2, "0")}:${minute.padStart(2, "0")}:00+08:00`;
    return `<article class="program-row program-row--${escapeHtml(tagClass(item.tag))}" data-program-row data-category="${escapeHtml(category)}"${visible ? "" : " hidden"} data-reveal>
      <time class="program-row__time" datetime="${escapeHtml(datetime)}">${escapeHtml(item.time)}</time>
      <div><h3>${escapeHtml(item.title)}</h3>${item.desc ? `<p class="program-row__summary">${escapeHtml(item.desc)}</p>` : ""}</div>
      <span class="program-row__tag">${escapeHtml(item.tag)}</span>
      ${toggle}${details}
    </article>`;
  }).join("");
  target.querySelectorAll("[data-program-toggle]").forEach(button => {
    button.addEventListener("click", () => {
      const row = button.closest(".program-row");
      const open = row.classList.toggle("is-open");
      button.textContent = open ? "−" : "+";
      button.setAttribute("aria-expanded", String(open));
    });
  });
}

function renderSpeakers(filter = "all") {
  const target = document.querySelector("[data-speakers]");
  if (!target) return;
  target.innerHTML = SPEAKERS.map(speaker => {
    const visible = filter === "all" || speaker.group === filter;
    return `<article class="speaker-card" data-speaker-card data-group="${escapeHtml(speaker.group)}"${visible ? "" : " hidden"} data-reveal>
      <span class="speaker-card__initials" aria-hidden="true">${escapeHtml(initialsFor(speaker.name))}</span>
      <h3>${escapeHtml(speaker.name)}</h3>
      <p>${escapeHtml(speaker.org)}</p>
      <small>${escapeHtml(speaker.role)} · ${escapeHtml(speaker.session)}</small>
    </article>`;
  }).join("");
}

function renderTally() {
  const target = document.querySelector("[data-tally]");
  if (!target) return;
  target.innerHTML = TALLY_HOW.map(step => `
    <article class="tally-step" data-reveal>
      <span class="tally-step__number">${escapeHtml(step.no)}</span>
      <div><strong>${escapeHtml(step.title)}</strong><p>${escapeHtml(step.body)}</p></div>
    </article>`).join("");
}

function setupFilters(selector, render) {
  document.querySelectorAll(selector).forEach(button => {
    button.addEventListener("click", () => {
      const value = button.dataset.programFilter || button.dataset.speakerFilter || "all";
      document.querySelectorAll(selector).forEach(item => {
        const selected = item === button;
        item.classList.toggle("is-selected", selected);
        item.setAttribute("aria-pressed", String(selected));
      });
      render(value);
      setupReveal();
    });
  });
}

function setupMenu() {
  const button = document.querySelector(".mobile-menu-button");
  const nav = document.querySelector(".primary-nav");
  if (!button || !nav) return;
  const close = () => {
    nav.classList.remove("is-open");
    button.setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-open");
  };
  button.addEventListener("click", () => {
    const open = !nav.classList.contains("is-open");
    nav.classList.toggle("is-open", open);
    button.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("nav-open", open);
    if (open) nav.querySelector("a")?.focus();
  });
  nav.querySelectorAll("a").forEach(link => link.addEventListener("click", close));
  document.addEventListener("keydown", event => { if (event.key === "Escape") close(); });
  document.addEventListener("pointerdown", event => {
    if (!nav.contains(event.target) && event.target !== button) close();
  });
}

function setupCountdown() {
  const target = document.querySelector("[data-countdown]");
  if (!target) return;
  const units = ["Days", "Hours", "Minutes"];
  const tick = () => {
    const remaining = Math.max(0, new Date(FORUM_CONFIG.event.start).getTime() - Date.now());
    const values = [
      Math.floor(remaining / 86400000),
      Math.floor((remaining % 86400000) / 3600000),
      Math.floor((remaining % 3600000) / 60000)
    ];
    target.replaceChildren(...values.map((value, index) => {
      const item = document.createElement("b");
      item.textContent = String(value).padStart(index ? 2 : 1, "0");
      item.dataset.label = units[index];
      return item;
    }));
    if (!previewPhase) {
      document.body.dataset.phase = remaining === 0 ? "live" : "before";
    }
  };
  tick();
  window.setInterval(tick, 60000);
}

function setupMotionMode() {
  const inputs = [...document.querySelectorAll("input[name='thinking-mode']")];
  const label = document.querySelector("[data-mode-label]");
  const art = document.querySelector(".hero__art");
  const setMode = requested => {
    const mode = reducedMotion.matches ? "instant" : (VALID_MODES.has(requested) ? requested : "instant");
    document.documentElement.dataset.motionMode = mode;
    if (label) label.textContent = mode[0].toUpperCase() + mode.slice(1);
    inputs.forEach(input => { input.checked = input.value === mode; });
    if (!reducedMotion.matches) setStoredMode(mode);
    if (mode === "ultra") {
      loadTransformation(art);
    } else if (art?.dataset.ready === "true") {
      art.querySelector("[data-transformation-board]")?.replaceChildren();
      delete art.dataset.ready;
    }
  };
  inputs.forEach(input => input.addEventListener("change", () => setMode(input.value)));
  reducedMotion.addEventListener?.("change", () => setMode(getStoredMode()));
  setMode(getStoredMode());
}

let transformationText = null;
async function loadTransformation(art) {
  const board = art?.querySelector("[data-transformation-board]");
  if (!art || !board || art.dataset.ready === "true") return;
  try {
    transformationText ||= await fetch("/assets/forum-logo-transformation.svg", { credentials: "same-origin" }).then(response => {
      if (!response.ok) throw new Error(`Transformation asset returned ${response.status}`);
      return response.text();
    });
    const doc = new DOMParser().parseFromString(transformationText, "image/svg+xml");
    const svg = doc.documentElement;
    if (svg.nodeName.toLowerCase() !== "svg") throw new Error("Transformation asset is not SVG");
    board.replaceChildren(document.importNode(svg, true));
    art.dataset.ready = "true";
  } catch (error) {
    console.warn("Transformation fallback active:", error);
  }
}

function setupReveal(root = document) {
  const nodes = [...root.querySelectorAll("[data-reveal]")];
  if (!nodes.length) return;
  if (!("IntersectionObserver" in window) || reducedMotion.matches) {
    revealObserver?.disconnect();
    revealObserver = null;
    nodes.forEach(node => node.classList.add("is-visible"));
    return;
  }
  revealObserver?.disconnect();
  revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("is-visible");
    revealObserver.unobserve(entry.target);
  }), { rootMargin: "0px 0px -8% 0px", threshold: .08 });
  nodes.forEach(node => revealObserver.observe(node));
}

function setupDevPreview() {
  document.body.dataset.environment = isDev ? "staging" : "production";
  if (!isDev) return;
  if (previewPhase) {
    document.body.dataset.phase = previewPhase;
  }
}

function init() {
  document.body.classList.add("is-enhanced");
  setupDevPreview();
  renderSubthemes();
  renderProgram();
  renderSpeakers();
  renderTally();
  setupFilters("[data-program-filter]", renderProgram);
  setupFilters("[data-speaker-filter]", renderSpeakers);
  setupMenu();
  setupCountdown();
  setupMotionMode();
  setupReveal();
}

init();
