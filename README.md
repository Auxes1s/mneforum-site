# MEtamorphosis — 13th M&E Network Forum

This repository preserves the original MEtamorphosis visual design and bundled
runtime for the 13th M&E Network Forum on September 9, 2026. The production
entry point is `/`; `/dev` is a staging alias for the same page.

The locked reference is the `pre-audit-baseline-2026-08-11` tag. The current
maintenance work keeps that design and applies only conservative improvements:
retired 2025 material is out of the production tree, unused embedded resources
are skipped during startup, document metadata and caching are explicit, and
third-party form handoffs require a deliberate click.

## Local checks

No bundler or dependency installation is required. Serve the repository over
HTTP when checking routes and headers:

```sh
python3 -m http.server 8080
```

Open `http://localhost:8080/`. The preserved runtime is also designed to work
when `index.html` is opened directly, but an HTTP server is the reliable way to
exercise relative routes and the Apache rules. A plain Python server does not
process `.htaccess`, so `/dev`, form routes, redirects, and response headers
must be checked through an Apache-compatible host before release.

Run the repository checks with:

```sh
npm run check
git diff --check
```

The check verifies the original bundled-runtime markers, local references,
metadata, pending live-room safeguards, guarded form pages, retired paths, the
asset allowlist, and required Apache rules.

## Release gates

Before production publication, the release owner must complete all of these:

1. `npm run check` and `git diff --check` pass.
2. Review the diff against `pre-audit-baseline-2026-08-11`; changes to the
   page’s visual structure require explicit design approval.
3. Verify `/`, `/dev`, `/register/`, `/rp-register/`, and `/evalform/` through
   the real host, including cache and security headers.
4. Verify registration and resource-person access with a non-organization
   account. These pages intentionally do not auto-forward while the Google
   Forms remain login-gated.
5. Confirm the Microsoft evaluation form still opens and its reviewed URL is
   current.
6. Complete visual QA at desktop, tablet, mobile, keyboard-only, and
   reduced-motion settings. Check Instant, High, and Ultra Thinking Mode and
   confirm the original logo, partner marks, and responsive layout remain
   intact.
7. Read `DEPLOYMENT.md`. The current origin (DigitalOcean App Platform static
   site) does not read `.htaccess`, so its caching, redirect, and security
   rules are inert. That document records what was measured and the options;
   treat this gate as answered there, not by inspecting `.htaccess`.
8. Publish only after explicit release authorization. Never rewrite the
   `pre-audit-baseline-2026-08-11` tag.

The 2025 archive and presenter media are deliberately outside the current
production tree. Restore them only as a separately tested, self-contained
archive.
