# PLAN.md — AutoCanva build plan

> Read `AGENTS.md` first. Follow the phases **in order**. Each phase has a **"Done when"** checklist; do not move on until every box is checked. Each phase is independently runnable (`npm install && npm start` must keep working after every phase).

The human is **not a programmer**. After every phase the only thing they should ever do is **double-click / run the app and click around**. All setup commands (npm install, etc.) are run by you, the agent, never printed as "instructions for the human".

Conventions used below:

- `▶ ACTION` = something you do to the code.
- `✓ CHECK` = something the human verifies by clicking in the running app.
- `🧪 SELF-TEST` = something you verify with Node/a quick script so the human doesn't have to.

---

## Phase 0 — Project bootstrap & "hello window"

**Goal:** an empty Electron window opens when you start the app. Nothing else.

▶ ACTION
1. Confirm `package.json` exists (it does) and run `npm install`. This pulls Electron and eslint locally.
2. Create `src/main/main.js`:
   - create a `BrowserWindow` 1280×800, `minWidth/minHeight 800×600`,
   - `webPreferences`: `contextIsolation: true`, `nodeIntegration: false`, `preload: path.join(__dirname, '..', 'preload', 'preload.js')`,
   - load `src/renderer/index.html`.
   - on Windows, no application menu (or a minimal `File` menu with a single "Quit" for now). Keep it minimal.
3. Create `src/preload/preload.js` exposing an empty `window.autocanva = {}` (no methods yet) so the bridge exists from day one.
4. Create `src/renderer/index.html` — empty dark page with a centered title "AutoCanva".
5. Create `src/renderer/styles.css` — set the CSS variables (see "Style tokens" below) and apply base body styling: `background: var(--bg)`, `color: var(--fg)`, system font stack, no margin.
6. Create `src/renderer/renderer.js` — empty stub that just logs "renderer ready".

**Style tokens** (put in `:root` of `styles.css`, used everywhere):
```css
:root{
  --bg:#0e0e10; --surface:#18181b; --surface-2:#1f1f23;
  --border:#27272a; --fg:#e4e4e7; --muted:#a1a1aa;
  --accent:#5b8def; --danger:#ef4444;
  --radius:8px; --space:8px;
}
```

✓ CHECK: run `npm start`. A dark window opens, 1280×800, titled "AutoCanva", no white flash. Closing it quits the app.
🧪 SELF-TEST: `npm run lint` runs without crashing (eslint config absent? → skip silently per AGENTS.md §5 rule 6).

**Done when:**
- [ ] `npm install` completed.
- [ ] `npm start` opens a dark window with the title.
- [ ] No Node integration in renderer (verify in `main.js`).
- [ ] `preload.js` exists and exposes `window.autocanva`.

---

## Phase 1 — Canvas + size fields + grid

**Goal:** a fixed-size canvas (a `<div>` with a visible border) sits in the window. Two number inputs let the user change **window size** and **canvas size**. A grid toggle draws a grid of `gridSize` (default 20px) over the canvas using a CSS background or an injected element grid.

▶ ACTION
1. `index.html`: a top **toolbar** (`<header class="toolbar">`) with grouped controls:
   - "Window size" → two `<input type="number" min="320">` labelled W / H wired to `windowWidth/Height`.
   - "Canvas size" → two inputs for `canvasWidth/Height`.
   - "Grid size" → one input (default 20) + a checkbox "Snap" + a checkbox "Show grid".
   - Each change re-renders the canvas; window-size changes call `window.setSize()` via main only if user clicks a "Apply window size" button (changing the real OS window live can be jarring; keep it explicit).
2. The **canvas** element (`<div id="canvas">`): width/height from state, `background: var(--surface)`, 1px `--border` inset, centered, overflow hidden, `position: relative`.
3. Grid rendering: when "Show grid" is on, set `canvas.style.backgroundImage` to two repeating linear-gradients at `gridSize` spacing in a subtle `rgba(255,255,255,0.04)`. (Pure CSS, no canvas/perf cost.)
4. Keep the **in-memory state** in a new `src/renderer/store.js` exporting a singleton `state` plus `render()` that re-applies sizes & grid. `renderer.js` calls `store.render()` whenever an input changes.
5. Add `clampedSize(value, min=1, max=4000)` helper; reject NaN/empty by reverting to previous value. Never let zero or negative sizes pollute state.

✓ CHECK: change canvas size, the box resizes. Toggle grid on/off lines appear/disappear. Toggle Snap (no effect yet since no elements). Window-size fields accept sane numbers and refuse 0/nonsense.
🧪 SELF-TEST: a tiny `node -e` script importing the clamp helper path returns `4000` for `clampedSize(-5)`, `1` for `clampedSize(0)`, `999` for `clampedSize(999)`.

**Done when:**
- [ ] Canvas size inputs change the canvas.
- [ ] Grid toggle shows/hides grid; grid size input changes spacing.
- [ ] Snap checkbox persists in state.
- [ ] Zero/negative/empty inputs can never crash the layout.

---

## Phase 2 — Load reference image as background

**Goal:** a button "Load reference…" opens a native file dialog; the chosen image becomes the canvas background at a chosen opacity. Image is visual-only.

▶ ACTION
1. Toolbar: "Load reference…" button. Plus an "Opacity" range input (default 0.7) and a "Clear reference" button.
2. `preload.js`: add `pickImage()` → returns via IPC to main, main shows `dialog.showOpenDialog`, picks an image file, returns a `file://` URL string. Add `loadImagePath()` returning the URL to set on the canvas.
3. `main.js`: IPC handler `dialog:pickImage` returns `{ url, name }` or `null` if cancelled. Keep `name` only for a small label like "Reference: profile.png"; never store path in state that gets persisted.
4. `renderer.js`: on pick, set `canvas.style.backgroundImage = url(...)` layered ABOVE the grid? No: background-image should be the image; the grid (Phase 1) used `backgroundImage` too — now combine: keep grid via a **separate overlay `<div class="grid-overlay">`** above the image. Re-do Phase 1's grid as an overlay element so the image can be the base background.
5. Opacity slider sets `.grid-overlay`? No — opacity controls the **image**. Use a wrapper: the canvas has the image as `background-image`; an `::after` or overlay div with the grid lines sits at opacity 1. The **image** opacity is realized by layering a semi-transparent black `::before` over it controlled by `--img-opacity` (so the grid stays crisp). Simpler: put image inside an `<img class="bg">` absolutely positioned, set its `opacity`. Grid overlay on top. Pick whichever is simplest; keep it one file.
6. "Clear reference" empties the background image and the label.

✓ CHECK: load an image, it shows behind the grid. Change opacity, image dims. Clear removes it. Reload app with no image, background is plain surface.
🧪 SELF-TEST: cancel the file dialog → no error, no leftover state.

**Done when:**
- [ ] Image loads from a native dialog.
- [ ] Opacity slider dims the image only (grid stays visible).
- [ ] Clear reference works.
- [ ] No absolute path is written to any state that gets persisted (state stores `backgroundImagePath: ""` always; the URL is ephemeral per session — OR store just the filename for the label).

---

## Phase 3 — Add & select elements (no drag yet)

**Goal:** a "toolbox" lets the user add the 5 element types. Clicking an element selects it (outline highlight). Deleting with the Delete key removes it.

▶ ACTION
1. Left side: a vertical **toolbox** (`<aside class="toolbox">`) with 5 buttons: Button, Text, Image, Rectangle, Icon. Each click adds a default-sized element at canvas center.
   - Defaults: button 96×32, text 120×28, image 128×128, rect 160×80, icon 48×48. All placed centered then offset by +12px per duplicate so they don't stack exactly.
2. Each element is a `<div class="el el--<type>">` absolutely positioned in the canvas, showing `label` (or a type hint for image/rect/icon). Default labels: Button→"Button", Text→"Text", Rectangle→none (just the box), Image→none (dashed box with "image" hint), Icon→an emoji glyph prompt (default "★").
3. `store.addElement(type)` pushes to `state.elements` with an auto `id`. `store.removeElement(id)` filters. `store.select(id)` sets `state.selectedId`.
4. Selection: clicking a `.el` selects it (adds `.el--selected` with an accent outline). Clicking empty canvas deselects. Delete/Backspace removes selected (but only when focus is the canvas, not an input).
5. Do NOT implement dragging yet.

✓ CHECK: each toolbox button drops a new element. Clicking selects with an outline. Pressing Delete removes it. Clicking empty space deselects.
🧪 SELF-TEST: ids are unique; adding/removing keeps them unique.

**Done when:**
- [ ] All 5 types add correctly.
- [ ] Selection + keyboard delete works.
- [ ] Empty label / zero-size can't be produced by these defaults.

---

## Phase 4 — Drag engine + snap

**Goal:** drag any element with the mouse; with Snap on, movement locks to `gridSize`. Drag is clamped inside the canvas.

▶ ACTION
1. On `mousedown` on a `.el` (not the label-editing area): record `dragId`, the element's current x/y, and the cursor offset within it.
2. `window.mousemove`: compute new `x = clientX - canvasRect.left - grabDX`, `y = clientY - canvasRect.top - grabDY`.
   - If `snapEnabled`: `x = Math.round(x / gridSize) * gridSize`, same for y.
   - Clamp: `0 ≤ x ≤ canvasWidth - width`, same for y/height.
   - Live-update the DOM (`style.left/top`) for responsiveness.
3. `mouseup`: commit final x/y to `store.moveElement`, then `persist()`.
4. Only one drag at a time. Ignore mousedowns on inputs/labels-edit mode.
5. Touch not required (Windows desktop). If trivial to add, add; otherwise ROADMAP.

✓ CHECK: drag smoothly. With snap on and grid 20, elements land on grid lines. Can't drag outside canvas. Releasing saves (visible because next session reopens same positions — once persistence exists; for now just no crash).
🧪 SELF-TEST: a 1×1 element at canvas corner clamps so its right/bottom edge never exceeds canvas size.

**Done when:**
- [ ] Dragging works for all 5 element types.
- [ ] Snap + clamp behaviors are correct.
- [ ] Drag releases commit to state.

---

## Phase 5 — Element editing panel + persistence

**Goal:** a right-side **properties panel** edits the selected element's `label`, `width`, `height`, `comment`, and `type` (change type among the 5). Plus, **auto-save** to the last `.autocanva` file and **reopen last file** on launch.

▶ ACTION
1. Right side: `<aside class="panel">`. Shows "No selection" or, for selection:
   - Type dropdown (button/text/image/rect/icon).
   - Label text input.
   - X / Y / W / H number inputs (so a user can be precise without dragging).
   - Comment textarea.
   - "Duplicate" and "Delete" buttons.
2. `store` mutations `setElementField(id, field, value)` etc.; every mutation calls `persist()` (debounced 400ms).
3. `preload.js` exposes `saveProject(data)`, `loadProject()`, `pickProjectPath()`, `loadRecent()`. `main.js` uses `electron-store` (preferred) to remember the last project path; the project file content is the JSON of `state` minus ephemeral image URL, plus `appVersion` and `schemaVersion: 1`.
4. On launch: `loadRecent()` returns the last path; if present, read & restore; else blank state. The user should also be able to do **File → New** and **File → Open…** and **File → Save As…** from a minimal menu — but auto-save is the daily flow.
5. `backgroundImagePath` saved as the **filename only** (not absolute path) — purely so the label persists. Image not reloaded across sessions (acceptable MVP; user re-loads). Or load it if you can resolve from a remembered directory — keep simple: filename-only, user re-picks. Document this in README.

✓ CHECK: edit label/x/y/w/h/comment and the canvas updates. Close the app, reopen → elements, sizes, grid, comment all return. Change comment → on reopen it's still there.
🧪 SELF-TEST: corrupt a `.autocanva` JSON by hand → app opens with a blank state and a non-blocking toast "Project file unreadable, started blank", never throws.

**Done when:**
- [ ] All fields edit correctly.
- [ ] Auto-save round-trips across restarts.
- [ ] Corrupt file does not crash.
- [ ] File menu has New / Open / Save As.

---

## Phase 6 — Export

**Goal:** an **Export** button produces the canonical JSON (see `docs/EXPORT_FORMAT.md`) and puts it on the clipboard + offers Save As `.json`.

▶ ACTION
1. Toolbar: "Export" button (accent-styled).
2. `store.exportData()`:
   - Build the top-level object with **ordered keys** using an explicit array of `[key,value]` pairs → `Object.fromEntries` is fine but **verify insertion order** by serializing with a custom replacer or by string-building in the documented order. Simplest: build a fresh object key-by-key in the order shown; V8 preserves insertion order for string keys.
   - For each element, compute `relX = (x / canvasWidth * 100)`, 2 decimals, emit as **string** `"15.00"`.
   - Clamp x/y/w/h defensively before emit.
   - Set `generatedAt = new Date().toISOString()` **last**.
3. Copy to clipboard: `navigator.clipboard.writeText(json)`. Show a toast "Copied to clipboard".
4. Also open a Save dialog to write the JSON to a `.json` file (optional use; clipboard is primary).
5. Make output deterministic except `generatedAt`: same state → identical string otherwise.

✓ CHECK: arrange a couple of elements, click Export, the JSON appears on clipboard; paste into a text file and compare to `EXPORT_FORMAT.md` example structure. Re-export without changes → everything identical except the timestamp.
🧪 SELF-TEST: a Node script loads `sample.autocanva`, calls the export function path (export a pure `buildExport(state, now=Date)`), and asserts the key order matches the doc, rel values are 2-decimal strings, and timestamp is the only difference between two runs.

✓ INCLUDE a "Copy prompt" secondary button: copies the export **wrapped** with the "Downstream agent quick guide" text from EXPORT_FORMAT.md so the user just pastes once and the agent has everything. (Tiny, very high value — keep.)

**Done when:**
- [ ] Export JSON matches the schema byte-for-byte (minus timestamp).
- [ ] Clipboard works.
- [ ] Save As `.json` works.
- [ ] "Copy prompt" includes the agent quick guide.

---

## Phase 7 — Polish, a11y, hardening

**Goal:** the app feels finished and never crashes on bad input.

▶ ACTION
1. **Keyboard:** Esc deselects, arrows nudge 1px (Shift = grid step), Delete removes, Ctrl+D duplicates, Ctrl+C copies element as JSON-fragment to a clipboard-staging area (nice-to-have; if risky skip).
2. **Toasts:** small bottom-center notification component for "Saved", "Exported", "Image too large, scaled", etc. Auto-dismiss 2.5s.
3. **Empty states:** no reference image → faint hint text "Load a reference image to start". No elements → pulsing arrow to toolbox.
4. **Image fit:** if loaded image is bigger than canvas, scale to fit within canvas keeping aspect (background-size: contain), never distorted. If smaller, center it. Tell the user via toast if it was scaled.
5. **Min sizes:** ensure no element renders below 8×8 (clamp on edit and on import).
6. **Responsive window:** the layout adjusts (toolbar wraps, panels collapse under a min width) so resizing the OS window doesn't break the UI.
7. **English check:** every single user-visible string is English.
8. Final pass against AGENTS.md §10 "Done definition".

✓ CHECK: throw every odd input you can at it (0 widths, letters in number fields, deleting while typing, loading a non-image as reference — main must reject by mime extension allowlist). No crash.
🧪 SELF-TEST: run `npm start`, walk every checklist above; run `npm run lint`; run the export self-test script again.

**Done when:**
- [ ] All Phase 7 items implemented.
- [ ] No known crash path.
- [ ] Strings all English.
- [ ] `npm run lint` clean (if configured).
- [ ] `npm install && npm start` works from a clean clone.

---

## Phase 8 — Thinking about GitHub (you do this, not the human)

This phase is **agent-side**: produce a clean repo the human can push.

▶ ACTION
1. Ensure `.gitignore`, `LICENSE`, `README.md`, `AGENTS.md`, `PLAN.md`, `docs/`, and `examples/sample.autocanva` exist and are correct.
2. Provide an `examples/sample.autocanva` with 2-3 elements matching the example export in `EXPORT_FORMAT.md` so the export self-test has a fixture.
3. Make sure `node_modules/` is ignored (it is).
4. Write a `CONTRIBUTING.md`? No — out of MVP scope. Skip; keep repo lean.
5. Suggest the human create the GitHub repo (do **not** run `gh repo create` unless the human explicitly says to — they may want a private repo / specific name). Hand them the exact git commands in the chat response, but they are 3 lines and the human runs them once via double-clicking a provided `.bat`? No — per AGENTS rule 8, avoid terminal for the human. Instead, give the human a **one-click `setup-git.bat`** in the repo they can double-click that sets up git and offers to create the repo with `gh`. (This is allowed: it's a one-time repo bootstrap, not daily usage.)

✓ CHECK (human): double-click `setup-git.bat`; follow prompts; the repo is on GitHub.
🧪 SELF-TEST: `git status` clean after running.

**Done when:**
- [ ] Repo is committed and pushed.
- [ ] README renders on GitHub.
- [ ] `examples/sample.autocanva` exists.

---

## Phase 9 — (Later) Package to `.exe`

Deferred to ROADMAP Tier 2. Do NOT do this in the first build pass unless the human asks. The MVP ship target is `npm start`.

---

## Anti-patterns to refuse (say no to the human politely)

- "Let's add tabs for multiple screens" → ROADMAP Tier 4. MVP = single canvas.
- "Let's use React" → AGENTS §3 forbids without written approval.
- "Let's crop the reference image and export it" → ROADMAP Tier 4, breaks the image-never-exported rule, opt-in only.
- "Let's add themes" → ROADMAP "out of scope forever".
- Adding any export field that changes/removes an existing one → AGENTS §5 rule 5.

You are allowed — encouraged — to push back with a one-line "that's roadmap, kept out of MVP" rather than implementing.