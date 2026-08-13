# Deployment and response headers

Release gate 7 in `README.md` asks the release owner to "confirm the hosting
origin supports the `.htaccess` rules, or configure equivalent redirects and
headers at the origin." This document records the answer, measured against the
live site on 2026-08-13.

**The origin does not support them. `.htaccess` is inert in production.**

## What was measured

The site is served by DigitalOcean App Platform as a **static site component**,
fronted by DigitalOcean's own Cloudflare CDN. Response headers show
`x-do-app-origin`, `x-rgw-object-type` (object storage), and `server:
cloudflare`; `mnenetwork.forum` resolves through `ns1/2/3.digitalocean.com` to
Cloudflare address space owned by the platform, not by this project.

App Platform never reads `.htaccess`. Every rule in it currently does nothing:

| `.htaccess` intends | Production actually returns |
| --- | --- |
| `/agenda` → 301 to the Drive folder | **404** |
| `/logistics-note` → 301 to the Drive folder | **404** |
| `/archive`, `/participantflow` → 410 Gone | 404 (harmless, but not the coded intent) |
| CSS/JS/images/fonts `max-age=31536000, immutable` | `public, max-age=10, s-maxage=86400` |
| HTML `no-cache, must-revalidate` | `public, max-age=10, s-maxage=86400` |
| `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `HSTS` | **none sent** |

Neither `/agenda` nor `/logistics-note` is linked from the page, so the 404s
only affect people who follow a printed, verbal, or QR-code shortlink.

### Decision (2026-08-13): both shortlinks stay parked until closer to the forum

The agenda and logistics note are not published yet, so the 404s are accepted
for now and the `.htaccess` rules are kept as the record of where each route
should eventually point.

**Read this before publishing either link.** The routes will not begin working
on their own. `.htaccess` is inert on this origin, so activating them requires
either option 2 (handoff pages) or the `ingress.rules` block below. Nothing in
the repository will warn you: `scripts/check-site.mjs` lists `/agenda` and
`/logistics-note` in `routePaths`, which makes `npm run check` treat them as
valid and pass while both still return 404 in production. Verify against the
real host, not the check script.

## The caching limitation is a platform constraint, not a misconfiguration

DigitalOcean App Platform **hardcodes** `Cache-Control: public, max-age=10,
s-maxage=86400` on static site components and provides no way to override it.
Custom response headers are a long-standing open feature request. The only
documented edge settings are `disable_edge_cache`, `disable_email_obfuscation`,
and `enhanced_threat_control_enabled` — none of which set cache or security
headers.

The practical cost: the CDN still caches for 24 hours, so origin load is fine,
but **browsers may only reuse assets for 10 seconds**. Lighthouse measures
about 149 KB re-downloaded per repeat visit — fonts, logos, and both
stylesheets. On forum day, when attendees reload the program between sessions,
that is 149 KB every time.

This does not change the Lighthouse performance score, which is measured on a
cold load. It affects real repeat visitors only.

## Options, in order of effort

### 1. Accept it

Nothing to do. Cold-load performance is unaffected. Repeat visitors re-download
about 149 KB. Reasonable if the forum expects mostly single-visit traffic.

### 2. Fix the two broken shortlinks without touching hosting *(recommended)*

Add `agenda/index.html` and `logistics-note/index.html` as click-through
handoff pages, exactly like the existing `register/`, `rp-register/`, and
`evalform/` pages. This works on any static host, needs no platform feature,
and matches the established "third-party handoffs require a deliberate click"
policy. It also keeps the routes inside `npm run check`'s coverage.

Requires adding both paths to `expectedFiles` and `productionFiles` in
`scripts/check-site.mjs` and to `publishEntries` in `scripts/build-static.mjs`.

### 3. Serve from a service component instead of a static site component

Replacing the static site component with a small web service (nginx or a
minimal Node server) restores full control over `Cache-Control` and security
headers, and makes the existing `.htaccess` intent expressible again. This
costs a running instance rather than static hosting, and is a genuine
infrastructure change — worth it only if the caching and security headers
matter more than the simplicity of static hosting.

### 4. Put a Cloudflare zone you control in front

Moving DNS to a Cloudflare account owned by this project (proxying to the App
Platform origin) makes Cache Rules, Transform Rules, and Redirect Rules
available on the free plan. That solves caching, security headers, and both
shortlink redirects at once, without changing the app. It does mean this
project takes on DNS ownership.

Note that today's Cloudflare in front of the site belongs to DigitalOcean, so
none of its rules are reachable from this project.

## App spec redirects

If you stay on App Platform and prefer platform-level redirects over option 2,
`ingress.rules` supports them. Retrieve the current spec first — do not paste
this blind, because it must merge with the existing component definition:

```sh
doctl apps list
doctl apps spec get <APP_ID> > app.yaml
```

Then add, and re-apply with `doctl apps update <APP_ID> --spec app.yaml`:

```yaml
ingress:
  rules:
    - match:
        path:
          exact: /agenda
      redirect:
        authority: drive.google.com
        scheme: https
        uri: /drive/folders/1okuWWAQQ5pTnVbO26m1uAFtmRxBYWmso
        redirect_code: 301
    - match:
        path:
          exact: /logistics-note
      redirect:
        authority: drive.google.com
        scheme: https
        uri: /drive/folders/1U1WHCzctKs1GzAYG8-2x6fwBG2Dj5VM-
        redirect_code: 301
```

This drops the `?usp=drive_link` query parameter, which `redirect.uri` does not
reliably carry. The folders open without it, but verify both links after
applying. Option 2 preserves the full URL and is easier to test.

## Keeping `.htaccess`

`.htaccess` stays in the repository. It is accurate documentation of the
intended caching, redirect, and security posture, and it becomes live again if
the site ever moves to an Apache origin. It is simply not doing anything today,
and release gate 7 should be read as answered by this document rather than by
inspecting that file.
