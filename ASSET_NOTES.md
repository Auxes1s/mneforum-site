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
