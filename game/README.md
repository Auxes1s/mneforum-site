# Buzz to Bloom

Buzz to Bloom is a dependency-free evidence-to-action mini-game for the 13th M&E Network Forum. It uses fictional public-service cases and stores only local best scores and accessibility settings.

## Routes

- Standalone: `/game/`
- Embedded: `/game/?embed=1`
- Deterministic QA: `/game/?qa=1&seed=12345`

The game uses classic deferred scripts so it remains usable inside a sandboxed iframe with an opaque origin. It makes no network requests and has no account, analytics, cookies, service worker, leaderboard, audio, or third-party runtime.

## Generic iframe embed

```html
<iframe
  src="/game/?embed=1"
  title="Buzz to Bloom evidence-to-action challenge"
  sandbox="allow-scripts"
  style="width:100%;height:760px;border:0"
></iframe>
```

For this forum homepage, `embed-v1.js` adds responsive height and persistence brokerage. The version 1 message envelope is:

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

The content pack contains 64 short cards: two variants at each of four stages for eight evolving cases. The fixed actions are **Check**, **Connect**, **Commit**, and **Track**.

- Keyboard: `1`–`4` choose actions, `P` or `Escape` pauses, `Enter` resumes.
- Touch: every action is a native button at least 48 pixels high.
- Motion: operating-system reduced motion is respected; a manual toggle is also provided.
- Timing: Classic and Relaxed modes keep separate local bests.

## Local checks

Run the engine/content tests from the repository root:

```powershell
node game/tests/engine.test.js
```
