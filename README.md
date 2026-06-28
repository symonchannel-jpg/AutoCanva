# AutoCanva

> Draw your intent. Hand coordinates to a blind coding agent. Get pixel-accurate UI without describing it in words.

AutoCanva is a tiny Windows desktop app for non-technical people. You open it, drop a reference image as your background, drag **buttons**, **text**, **image placeholders**, **rectangles** and **icons** onto a grid, and click **Export**. You then paste that export into a chat with a coding AI that has no vision, and it can rebuild your layout exactly because every position is given in both **pixels** and **percentages**.

The reference image is **never** exported — it is only a guide for your eyes while you design.

## Why

Describing "put the save button a bit to the right of the profile picture" to an AI is slow and imprecise. AutoCanva turns "a bit to the right" into hard numbers an agent can act on, no screen share required.

## Features (MVP)

- Load any image as a visual-only reference background.
- Place draggable elements: button, text, image placeholder, rectangle, icon marker.
- Two size fields you can type into: **window size** and **canvas size**.
- Toggleable grid + snap-to-grid.
- Per-element label text and an optional free-text comment.
- **Auto-save** to the last file you opened; reopen continues where you left off.
- Export one deterministic, human- **and** machine-readable JSON block ready to paste into any chat.

## Getting started (for developers / agents)

Requirements: Node.js 18+ (tested on 24), Windows.

```bash
npm install
npm start
```

The app window opens automatically. No build step.

See `PLAN.md` for the build order and `docs/EXPORT_FORMAT.md` for the export contract.

## For everyday users

Just run the packaged `.exe` (once built). Everything you need is a single window — no menus, no terminal, no configuration files.

## Project layout

See `AGENTS.md` §4 for the directory map and the rules every change must follow.

## License

MIT — see `LICENSE`.