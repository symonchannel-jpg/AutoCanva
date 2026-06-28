# Roadmap — explicitly deferred (DO NOT build in MVP)

Every item here is a *good idea* that is **not** in PLAN.md's MVP. If an agent is tempted to add one, add it here instead and leave the code alone. Items are roughly priority-ordered but none are scheduled.

## Tier 1 — small, high value, likely soon

- **Undo / Redo** — a bounded history stack in `store.js` (cap ~100). Ctrl+Z / Ctrl+Y. No branching tree.
- **Keyboard nudging** — arrow keys move selected element 1px (Shift = grid step). Delete removes it.
- **Multi-select + align** — shift-click to select several, align left/center/right/top/middle/bottom, distribute spacing.
- **Resize handles** — drag any edge/corner of an element, not just move.
- **Element z-order** — bring to front / send to back.
- **Duplicate element** — Ctrl+D, copies with a new id offset by 4px.

## Tier 2 — packaging & distribution

- **Windows `.exe` packaging** via `@electron-forge/maker-squirrel` or `electron-builder`. One-click installer + portable.zip. Signing is out of scope until a cert exists.
- **Auto-update** with `electron-updater` against GitHub Releases (needs a release pipeline first).
- **Per-user config** for default canvas size and last-used grid size, remembered across launches.

## Tier 3 — small features

- **Color picker per element** so the export can hint at colors (append-only: add `color`, `background` fields).
- **Font size / weight** hint fields for `text` elements (append-only: `fontSize`, `weight`).
- **Grouping** — group several elements under one named region; export a `group` wrapper.
- **Snap to element edges**, not just the grid.
- **Ruler guides** — user-dragged horizontal/vertical guide lines.

## Tier 4 — bigger, evaluate carefully

- **Multi-screen / tabs** — multiple canvases in one `.autocanva`, exported as an array of scenes.
- **Clip image regions** — let the user draw a rectangle on the reference image and have AutoCanva crop + (optionally) export that cropped tile as an embedded PNG so a vision-less agent gets a literal piece. This breaks the "image never exported" rule, so it is opt-in and clearly flagged in the export.
- **Live preview** — a second window that renders the layout at the target window size using the `rel*` numbers, so the user can sanity-check before exporting.
- **Test suite** with `node:test` — golden export snapshots, drag math, clamp/snap correctness.

## Out of scope forever (unless human says otherwise)

- Themes other than the dark theme.
- Cloud sync, accounts, sharing links.
- A plugin / extension API.
- Mobile or non-Windows platforms.

## When you add a roadmap item to the app

1. Move it from this file into PLAN.md as a new phase.
2. If it touches the export, append fields in `docs/EXPORT_FORMAT.md` and bump logic only (do not remove/rename).
3. Keep the MVP philosophy: calm, small, stable, deterministic.