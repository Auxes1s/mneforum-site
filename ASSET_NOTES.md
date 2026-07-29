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

## Motifs for a longer scrolling page

Use a restrained recurring system rather than repeating the full event logo:

- Section opener: `butterfly-mark.svg` at 28–44 CSS px beside the eyebrow or heading, alternating normal and horizontally mirrored orientation.
- Section edge accent: the same mark at 140–240 CSS px, 5–9% opacity, clipped partly outside the section. Keep it `aria-hidden`.
- Major transition: a thin amber-to-red rule sampled from the butterfly colors (`#f1a81f` to `#c3435d`), with a small butterfly at one end.
- Dark/footer transition: `mne-network.svg` only where institutional identity is needed; do not use it as a background pattern.
- Hero or full-bleed banner only: `background.png` (4269 × 2400) is large enough for a wide cover. Avoid repeating it on every section.
- Social-card only: `og-teaser.png` (1200 × 630) should not be used as in-page decoration.
- Square campaign tile: `std.png` (1080 × 1080) is suitable for a card or gallery feature, not a full-width background.

Avoid injecting `forum-logo-transformation.svg` into decorative fields: it includes the complete 57 KB artboard and has its own animation clock.

## Presenter photos

`assets/presenters/presenter-map.csv` maps all 48 files to dimensions and provenance. Forty-four are name-verified against `archive/12th-mne-forum-2025.html`; two are unreferenced alternate formats (`deleon.jpg`, `esguerra.jpg`), and two remain unidentified (`holder.jpg`, `narag.png`).

The current 2026 `SPEAKERS` data uses generic organizations/roles and new names, so these 2025 photos must not be attached by filename guessing. Join only on a confirmed `display_name`, and leave the initials fallback in place for unmatched 2026 speakers.

All 48 raster presenter files decode successfully. They range from 200 × 200 to 8000 × 8000 and have mixed aspect ratios, so a square frame with `object-fit: cover` is required.
