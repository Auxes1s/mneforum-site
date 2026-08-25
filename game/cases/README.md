# Case packs

Buzz to Bloom loads its cases independently from the game engine and interface.
Each pack is an immutable, versioned JavaScript file in this folder.

## Add a pack

1. Copy `forum-v1.js` to a new lowercase versioned slug, such as
   `regional-pilot-v1.js`.
2. Change `packId` to exactly match the filename without `.js`.
3. Update `name`, `description`, and the case content. Keep the registration
   block at the bottom of the file.
4. Run the content-pack and engine checks documented in `../README.md`.
5. Preview it at `/game/?pack=regional-pilot-v1` or inside the Forum page at
   `/?gamePack=regional-pilot-v1`.

No engine, interface, or host-page edits are needed. To make a pack the default,
change only `data-case-pack` on the `<html>` element in `../index.html`.

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
  24 words/150 characters.
- IDs are unique across cases and cards. Theme/tag balance is enforced by the
  engine validator.

Always create a new filename for revised deployed content, for example
`regional-pilot-v2.js`; scripts are cached as immutable release assets.
