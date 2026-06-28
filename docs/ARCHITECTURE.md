# Architecture

AutoCanva is a classic two-process Electron app with a deliberately small surface. There is **one** data structure in memory and **one** place it lives on disk.

## Processes

```
┌──────────────────────────────────────────────────────────────┐
│  Main process (Node)        src/main/main.js                 │
│  - Creates one BrowserWindow                                 │
│  - Owns the file dialog + disk read/write (File System API)  │
│  - Answers IPC: save / loadProject / loadImagePath           │
└───────────────┬──────────────────────────────────────────────┘
                │  contextBridge (preload.js — safe surface only)
                │  NO Node APIs leak to the renderer.
┌───────────────▼──────────────────────────────────────────────┐
│  Renderer process (web)   src/renderer/renderer.js           │
│  - Owns the canvas, the drag engine, the toolbar, the export. │
│  - Holds the single store (store.js) in module scope.        │
│  - Talks to disk ONLY via the preload bridge.                │
└──────────────────────────────────────────────────────────────┘
```

## The single source of state

The whole app state is one plain object, kept in `src/renderer/store.js`:

```js
{
  windowWidth: 1280,
  windowHeight: 720,
  canvasWidth: 800,
  canvasHeight: 600,
  gridSize: 20,
  snapEnabled: true,
  zoom: 1,                       // display scale 0.1–5, affects DOM only
  backgroundImagePath: "",        // info only — image bytes are NOT stored/exported
  backgroundOpacity: 0.7,
  elements: [
    {
      id: "btn_01",
      type: "button",              // button | text | image | rect | icon
      label: "Save",
      x: 120, y: 80,
      width: 96, height: 32,
      comment: "",                 // free text from the user
      // relX, relY, relWidth, relHeight are derived at export time, never stored
    }
  ]
}
```

- Mutations go through small helper functions in `store.js` (e.g. `addElement`, `moveElement`, `removeElement`).
- Every mutation calls `persist()` which, through the preload bridge, **auto-saves** to the last opened `.autocanva` file. The last-used path is remembered by `electron-store` (or a tiny `recent.json`).
- On startup the app reads the last path and restores; if none, it starts blank.

## Data flow for one drag

1. User presses mouse on an element → `renderer.js` records the grabbed id and offset.
2. `mousemove` updates the element's `x/y`, optionally snapping to `gridSize` when `snapEnabled`.
3. On `mouseup` (or live, debounced), `store.moveElement(id, x, y)` runs and `persist()` writes to disk.
4. The canvas DOM is re-validated: elements are clamped to `0..canvasWidth` and `0..canvasHeight`; negative or zero sizes are rejected.

## Data flow for reference image loading

1. User clicks **Load reference…** button → `renderer.js` calls `window.autocanva.pickImage()`.
2. Main process opens a native file dialog filtered to image types; returns the file path as a `file://` URL and the file name.
3. Renderer creates a temporary `Image` object, sets its `src` to the URL.
4. On `img.onload`, the image's `naturalWidth` / `naturalHeight` are read.
5. Canvas dimensions are resized to match (capped at 4000px), clamping existing elements to the new bounds.
6. The background image is then set on the visible `<img>` inside the canvas, and a toast confirms the resize.
7. If the image fails to load (corrupted file, unsupported format), the background is still set but canvas size stays unchanged; a toast warns the user.

## Zoom

- The canvas dimensions are multiplied by `state.zoom` (default `1`, range `0.1`–`5`) in the DOM, so all elements, grid lines, and the background image scale uniformly.
- Element `x`, `y`, `width`, `height` in `store.state` always remain in **canvas coordinates** (unscaled). Only the DOM rendering multiplies by `zoom`.
- **Ctrl+scroll wheel** over the canvas changes zoom in 0.1 steps.
- **Ctrl+0** (or Cmd+0) resets zoom to 1.0 (100%).
- The zoom percentage is displayed in the toolbar next to the Export button.
- Drag calculations divide mouse coordinates by `zoom` so dragging works correctly at any zoom level.
- Because the canvas DOM size is scaled, the scroll container (`#canvasWrap`) naturally shows scrollbars when zoom > 1.25× or so, and centers the canvas via flexbox when zoom < 1.

## Data flow for export

1. User clicks **Export**.
2. `renderer.js` calls `store.exportData()`.
3. For each element, `rel*` percentages are computed: `relX = round(x / canvasWidth * 100, 2)` etc.
4. A top-level object is built (see `EXPORT_FORMAT.md`) with a fixed key order so the output is deterministic given the same state.
5. The exporter writes `generatedAt` last, and the result is the only place that timestamp appears — diffs stay noise-free when nothing else changed.
6. The JSON string is placed on the clipboard **and** offered as a "Save .json" file dialog. Clipboard is the primary path because that's what the user pastes into their AI chat.

## Security model

- `contextIsolation: true`, `nodeIntegration: false` — always.
- `preload.js` exposes a **single** object `window.autocanva` with only: `saveProject`, `loadProject`, `pickImage`, `loadRecent`, `saveExportTo`. No `fs`, no `path`, no arbitrary file access.
- File dialogs are always native and always the user picking explicitly — the app never writes outside the chosen path.
- Background images are referenced by a `file://` URL constructed by the main process and sent as a string; the renderer never sees a raw absolute path in state that gets persisted (store stores nothing about the image bytes).

## Persistence detail

- `.autocanva` files are **JSON** with the project shape above, plus an `appVersion` field and a `schemaVersion: 1`.
- Unknown keys on load are ignored, not crashed. Missing keys are defaulted.
- Future schema changes follow append-only + a migration step in `loadProject`; `schemaVersion` lets us tell old files from new without guessing.

## What intentionally does NOT exist

- No server, no network, no telemetry, no auto-update (MVP).
- No multiple windows, no tabs, no undo tree (keep MVP small); basic undo/redo isedIn ROADMAP.
- No test runner until ROADMAP.