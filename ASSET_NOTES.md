# Production asset notes

The original bundled page and its two visual stylesheet layers are preserved.
The maintenance pass removes retired 2025 media and generated animation
exports, replaces unstable footer/logo blob references with the reviewed local
artwork, and skips manifest entries that are no longer referenced by the
mounted page.

## Runtime inventory

| Asset | Role |
| --- | --- |
| `network_logo.svg` | Favicon, manifest icon, and colored, scalable M&E Network masthead mark |
| `assets/forum-logo-v5-static.svg` | Static event identity and fallback artwork |
| `assets/forum-logo-transformation.svg` | Original Thinking Mode transformation artwork |
| `assets/butterfly-mark.svg` | Compact mark used on form handoff pages |
| `assets/partners/depdev.svg` | DEPDev footer partner mark |
| `assets/partners/mne-network.svg` | M&E Network footer partner mark |
| `assets/partners/undp.svg` | UNDP footer partner mark |
| `assets/depdev-logo-color.png` | Colored DEPDev masthead mark from the supplied logo resources |
| `assets/depdev-logo-color-192.png` | Optimized colored DEPDev masthead mark; Ultra mode renders it white via CSS |
| `assets/undp-logo-color.svg` | Colored, scalable UNDP masthead mark from the supplied logo resources |
| `assets/og-teaser.png` | Social preview image referenced by page metadata |
| `assets/fonts/OpenSans-SemiCondensed-Bold.ttf` | Local display font used by the form pages |
| `assets/forum-brand.css` | Original brand and component layer |
| `assets/forum-responsive.css` | Original responsive layer with small audited overrides |
| `assets/redirect.css` | Original form handoff-page styling |

The brand and redirect styles retain their Fontshare import for visual fidelity.
That external font request is a known performance trade-off and should be
revisited only as a separately reviewed typography change.

## Motion and embedded runtime

`index.html` contains the original self-unpacking runtime and template. Its
static local substitutions keep the supplied logo and partner artwork stable;
the startup guard avoids decoding manifest blobs that the mounted template no
longer references. Keep the transformation SVG and static identity visually
aligned when updating either asset.

Do not add GIF or video exports to the page. They are design/distribution
derivatives, not runtime sources, and the generated archive is ignored by
`.gitignore`.

## Archive policy

The 2025 presenter photos and legacy page are not valid 2026 speaker data and
are not part of the production tree. The pre-audit baseline tag remains the
recovery point. If the old event is published again, restore it as a separately
tested archive with its own metadata and asset paths.

## Release checks

Run `npm run check` before publishing. It verifies local references, preserved
runtime markers, guarded external handoffs, metadata, retired paths, the
production asset inventory, and the required response rules. Visual browser QA
remains a release gate because static checks cannot verify responsive
composition or animation behavior.

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
