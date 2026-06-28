# Export Format — canonical contract

> ⚠️ This file is a contract with downstream coding agents. **You may ADD fields, you may NOT rename or remove existing fields** without explicit human approval (see AGENTS.md §5 rule 5). Downstream agents may have old exports cached and assume this shape.

The export is a single JSON object. Top-level keys are emitted in this exact order so two exports of the same layout produce byte-identical text (only `generatedAt` changes).

## Top-level object

```jsonc
{
  "app": "autocanva",
  "schemaVersion": 1,
  "generatedAt": "2026-01-01T00:00:00.000Z", // ISO 8601 UTC, set last
  "canvas": {
    "windowWidth": 1280,
    "windowHeight": 720,
    "canvasWidth": 800,
    "canvasHeight": 600,
    "gridSize": 20,
    "snapEnabled": true
  },
  "elements": [ /* see below, ordered by insertion (stable) */ ]
}
```

- `app` — always the literal `"autocanva"`. Lets a downstream agent detect the format instantly.
- `schemaVersion` — integer, currently `1`. Bump only on a breaking change (which is forbidden without approval anyway).
- `generatedAt` — ISO string. The ONLY non-deterministic field. Always emitted last so element diffs stay clean.
- `canvas` — the design surface config the user had set. `windowWidth/Height` is **the size the user is targeting for the real UI window**; `canvasWidth/Height` is **the size of the design area inside AutoCanva**. Agents should map element `rel*` onto the target window size, not the canvas size.

## Element object

Each entry in `elements` is ordered exactly as the user placed them (insertion order; never re-sorted on export).

```jsonc
{
  "type": "button",           // button | text | image | rect | icon
  "id": "btn_01",             // stable per-element id, unique within one export
  "label": "Save",            // visible text; may be "" for image/rect/icon
  "x": 120,                   // px from canvas left
  "y": 80,                    // px from canvas top
  "width": 96,                // px
  "height": 32,               // px
  "relX": 15.00,              // x / canvasWidth  * 100, 2 decimals
  "relY": 13.33,              // y / canvasHeight * 100, 2 decimals
  "relWidth": 12.00,          // width  / canvasWidth  * 100
  "relHeight": 5.33,          // height / canvasHeight * 100
  "comment": "primary action, blue background"
}
```

Field rules:

- **type** — one of the five allowed strings. Downstream agents MUST treat unknown types as "a generic rectangular region labelled `label`" rather than crashing.
- **id** — string, never reused within one export. Used so an agent (or the user) can reference specific elements in follow-up chat. Auto-generated as `type + "_" + 2-digit counter` by default; user-set ids are honored if unique.
- **label** — the human-visible text. For `image`/`rect`/`icon` may be `""`; `comment` then carries the intent.
- **x, y, width, height** — integers ≥ 0. `x` ranges `0..canvasWidth`, `y` ranges `0..canvasHeight`. Exporters MUST clamp on emit so an agent never sees off-canvas values.
- **relX, relY, relWidth, relHeight** — floats, 2 decimals, %% of the **canvas** (NOT the target window). An agent maps them to its target window as `targetX = round(relX/100 * targetWindowWidth)`. This is what makes layouts survive different target sizes.
- **comment** — free text the user typed per element. May be `""`. Never auto-filled. The first thing an agent should read after `type`/`label` to understand intent.

### Ordering and determinism

- Elements: insertion order, stable.
- Keys within top-level and within each element: the exact order shown above. Implement the exporter with an array of `[key, value]` pairs, not `JSON.stringify` of an arbitrary object, so key order is guaranteed across engines.
- Numbers: integers stay integers; `rel*` use exactly 2 decimals (`toFixed(2)` then parse back to number so JSON shows `15.00` -> `15`? — see note).

> **Note on `rel*` decimals:** emit them as **strings with 2 decimals** (e.g. `"15.00"`) to keep stable, zero-padded output and to avoid JSON engines dropping trailing zeros. Downstream agents parse with `Number(...)`. This is the only string-where-a-number-would-be field; documented here so agents don't trip on it. (If a future schemaVersion needs true numbers, bump to v2 — not allowed without approval.)

## What is NEVER in the export

- The background reference image — bytes, path, or filename. It is a visual aid only.
- Any absolute local file path.
- Any environment, username, machine, or time-zone info beyond `generatedAt` (which is UTC and impersonal).
- Auto-save metadata (last saved path, etc.) — that is app state, not export state.

## Example minimal export

```json
{
  "app": "autocanva",
  "schemaVersion": 1,
  "generatedAt": "2026-01-01T00:00:00.000Z",
  "canvas": {
    "windowWidth": 1280,
    "windowHeight": 720,
    "canvasWidth": 800,
    "canvasHeight": 600,
    "gridSize": 20,
    "snapEnabled": true
  },
  "elements": [
    {
      "type": "button",
      "id": "btn_01",
      "label": "Save",
      "x": 120,
      "y": 80,
      "width": 96,
      "height": 32,
      "relX": "15.00",
      "relY": "13.33",
      "relWidth": "12.00",
      "relHeight": "5.33",
      "comment": "primary action, blue background"
    },
    {
      "type": "rect",
      "id": "rect_01",
      "label": "",
      "x": 0,
      "y": 0,
      "width": 800,
      "height": 60,
      "relX": "0.00",
      "relY": "0.00",
      "relWidth": "100.00",
      "relHeight": "10.00",
      "comment": "top app bar"
    }
  ]
}
```

## Downstream agent quick guide (paste this with the export)

1. Treat each element's `relX/relY/relWidth/relHeight` as **percentages of the target window** the user gave you.
2. Compute pixel positions as `round(value/100 * targetDimension)`.
3. Render the element. Use `type` for semantics (button is interactive, rect is a container, image needs an `<img>` placeholder, icon is a small glyph, text is non-interactive copy).
4. Read `comment` for any per-element nuance. Read `label` for the visible text.
5. Do not assume the reference screenshot; it is not included. Place blind, by coordinates only.