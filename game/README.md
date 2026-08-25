# Buzz to Bloom

Buzz to Bloom is a dependency-free evidence-to-action mini-game for the 13th M&E Network Forum. It uses fictional public-service cases and stores only local best scores and accessibility settings.

## Routes

- Standalone: `/game/`
- Embedded: `/game/?embed=1`
- Deterministic QA: `/game/?qa=1&seed=12345`

The game uses classic deferred scripts so it remains usable inside a sandboxed iframe with an opaque origin. It makes no network requests and has no account, analytics, cookies, service worker, leaderboard, audio, or third-party runtime.

## Generic iframe embed

The production security policy intentionally permits **same-origin embedding only**. Put the `game/` folder on the same origin as the host page, then include the bridge and its marker attribute:

```html
<iframe
  data-buzz-to-bloom
  src="/game/?embed=1"
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
  type: "ready" | "configure" | "resize" | "persist",
  payload: {}
}
```

The host accepts messages only from the iframe's own `contentWindow`, validates the envelope, clamps height to 480–1200 pixels, and bounds persisted payloads. Embedded runs use the host's local storage because `sandbox="allow-scripts"` intentionally omits `allow-same-origin`.

## Content and controls

The content pack contains 96 short cards: three difficulty variants at each of four stages for eight evolving cases. The fixed actions are **Check**, **Connect**, **Commit**, and **Track**.

- Keyboard: `1`–`4` choose actions, `P` or `Escape` pauses, `Enter` resumes.
- Touch: every action is a native button at least 48 pixels high.
- Motion: operating-system reduced motion is respected; a manual toggle is also provided.
- Timing: Classic and Relaxed modes keep separate local bests.

## Local checks

Run the engine/content tests from the repository root:

```powershell
node game/tests/engine.test.js
node game/tests/embed.test.js
node game/tests/integration.test.js
```

Also run `node --check` on every game JavaScript file, serve the repository over HTTP, and verify `/dev`, `/dev/`, and `/game/?qa=1&seed=12345`. The public root remains the pre-launch teaser. Before deployment, complete real-browser keyboard, screen-reader, reduced-motion, responsive/zoom, console, network, and production-header checks.

The `*-v1` JavaScript and CSS filenames are immutable release assets because the root server configuration caches scripts and styles for one month. Any post-release asset change must use a new versioned filename and update `game/index.html`.
