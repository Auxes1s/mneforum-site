# MEtamorphosis — 13th M&E Network Forum

This repository preserves the original MEtamorphosis visual design and bundled
runtime for the 13th M&E Network Forum on September 9, 2026. The production
entry point is `/`; `/dev` is a staging alias for the same page.

The locked reference is the `pre-audit-baseline-2026-08-11` tag. The current
maintenance work keeps that design and applies only conservative improvements:
retired 2025 material is out of the production tree, unused embedded resources
are skipped during startup, document metadata and caching are explicit, and
registration and form shortlinks forward automatically to their current providers.

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

## Close and publish the Evaluation Gallery vote

The complete closeout pipeline lives in this repository and does not depend on
the participant-ID repository or on a machine-specific path. The committed
`data/evaluation-gallery-voters.enc.json` contains the voting authorization
registry encrypted with AES-256-GCM; usable Voting Codes and participant data
are never committed in plaintext. Keep the passphrase separately in a password
manager. On a working machine, either create the ignored
`.gallery-closeout.key` file or set `MNEFORUM_VOTER_REGISTRY_PASSPHRASE`.

After closing Google Forms, rehearse the live collection and tally without
changing the website:

```sh
bash scripts/run-gallery-closeout.sh --dry-run
```

```powershell
.\scripts\run-gallery-closeout.ps1 --dry-run
```

For the approved final release, use `--deploy` and type `PUBLISH` after the
aggregate totals have been reviewed:

```sh
bash scripts/run-gallery-closeout.sh --deploy
```

```powershell
.\scripts\run-gallery-closeout.ps1 --deploy
```

The command downloads the live response sheet directly, preserves that exact
CSV in its ignored audit run, authenticates codes, enforces verified-email and first-valid-ballot
rules, applies the official voting window, produces an ignored audit run under
`.gallery-closeout-runs/`, checks the frozen snapshot, builds the site, commits
only the two generated pages, pushes the current branch, and polls the live page
for the published snapshot ID. Pass `--input "/path/to/file.csv"` only for an
offline rehearsal or recovery. Omit `--deploy` to prepare the two page changes
for separate review and manual publication.

The lower-level snapshot installer remains available on a clean release branch:

```sh
npm run gallery:prepare -- --snapshot "/path/to/evaluation-gallery-snapshot.json"
```

The command requires the versioned contract in
`data/evaluation-gallery-event.json`, a `FINAL` state, twelve catalog-matching
aggregate rows, a SHA-256 audit digest, and valid 3-2-1 accounting. It requires
`INSTALL` confirmation before freezing the snapshot into `index.html` and
`dev/index.html`. Use `--dry-run` to validate without changing files.

Preparation runs all checks and the static build, but it never commits or
pushes. Review the two generated-page diffs, commit them on the release branch,
and merge or push through the normal authorized production workflow. This split
prevents a validation or test command from triggering a DigitalOcean deployment.
The browser never reads raw Form responses, the encrypted registry, or
participant-level data; all tallying happens in the local closeout command.

To rotate the encrypted authorization bundle after participant IDs change, run
the sealing command from a trusted machine with the same passphrase, then commit
only the resulting `.enc.json` file:

```sh
npm run gallery:registry:seal -- --registry "/restricted/path/to/registry.csv" --spreadsheet-id "<response-sheet-id>"
```

## Release gates

Before production publication, the release owner must complete all of these:

1. `npm run check` and `git diff --check` pass.
2. Review the diff against `pre-audit-baseline-2026-08-11`; changes to the
   page’s visual structure require explicit design approval.
3. Verify `/`, `/dev`, `/register/`, `/dro-register/`, `/rp-register/`,
   `/evalform/`, and `/eg-submission/` through the real host, including cache
   and security headers.
4. Verify registration, resource-person, evaluation, and Evaluation Gallery
   shortlinks automatically forward to their current providers. Google Forms,
   Microsoft Forms, and the Drive folder may still remain login-gated.
5. Confirm the Microsoft evaluation form still opens and its reviewed URL is
   current.
6. Complete visual QA at desktop, tablet, mobile, keyboard-only, and
   reduced-motion settings. Check Instant, High, and Ultra Thinking Mode and
   confirm the original logo, partner marks, and responsive layout remain
   intact.
7. Confirm the hosting origin supports the `.htaccess` rules, or configure
   equivalent redirects and headers at the origin.
8. Publish only after explicit release authorization. Never rewrite the
   `pre-audit-baseline-2026-08-11` tag.

The 2025 archive and presenter media are deliberately outside the current
production tree. Restore them only as a separately tested, self-contained
archive.
