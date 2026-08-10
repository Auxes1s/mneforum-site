# Asset repair notes

## Footer partner logos

The two footer UUIDs are not empty in the bundle:

- `33b97d14-65ec-4339-a719-bb6c8b0b7166` decompresses to a 90,198-byte DEPDev SVG.
- `1cdb3ddb-492a-4da8-a30c-3167de126d8a` decompresses to a 24,643-byte M&E Network SVG.

The failure is therefore in the bundle/blob delivery path, not in the underlying artwork. Stable local replacements recovered from the exact manifest payloads are now available at:

- `assets/partners/depdev.svg` — 90,198 bytes; viewBox `-10 -10 915 890`.
- `assets/partners/mne-network.svg` — 24,643 bytes; viewBox `0 0 1270.06 816`.

Use these file paths directly instead of either manifest UUID. Both are self-contained white SVG lockups designed for the dark footer and were visually decoded together on `#1d1f20`.

## Butterfly mark

`assets/butterfly-mark.svg` is a static, tightly cropped extraction of the completed red-and-amber butterfly from `assets/forum-logo-transformation.svg`. It has viewBox `600 165 255 285`, no wordmark, no transformation artboard, no animation, and only four paths. It is suitable for CSS-sized uses from small section markers to large translucent background ornaments.

The original 855 × 459 transformation SVG remains appropriate for the one-shot hero sequence. The cropped mark should replace it in repeated decorative fields.

`assets/forum-logo-v5-static.svg` is the saved static full-logo reference from `Forum Logo v5 FINAL-04.svg`. Use it to check the final alignment of the animated transformation and GIF; it is not animated and should not replace the transformation asset in the hero.

### Transformation timing

`assets/forum-logo-transformation.svg` is authored against a single 12 s clock: every beat is a percentage of that clock, and every keyframe list resolves to the exact identity transform at 100 %, so the last frame is pixel-equivalent to `forum-logo-v5-static.svg` (max channel delta 45/255 on curve antialiasing only). Keep both of those properties when editing beats — the hero resolves to the finished identity, and the page stretches the whole board onto the headline clock with a single `playbackRate`.

The host page phase-locks the board's CSS animations to that headline clock **once**, by assigning a shared `startTime`, and then leaves them to the compositor. It must never scrub `currentTime` per frame: doing so re-resolves every animation on the main thread each tick and prevents any of them from being composited (measured at 859 style recalculations per sequence versus 40 after the fix). The `data-clock="held"` attribute on the inlined SVG is the pause gate; see `lockSvgToMaster` in `index.html`.

The board plays faster when the thinking is short and slower when it is long, so the final butterfly always lands on the last typed character. The stretch is `board length / headline length`, and **both sides are measured, not written down** — the board's length comes from `measureSvgDuration()` reading the animations themselves, and the headline's from `modes.ultra.totalMs`. Retiming the SVG or changing `thinkingMs` / `typingDelay` therefore retimes the transformation automatically, and the duration shown in the Thinking Mode panel is derived from the same number rather than hardcoded. Ultra's word cycle is now derived from the board rather than the other way round: `thinkingMs = 12000 - typingDuration - 450`, so the mode lands on exactly 12 000 ms and the board plays at `playbackRate` 1.0 — authored speed, zero drift against the headline, and "About 12 sec" in the panel is literal. Change the headline text or `typingDelay` and the cycle re-derives itself.

**One move per element.** Each beat is exactly three keyframe stops: hold at the start value, a single eased move, hold at the final value. Two things break this and both read as a visible pulse rather than as life:

- *Overshoot.* Landing, springing past and coming back throbs on artwork this large, however small the overshoot value.
- *Intermediate keyframes.* A CSS timing function is applied to every keyframe segment, not once across the animation, so a beat written with five stops decelerates and re-accelerates five times.

Nothing breathes, flutters or drifts after arrival either. Continuity comes from overlapping the beats — coverage is unbroken from 0 % to 99 % — not from keeping individual shapes in motion. To check a change, sample each element's computed transform across the timeline, decompose it, and confirm rotation, scale, translation and opacity are each monotonic; any direction reversal is a pulse.

### Both logo SVGs are transparent

Neither `forum-logo-transformation.svg` nor `forum-logo-v5-static.svg` contains a background — no backdrop rect, no white fills at all. Any white box behind the mark is coming from the page, not the asset. The usual culprit is `.hero__art`: `assets/forum-brand.css` paints that container, and the polish layer rounds it to `border-radius: 50%` under Ultra and `0` under Instant/High, so a single opaque fill shows up as a rectangle in one mode and an ellipse in the other. Keep `.hero__art` transparent and unframed — no fill, no border, no radius. The logo sits directly on the page texture; a border here reads as a box drawn around the mark, and under Ultra the polish layer's 50% radius bends it into stray arcs.

### Responsive coverage

Every hero breakpoint shows the transformation and hides `hero__identity-logo`; the breakpoints differ only in sizing, and none falls back to the static mark. Verified at 13 viewports from 1440 × 900 down to 320 × 600, plus both landscape-phone cases. The static identity returns only under `prefers-reduced-motion` combined with `data-transformation-ready="fallback"`, where an `<img>`-hosted SVG cannot be paused.

The SVG's own `mobile-camera` close-up is keyed to how small the host page makes the board, so its media queries must track the ones in `index.html`. Two layouts qualify: portrait phones (`max-width: 600px`, board capped at 250 px tall) and the short-landscape hero (`max-width: 880px and max-height: 500px`, capped at 150 px and in practice rendering around 222 × 119 — the smallest it ever gets). Matching on width alone missed the landscape case entirely, because those viewports are wider than 600 px.

Two more constraints are easy to violate by eye:

- `.wing` hinges on its own fill-box edge, not on the butterfly's body. Past roughly 8° of rotation the lobe separates from the thorax and the mark reads as broken artwork. The wings open once; they do not flap.
- The middle butterfly must approach from above its landing spot. A level approach drags it through the light blue butterfly that has already landed, and the two translucent silhouettes merge into one unreadable blue mass.

`assets/forum-logo-transformation.gif` is a 855 × 459, 20 fps, 240-frame, 64-colour render of that same SVG (1.2 MB). It is referenced nowhere in the site — `index.html` loads the SVG — so it exists for decks and social use. Regenerate it whenever the SVG timing changes, by scrubbing `document.getAnimations()` frame by frame in a headless browser; note that Playwright's `screenshot({ animations: 'disabled' })` fast-forwards CSS animations to their end state and will silently produce 240 identical frames of the finished logo.

## Motifs for a longer scrolling page

Use a restrained recurring system rather than repeating the full event logo:

- Section opener: `butterfly-mark.svg` at 28–44 CSS px beside the eyebrow or heading, alternating normal and horizontally mirrored orientation.
- Section edge accent: the same mark at 140–240 CSS px, 5–9% opacity, clipped partly outside the section. Keep it `aria-hidden`.
- Major transition: a thin amber-to-red rule sampled from the butterfly colors (`#f1a81f` to `#c3435d`), with a small butterfly at one end.
- Dark/footer transition: `mne-network.svg` only where institutional identity is needed; do not use it as a background pattern.
- Hero or full-bleed banner only: `background.png` (4269 × 2400) is large enough for a wide cover. Avoid repeating it on every section.
- Social-card only: `og-teaser.png` (1200 × 630) should not be used as in-page decoration.
- Square campaign tile: `std.png` (1080 × 1080) is suitable for a card or gallery feature, not a full-width background.

Avoid injecting `forum-logo-transformation.svg` into decorative fields: it includes the complete 68 KB artboard and has its own animation clock.

## Presenter photos

`assets/presenters/presenter-map.csv` maps all 48 files to dimensions and provenance. Forty-four are name-verified against `archive/12th-mne-forum-2025.html`; two are unreferenced alternate formats (`deleon.jpg`, `esguerra.jpg`), and two remain unidentified (`holder.jpg`, `narag.png`).

The current 2026 `SPEAKERS` data uses generic organizations/roles and new names, so these 2025 photos must not be attached by filename guessing. Join only on a confirmed `display_name`, and leave the initials fallback in place for unmatched 2026 speakers.

All 48 raster presenter files decode successfully. They range from 200 × 200 to 8000 × 8000 and have mixed aspect ratios, so a square frame with `object-fit: cover` is required.
