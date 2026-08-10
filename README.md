# MEtamorphosis — 13th M&E Network Forum

Source-first static site for the 13th M&E Network Forum on September 9, 2026.
The production entry point is `/`; `/dev` is a staging preview with optional
`?phase=before`, `?phase=live`, or `?phase=after` controls.

## Local development

No bundler or runtime dependency is required. Serve the repository over HTTP so
ES modules and the Ultra transformation asset work:

```sh
python3 -m http.server 8080
```

Open `http://localhost:8080/`. A plain Python server does not process the
Apache rewrite rules, so `/dev` and the pretty form routes should be checked
through the deployed host or an Apache-compatible local server.

## Checks

```sh
npm run check
npm run check:js
git diff --check
```

The check rejects stale generated runtime markers, third-party runtime imports,
generic Slido destinations, missing local references, auto-redirect pages, and
unlisted production assets.

## Release gates

Before production publication, the release owner must complete all of these:

1. `npm run check`, `npm run check:js`, and `git diff --check` pass.
2. Verify `/`, `/dev`, `/register/`, `/rp-register/`, and `/evalform/` return the
   expected HTML through the real host, including cache/security headers.
3. Verify registration and resource-person form access with a non-organization
   account. These handoff pages intentionally do not auto-forward while the
   Google Forms remain login-gated.
4. Confirm the Microsoft evaluation form still opens, and replace the manual
   status text if its access changes.
5. Complete visual QA at desktop, tablet, mobile, keyboard-only, and reduced-
   motion settings. Check Instant, High, and Ultra mode transitions and confirm
   the Ultra asset is loaded only after selection.
6. Test the release on the actual hosting origin. `.htaccess` rules are only
   effective when the origin supports Apache overrides; if the object-storage
   origin ignores them, configure equivalent redirects/headers there before
   publication.
7. Publish only from the reviewed `audit/refactor-cleanup` commit after explicit
   release authorization. Never move or rewrite the
   `pre-audit-baseline-2026-08-11` tag.

The 2025 archive and its presenter media are deliberately outside the current
production tree. Restore them only as a separately tested, self-contained
archive.
