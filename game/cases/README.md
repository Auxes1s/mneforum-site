# Case packs

Buzz to Bloom loads its cases independently from the game engine and interface.
Each pack is an immutable, versioned JavaScript file in this folder.

## Add a pack

1. Copy the structurally closest existing pack to a new lowercase versioned slug, such as
   `regional-pilot-v1.js`.
2. Change `packId` to exactly match the filename without `.js`.
3. Update `name`, `description`, and the case content. Keep the registration
   block at the bottom of the file.
4. Run the content-pack and engine checks documented in `../README.md`.
5. Preview it at `/game/?pack=regional-pilot-v1` or inside the Forum page at
   `/?gamePack=regional-pilot-v1`.

No engine, interface, or host-page edits are needed. To make a pack the default,
change only `data-case-pack` on the `<html>` element in `../index.html`.

The shipped packs are:

- `philippines-ai-v2`: the default responsible-AI bank with 32 cases and 256 cards.
- `philippines-v1`: the previous broad bank with 32 cases and 256 cards.
- `forum-v1`: a compact bank with eight cases and 96 cards.

## Contract

- `schemaVersion` is `1`.
- `packId` is a lowercase slug of at most 50 characters.
- `locale` is `en-PH`.
- `themeIds` contains the four cleared Forum concept-note themes.
- A pack contains at least eight uniquely identified cases.
- Every case has a short `domain`, `title`, and the four stage arrays:
  `check`, `connect`, `commit`, and `track`.
- Every stage has at least two cards, including difficulty 1 and 2.
- Signals are at most 18 words/120 characters; rationales are at most
  24 words/150 characters. A card may also include a `cue` of at most 24
  words/140 characters; the interface shows it only after the decision.
- IDs are unique across cases and cards. Theme/tag balance is enforced by the
  engine validator.

Always create a new filename for revised deployed content, for example
`regional-pilot-v2.js`; scripts are cached as immutable release assets.

## Writing unambiguous cards

Write each signal as a situation with one first unmet need. Do not describe the
expected action as already completed.

- `check` (**Verify evidence**): the source, definition, coverage, or data quality is uncertain.
- `connect` (**Investigate why**): the pattern is verified, but who is affected, why, or how people
  understand it remains unclear.
- `commit` (**Choose a response**): the issue is understood, but the action, owner, measure, safeguard,
  or review point is missing.
- `track` (**Measure results**): an action is underway, but its results, uneven effects, or needed
  adaptation have not been reviewed.

Use `cue` to name the diagnostic feature that distinguishes the card from the
other three actions. Keep cases fictional and avoid personal data, political
claims, or language implying that the game has the only valid real-world
answer.
