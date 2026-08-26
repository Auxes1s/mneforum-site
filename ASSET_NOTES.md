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

The 2026 public speaker portraits live in `assets/speakers/2026/`. They are generated from the authoritative Resource Persons folder by `scripts/prepare-speaker-assets.ps1`; the adjacent `manifest.csv` records each source, extraction method, dimensions, byte size, focal position, and verification state.

The initial verified set covers Arsenio M. Balisacan, Christophe Bahuet, Roderick M. Planta, Diane Gail L. Maharjan, Joseph J. Capuno, and Vivien Suerte-Cortez. Capuno's portrait is copied from `word/media/image1.jpeg` inside his current DOCX bionote; the other five use standalone current-event files. Each public derivative is WebP, fits within 720 × 900 pixels without upscaling, strips metadata, and stays below 150 KB.

Do not restore or attach the historical 2025 presenter files by filename guessing. Current speaker cards join only on an explicitly verified 2026 name and leave the branded initials fallback in place when no approved portrait exists. Mixed aspect ratios are displayed in a square frame with `object-fit: cover` and the focal position recorded in the manifest.

## 13th Forum UI lock

`assets/forum-ui-lock.css` is the locally owned final cascade layer for the fluid desktop shell and Ultra/Night Mode contrast. `scripts/port-master-dev.ps1` must keep it after the master brand, responsive, and speaker styles whenever `/dev` is ported again.

Run `node scripts/verify-forum-ui-lock.mjs` after any port or theme change. It checks the stylesheet-order invariant, Thinking Mode hooks, required responsive and Ultra rules, syntax, and the locked color-pair contrast ratios.
