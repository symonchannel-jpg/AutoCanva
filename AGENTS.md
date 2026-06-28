# AGENTS.md — How to build and maintain AutoCanva

This file is the single source of truth for any coding agent (including smaller, cheaper models) that works on AutoCanva. Read it fully before touching any file.

## 1. What AutoCanva is

AutoCanva is a small Windows desktop app (Electron) that lets a non-technical user **visually design a UI layout** on top of a reference image, then **export the exact coordinates** of every element they placed. The export is meant to be pasted into a chat with a vision-less coding agent so that agent can reproduce the exact layout without ever "seeing" the screen.

Think of it as: a precise, coordinate-based bridge between a human (who can see) and an LLM coding agent (who cannot).

## 2. The user you are building for

- **Not a programmer.** Never print "open a terminal and type…" to the user. The user only ever clicks buttons in the app or in a file dialog.
- Will hand the export to another AI in a chat. The export must be **self-describing** — an agent reading it alone, with no extra context, must understand the layout.
- Wants the fewest moving parts possible. Stability and simplicity beat clever features.

## 3. Tech stack — locked, do not change without explicit approval

| Concern        | Choice                          | Why                                            |
|----------------|---------------------------------|------------------------------------------------|
| Shell          | Electron 33+                    | Real native window; later packagable to `.exe` |
| Language        | JavaScript (no TypeScript)     | Lowest cognitive load for small models         |
| Bundler        | NONE (no webpack/vite)          | Files load directly via `file://`               |
| UI framework    | NONE (vanilla DOM + CSS)        | Nothing to learn; smallest surface area        |
| State          | A single plain JS module (`store.js`) | No Redux/Zustand. One mutable object + a `persist()` call |
| Persistence    | `electron-store` or a hand-rolled JSON file on disk via the preload bridge | Auto-save every change |
| Styling        | One `styles.css`, CSS variables for the dark theme | No Tailwind, no preprocessor |

**Do not introduce** TypeScript, a bundler, a framework (React/Vue), or a CSS framework unless the human explicitly approves it in writing.

## 4. Directory map (respect this)

```
autocanva/
├── AGENTS.md                   <- you are here (rules for agents)
├── README.md                   <- human-facing project intro
├── PLAN.md                     <- step-by-step build plan; follow its order
├── LICENSE
├── package.json
├── docs/
│   ├── ARCHITECTURE.md         <- runtime/data-flow description
│   ├── EXPORT_FORMAT.md        <- the canonical export schema (do not break)
│   └── ROADMAP.md               <- post-MVP ideas, explicitly deferred
├── examples/
│   └── sample.autocanva        <- an example saved project (JSON)
└── src/
    ├── main/
    │   └── main.js             <- Electron main process: window + file IPC
    ├── preload/
    │   └── preload.js          <- contextBridge: ONLY safe file APIs exposed
    └── renderer/
        ├── index.html          <- the window's UI
        ├── styles.css          <- all styles, dark theme via CSS variables
        └── renderer.js         <- all UI logic + drag engine (entry)
```

If a file isn't in this map, don't create it without first stating **why** the existing structure is insufficient.

## 5. Non-negotiable rules

1. **English only** in UI strings, code, comments, file names, identifiers, and commit messages. Docs/READMEs are English too. The human-facing chat with the user can be Spanish.
2. **No comments in code unless a comment is genuinely needed to explain a non-obvious decision.** Prefer clear names. This matches the repo's existing style.
3. **Never commit secrets**, API keys, tokens, or absolute local paths.
4. **One change = one concern.** Don't refactor unrelated code while adding a feature.
5. **Don't break `EXPORT_FORMAT.md`.** The export schema is a contract with downstream agents. Adding fields is allowed (append-only); renaming or removing existing fields is NOT without approval.
6. **Run `npm run lint` after every source change** if an eslint config exists. If none exists yet, skip silently.
7. **Verify before declaring done:** run `npm install && npm start`. The window must open, the canvas must render, drag must work, export must produce valid JSON matching `EXPORT_FORMAT.md`. If you can't run it, say so explicitly instead of claiming it works.
8. **Never ask the end user to type shell commands.** All interaction is through the UI. If something requires the terminal, that's a bug or a missing menu item.
9. **Follow PLAN.md's order** unless the human redirects you. Each phase ends with a clear "done when" checklist — check every box.
10. **Never change visual CSS when fixing a layout bug.** If the panel overflows, add `overflow`, `min-width`, or `max-width` but do NOT touch `padding`, `margin`, `font-size`, `display`, `width` (of elements that already had one), or any other property that alters the look. The human approved a specific visual design; layout fixes must be invisible. If you need a visual change, ask first.

## 6. Design principles (when in doubt)

- **Calm, dark, modern.** Background near-black `#0e0e10`, surfaces `#18181b`, accent a single muted color (e.g. `#5b8def`). Subtle borders, generous padding, no gradients, no drop shadows beyond a hint.
- **Tiny feature surface.** If a feature isn't in PLAN.md's MVP, put it in `ROADMAP.md` and leave it out.
- **Deterministic export.** The same layout must always produce the same export byte-for-byte (stable key order). This makes diffs readable.
- **Crash-proof inputs.** Empty labels, zero-size elements, off-canvas positions — none of these may crash the app or produce malformed export.
- **Readable for a downstream LLM.** The export's primary audience is another AI. Prefer explicit, verbose field names over compact ones.

## 7. The export contract (summary — full spec in `docs/EXPORT_FORMAT.md`)

Each placed element exports to one JSON object with **at minimum**:
```
{ "type", "id", "label", "x", "y", "width", "height", "relX", "relY",
  "relWidth", "relHeight", "comment" }
```
- `rel*` fields are percentages of the canvas dimension (so a downstream agent can adapt to a different target window size).
- The reference background image is **never** exported — it is a visual guide for the human only.
- Top-level export object also records `canvasWidth`, `canvasHeight`, `windowWidth`, `windowHeight`, `gridSize`, `snapEnabled`, and a `generatedAt` ISO timestamp.

## 8. Testing posture (MVP)

No test framework in MVP. Correctness is verified manually + by the "done when" checklists in PLAN.md. Do not add a test runner until ROADMAP phase; if you do, use Node's built-in `node:test`.

## 9. How to communicate with the human

- Ask only **human-answerable** questions (features, preferences, wording, colors). Never ask the human to pick a library, a data structure, or a pattern — that's your job.
- Before asking, check this file, PLAN.md, and ROADMAP.md — the answer may already be pinned.

## 10. Done definition for any task

A task is "done" when **all** of these are true:
1. The code is written, in English, with no unnecessary comments.
2. `npm run lint` (if available) passes with no new warnings.
3. `npm start` opens the app and the new behavior works by clicking, not typing.
4. The changed file paths match the structure in §4.
5. If the export schema was touched, `docs/EXPORT_FORMAT.md` is updated to match.
6. You wrote a one-line summary of what changed and what the human should now test by clicking.