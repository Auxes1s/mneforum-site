# Buzz to Bloom

Buzz to Bloom is a dependency-free evidence-to-action mini-game for the 13th M&E Network Forum. It uses fictional public-service cases and stores only local best scores and accessibility settings.

## Routes

- Standalone: `/game/`
- Embedded: `/game/?embed=1&pack=philippines-ai-v2`
- Deterministic QA: `/game/?qa=1&seed=12345&pack=philippines-ai-v2`
- Forum-page pack preview: `/?gamePack=philippines-ai-v2`

On the pre-launch `master` page, the root construction teaser embeds the
default Philippine pack directly and keeps the full-page `/game/` route as an
accessible fallback. The parent page loads `game/embed-v1.js`, so opt-in score
submission, the public static leaderboard, phase copy, and iframe resizing work
without a server-side application.

## Branch and promotion flow

The `13th-forum` line is the development source of truth. Its root `index.html`
is the working Forum page. The current `master:/dev/index.html` snapshot was
copied into that root before the game was integrated.

After the Forum page and game are finalized, promotion goes in the other
direction: copy the finalized `13th-forum:index.html` to
`master:/dev/index.html`, copy `game/` and any updated Forum assets to master,
and add `game` to master's static build/check lists. Do not replace master's
public root teaser until the separate Forum launch decision.

The game uses classic scripts and a same-origin, versioned case-pack loader so it remains usable inside a sandboxed iframe with an opaque origin. It has no account, analytics, cookies, service worker, audio, or third-party runtime. Its visual layer reuses the Forum site's existing identity logo, butterfly mark, textured geometric shapes, and background motif. An optional results-screen form can send a consented nickname and run summary to the Forum's Google Form through the trusted parent-page bridge.

## Generic iframe embed

The production security policy intentionally permits **same-origin embedding only**. Put the `game/` folder on the same origin as the host page, then include the bridge and its marker attribute:

```html
<iframe
  data-buzz-to-bloom
  src="/game/?embed=1&amp;pack=philippines-ai-v2"
  title="Buzz to Bloom evidence-to-action challenge"
  sandbox="allow-scripts"
  style="width:100%;height:760px;border:0"
></iframe>
<script defer src="/game/embed-v1.js"></script>
```

`embed-v1.js` adds responsive height, phase synchronization, and persistence brokerage. Without the bridge, the iframe still works at its fixed height but cannot persist embedded scores. The version 1 message envelope is:

```js
{
  channel: "mneforum.game",
  version: 1,
  game: "buzz-to-bloom",
  type: "ready" | "configure" | "resize" | "persist" | "leaderboard-submit" | "leaderboard-result" | "leaderboard-refresh" | "leaderboard-data",
  payload: {}
}
```

The host accepts messages only from the iframe's own `contentWindow`, validates the envelope, clamps height to 480–3200 pixels, and bounds persisted payloads. The higher ceiling lets a phone results screen expand for the leaderboard without clipping or a nested scroll area. Embedded runs use the host's local storage because `sandbox="allow-scripts"` intentionally omits `allow-same-origin`.

## Optional Google Form leaderboard

Leaderboard submission is opt-in and available only in the embedded Forum-page game. The player enters a 2–20 character nickname and checks an explicit public-leaderboard consent box. The game sends the completed run to the parent bridge; the parent validates every field and posts it to this Google Form endpoint:

`https://docs.google.com/forms/d/e/1FAIpQLSdy6j1jY3j9V9GWVu6tBGgiLcywYRh7usE_ARgmbUt0wZU-nA/formResponse`

The integration submits only nickname, score, blooms, loop-match percentage, best streak, pace, case pack, random run ID, game version, end reason, and consent. The Google Form's email collection must remain disabled; the game does not submit a real or placeholder email address. QA-mode submissions are disabled, and the parent keeps the latest 200 submitted run IDs locally to prevent accidental duplicate posts. The game iframe retains `sandbox="allow-scripts"`; Google communication happens only in the parent page.

Submission acknowledgement is necessarily optimistic because the Google response is cross-origin. Do not use this client-generated leaderboard for prizes or formal competition. The parent page reads up to 500 consented rows from the shared response Sheet through Google Visualization's JSONP endpoint, validates and sorts them in-browser, and sends only the top 20 nickname/score summaries into the sandboxed game. The query never selects the Sheet's email column, and `AUTOTEST-` integration runs are excluded. Because the underlying response tab must be publicly readable for this serverless approach, do not add personal or administrative fields to that tab.

## Content and controls

The default `philippines-ai-v2` content pack contains 256 short cards: two difficulty variants at each of four stages for 32 fictional responsible-AI cases across Philippine public services. The broader non-AI `philippines-v1` bank and smaller `forum-v1` pack remain available for previews and rollback. Players choose among **Verify evidence**, **Investigate why**, **Choose a response**, and **Measure results**. Each card describes a case with one unmet action; the player chooses what the team should do next. Because real situations can support more than one defensible response, the interface describes answers as the **best fit in this loop** and explains the diagnostic clue after every choice. The content-pack keys remain `check`, `connect`, `commit`, and `track` for backward compatibility.

Case content is hot-swappable without changing the engine or interface. Add a versioned file under `cases/`, then select it with `?pack=<pack-id>` on the game route or `?gamePack=<pack-id>` on the Forum page. See `cases/README.md` for the pack contract and release workflow.

- Keyboard: `1`–`4` choose actions, `P` or `Escape` pauses, and `Enter` continues after a decision review or resumes.
- Touch: every action is a native button at least 48 pixels high.
- Motion: operating-system reduced motion is respected; a manual toggle is also provided.
- Timing: Quick Challenge and Guided Pace modes keep separate local bests. The timer pauses after every answer so the player can read the rationale before continuing.

## Local checks

Run the engine/content tests from the repository root:

```powershell
node game/tests/engine.test.js
node game/tests/embed.test.js
node game/tests/integration.test.js
node game/tests/case-packs.test.js
```

Also run `node --check` on every game JavaScript file, serve the repository over HTTP, and verify `/`, `/?gamePack=forum-v1`, `/?gamePack=philippines-v1`, `/?gamePack=philippines-ai-v2`, and `/game/?qa=1&seed=12345&pack=philippines-ai-v2`. Before deployment, complete real-browser keyboard, screen-reader, reduced-motion, responsive/zoom, console, network, and production-header checks.

Versioned JavaScript, CSS, and case-pack filenames are immutable release assets because the root server configuration caches scripts and styles for one month. Any post-release asset change must use a new versioned filename and update its reference.
