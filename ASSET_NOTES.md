# Production asset notes

The production page is source-first. It serves only the assets that are used by
the current 2026 Forum experience; the previous generated runtime and the 2025
archive are preserved by the `pre-audit-baseline-2026-08-11` tag, not mixed into
the deployable tree.

## Runtime inventory

| Asset | Role |
| --- | --- |
| `network_logo.svg` | Favicon, manifest icon, and network mark in the header |
| `assets/forum-logo-v5-static.svg` | Immediate hero identity and reduced-motion fallback |
| `assets/forum-logo-transformation.svg` | Lazy-loaded Ultra-mode hero animation |
| `assets/butterfly-mark.svg` | Compact mark used on form handoff pages |
| `assets/partners/depdev.svg` | DEPDev footer partner mark |
| `assets/partners/mne-network.svg` | M&E Network footer partner mark |
| `assets/partners/undp.svg` | UNDP footer partner mark |
| `assets/og-teaser.png` | Social preview image referenced by the page metadata |
| `assets/fonts/OpenSans-SemiCondensed-Bold.ttf` | Local display font; no third-party font request |

The partner images are constrained by the footer stylesheet rather than relying
on their intrinsic dimensions. New partner artwork must include a confirmed
alt-text label and be checked at both desktop and mobile widths.

## Motion rules

The static identity is always present first. The transformation SVG is fetched
only when a visitor selects Ultra mode, and is removed again when they switch
back to Instant or High mode. Do not add the GIF or video exports to the page:
they are design/distribution derivatives, not runtime sources.

Keep the transformation SVG's 12-second animation clock and its final identity
frame aligned with `assets/forum-logo-v5-static.svg`. Its embedded style block is
intentional: it contains the SVG animation rules. The site CSP allows that
same-document SVG style block while keeping scripts and network connections
first-party only.

## Archive policy

The 2025 presenter photos and legacy page are not valid 2026 speaker data and
must not be filename-mapped into the current speaker cards. The complete prior
tree remains recoverable from the locked baseline tag. If the old event is ever
published again, restore it as a separately tested, self-contained archive with
its own metadata and asset paths.

## Release checks

Run `npm run check` before publishing. It verifies local references, forbidden
legacy/runtime markers, metadata, external form handoff behavior, and the
production asset inventory. Visual browser QA remains a release gate because
static checks cannot verify responsive composition or motion behavior.
