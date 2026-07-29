window.SITE_CONFIG = Object.freeze({
  phase: "before",
  eventDate: "September 9, 2026",
  links: Object.freeze({
    registration: null,
    qa: null,
    notification: null,
    materials: null
  }),
  ready: Object.freeze({
    program: false,
    speakers: false,
    materials: false,
    gallery: false
  }),
  content: Object.freeze({
    program: Object.freeze([]),
    speakers: Object.freeze([]),
    materials: Object.freeze([]),
    gallery: Object.freeze([])
  })
});

document.addEventListener("DOMContentLoaded", () => {
  const validPhases = new Set(["before", "live", "after"]);
  const query = new URLSearchParams(window.location.search);
  const requestedPreview = query.get("preview");
  const previewPhase = validPhases.has(requestedPreview) ? requestedPreview : null;
  const phase = previewPhase || window.SITE_CONFIG.phase;

  initNavigation();
  applyPhase(phase, Boolean(previewPhase));
  applyConfiguredLinks();
  renderConfiguredContent(phase);

  if (previewPhase) {
    loadPreviewData()
      .then(() => renderPreview(window.MNE_PREVIEW_DATA, phase))
      .catch(() => showPreviewLoadFailure());
  }
});

function initNavigation() {
  const toggle = document.getElementById("menu-toggle");
  const nav = document.getElementById("site-nav");
  if (!toggle || !nav) return;

  const close = () => {
    toggle.setAttribute("aria-expanded", "false");
    nav.dataset.open = "false";
    const label = toggle.querySelector(".sr-only");
    if (label) label.textContent = "Open navigation";
  };

  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!open));
    nav.dataset.open = String(!open);
    const label = toggle.querySelector(".sr-only");
    if (label) label.textContent = open ? "Open navigation" : "Close navigation";
  });

  nav.querySelectorAll("a").forEach(link => link.addEventListener("click", close));
  window.addEventListener("resize", () => {
    if (window.innerWidth > 850) close();
  });
}

function applyPhase(phase, isPreview) {
  document.body.dataset.phase = phase;

  const phaseText = {
    before: {
      label: "Under construction",
      stamp: "Work in progress",
      footer: "Under construction"
    },
    live: {
      label: "Forum in progress",
      stamp: "Site open",
      footer: "Forum in progress"
    },
    after: {
      label: "Build complete",
      stamp: "Archive open",
      footer: "Build complete"
    }
  }[phase];

  setText("phase-label", phaseText.label);
  setText("hero-stamp", phaseText.stamp);
  setText("footer-phase", phaseText.footer);

  const banner = document.getElementById("preview-banner");
  if (banner) banner.hidden = !isPreview;

  const liveStrip = document.getElementById("live-strip");
  if (liveStrip) liveStrip.hidden = phase !== "live";

  if (phase === "after") {
    setText("materials-status-title", "Archive framework ready");
    setText("materials-status-copy", "Only verified files will be published.");
  }
}

function applyConfiguredLinks() {
  configureAction(
    "registration-action",
    window.SITE_CONFIG.links.registration,
    "Register to attend",
    "Registration — coming soon"
  );
  configureAction(
    "qa-action",
    window.SITE_CONFIG.links.qa,
    "Open the official Q&A",
    "Q&A link — coming soon"
  );
}

function renderConfiguredContent(phase) {
  const { ready, content } = window.SITE_CONFIG;
  if (ready.program && content.program.length) renderProgram(content.program);
  if (ready.speakers && content.speakers.length) renderSpeakers(content.speakers);
  if (phase === "after" && ready.materials && content.materials.length) {
    renderMaterials(content.materials);
  }
  if (phase === "after" && ready.gallery && content.gallery.length) {
    renderGallery(content.gallery);
  }
}

function configureAction(id, url, activeLabel, inactiveLabel) {
  const current = document.getElementById(id);
  if (!current) return;

  if (!url) {
    current.textContent = inactiveLabel;
    current.setAttribute("aria-disabled", "true");
    if ("disabled" in current) current.disabled = true;
    return;
  }

  const link = document.createElement("a");
  link.id = id;
  link.className = current.className;
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = activeLabel;
  current.replaceWith(link);
}

function loadPreviewData() {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "preview-data.js";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function renderPreview(data, phase) {
  if (!data) return;
  renderProgram(data.program || []);
  renderSpeakers(data.speakers || []);

  if (phase === "live") {
    setText("live-message", data.liveMessage || "Sample live session — preview only.");
    renderQuestionPreview(data.questions && data.questions[0]);
  }

  if (phase === "after") {
    renderMaterials(data.materials || []);
    renderGallery(data.gallery || []);
  }
}

function renderProgram(items) {
  const placeholder = document.getElementById("program-placeholder");
  const toolbar = document.getElementById("program-toolbar");
  const list = document.getElementById("program-list");
  if (!list || !items.length) return;

  if (placeholder) placeholder.hidden = true;
  if (toolbar) toolbar.hidden = false;
  setText("program-status", "Preview schedule — for layout testing only");

  list.innerHTML = "";
  items.forEach((item, index) => {
    const article = document.createElement("article");
    article.className = "program-item";

    const detailId = `program-detail-${index}`;
    const button = document.createElement("button");
    button.className = "program-item__button";
    button.type = "button";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", detailId);

    button.append(
      makeSpan("program-item__time", item.time),
      makeSpan("program-item__title", item.title),
      makeSpan("program-item__tag", item.tag),
      makeSpan("program-item__chevron", "+")
    );

    const detail = document.createElement("div");
    detail.className = "program-item__detail";
    detail.id = detailId;
    detail.hidden = true;
    detail.textContent = item.description;

    button.addEventListener("click", () => {
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded));
      detail.hidden = expanded;
    });

    article.append(button, detail);
    list.appendChild(article);
  });

  document.getElementById("expand-program")?.addEventListener("click", () => {
    list.querySelectorAll(".program-item__button").forEach(button => {
      button.setAttribute("aria-expanded", "true");
      const detail = document.getElementById(button.getAttribute("aria-controls"));
      if (detail) detail.hidden = false;
    });
  });

  document.getElementById("collapse-program")?.addEventListener("click", () => {
    list.querySelectorAll(".program-item__button").forEach(button => {
      button.setAttribute("aria-expanded", "false");
      const detail = document.getElementById(button.getAttribute("aria-controls"));
      if (detail) detail.hidden = true;
    });
  });
}

function renderSpeakers(speakers) {
  const placeholder = document.getElementById("speakers-placeholder");
  const filters = document.getElementById("speaker-filters");
  const grid = document.getElementById("speaker-grid");
  if (!filters || !grid || !speakers.length) return;

  if (placeholder) placeholder.hidden = true;
  filters.hidden = false;

  const groups = [
    ["all", "All preview roles"],
    ...Array.from(new Map(speakers.map(speaker => [speaker.group, speaker.groupLabel])).entries())
  ];

  const draw = activeGroup => {
    grid.innerHTML = "";
    speakers
      .filter(speaker => activeGroup === "all" || speaker.group === activeGroup)
      .forEach(speaker => {
        const card = document.createElement("article");
        card.className = "speaker-card";

        const initials = speaker.name
          .replace(/[^A-Za-z ]/g, "")
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map(part => part[0])
          .join("");

        card.append(
          makeSpan("speaker-card__initials", initials || "RP"),
          makeHeading("h3", speaker.name),
          makeParagraph(speaker.organization),
          makeSmall(speaker.role)
        );
        grid.appendChild(card);
      });
  };

  filters.innerHTML = "";
  groups.forEach(([id, label], index) => {
    const button = document.createElement("button");
    button.className = "filter-button";
    button.type = "button";
    button.textContent = label;
    button.setAttribute("aria-pressed", String(index === 0));
    button.addEventListener("click", () => {
      filters.querySelectorAll(".filter-button").forEach(item => item.setAttribute("aria-pressed", "false"));
      button.setAttribute("aria-pressed", "true");
      draw(id);
    });
    filters.appendChild(button);
  });

  draw("all");
}

function renderQuestionPreview(question) {
  const card = document.getElementById("question-preview");
  if (!card || !question) return;
  card.innerHTML = "";
  card.append(
    makeSpan("question-card__tape", ""),
    makeSpan("question-card__label", "Sample moderated question"),
    makeHeading("strong", question.text),
    makeParagraph("Preview data — not a submitted delegate question.")
  );
}

function renderMaterials(materials) {
  const container = document.getElementById("materials-list");
  if (!container || !materials.length) return;

  setText("materials-status-title", "Preview archive");
  setText("materials-status-copy", "Sample file labels — no downloads are active.");

  const shelf = document.createElement("div");
  shelf.className = "depot-shelf";
  materials.slice(0, 3).forEach((item, index) => {
    shelf.appendChild(makeSpan(`depot-box depot-box--${["one", "two", "three"][index]}`, item));
  });

  container.innerHTML = "";
  container.append(shelf, makeParagraph("Preview file labels for layout testing only."));
}

function renderGallery(items) {
  const container = document.getElementById("gallery-list");
  if (!container || !items.length) return;

  container.innerHTML = "";
  items.slice(0, 3).forEach(item => {
    const card = document.createElement("article");
    card.className = "gallery-card";
    card.append(
      makeSpan("gallery-card__region", item.region),
      makeHeading("h3", item.title),
      makeParagraph(item.summary),
      makeSpan("gallery-card__result", "Sample result — not official")
    );
    container.appendChild(card);
  });
}

function showPreviewLoadFailure() {
  const banner = document.getElementById("preview-banner");
  if (!banner) return;
  const message = banner.querySelector("span");
  if (message) message.textContent = "Preview data could not be loaded. The public confirmed shell remains available.";
}

function setText(id, text) {
  const node = document.getElementById(id);
  if (node) node.textContent = text;
}

function makeSpan(className, text) {
  const node = document.createElement("span");
  if (className) node.className = className;
  node.textContent = text;
  return node;
}

function makeHeading(tag, text) {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}

function makeParagraph(text) {
  const node = document.createElement("p");
  node.textContent = text;
  return node;
}

function makeSmall(text) {
  const node = document.createElement("small");
  node.textContent = text;
  return node;
}
