# Architecture

How CapyReporter is put together. Three independent pieces talk over HTTP and IPC only — no stdin, no shared state.

```
┌────────────────────────┐  HTTP  ┌──────────────────────────┐
│  DSH host (Node)       │◀──────▶│  Browser page (DSH Web)  │
│  lib/index.js          │        │  lib/client.js           │
│  • activity tracking   │        │  • in-page overlay       │
│  • /dsh-capyreporter/* │        │  • Settings page         │
└───────────┬────────────┘        └──────────────────────────┘
            │ spawns (electron.exe main.js)
            ▼
┌────────────────────────┐
│  runtime/electron-     │
│  helper  (always-on-   │
│  top transparent win)  │
└────────────────────────┘
```

## Host half (`lib/index.js`)

An ordinary Cordis plugin module: `export { name, inject, apply }` with `inject: ['webServer']`.

- **Activity pipeline.** Listens to the host events `agent/status` (running ⇄ idle per agent), `session/event` (every appended log event) and `session/disposed`. Per session it keeps:
  - `outText` — a rolling window (~600 chars) of streamed assistant text; `delta`/`chunk` payloads **append**, whole-message payloads **replace**;
  - `log` — trajectory step lines (`🔧 pwsh`, `💭 writing…`, `🧭 steering`, `🚀 workflow`, `⚠️ error`…) summarised by `stepLineOf()`, capped at 16.
- **Workspace resolution.** `workspaceRegistry.list()` is cached as `path → title` and re-fetched lazily; the bubble header prefers the **workspace name** over the generated session title.
- **HTTP surface** (one `webServer` prefix route, CORS `*`, no cache):

| Endpoint | Purpose |
| --- | --- |
| `GET /image` | current pet PNG (uploaded or default), raw bytes |
| `POST /image` | replace pet art (`{dataUrl}`), persisted |
| `POST /reset` | clear custom art |
| `POST /enabled` | show/hide the pet (also stops/starts the desktop window) |
| `POST /dismiss` | dismiss the completion notification |
| `POST /scale` | pet size multiplier |
| `POST /desktop/hide` · `/desktop/show` | disable / enable the always-on-top window |
| `GET /activity` | `{running:[{title, preview, lines, ageMs}], runningCount, completed}` |
| `GET /state` | `{enabled, hasCustom, desktop, desktopEnabled, scale}` |

- **Persistence.** Preferences live in `$DSH_HOME/capyreporter.json` (written after every mutation; falls back to the legacy `homura-pet.json` on first read).

## Client half (`lib/client.js`)

Registers through the DSH client module loader:

```js
window.__ModuleLoader__.load({ id: 'dsh-capyreporter', factory: makeFactory() })
```

The factory `(require) => ({ name, inject: ['slots'], apply })` gets React via `require('react')`; CSS is injected with a hand-rolled `<style data-plugin-css>` tag. `apply` registers two slots:

- `shell.overlay` → the floating capybara (hidden while the desktop window is running, and while disabled);
- `settings.section` → the 🐾 CapyReporter settings page.

All state comes from polling the host routes with `fetch` (`/activity` every 1.2s, `/state` every 2.5s) — no server push, no page globals beyond the module loader.

## Desktop helper (`runtime/electron-helper/`)

- **main.js** spawns one `BrowserWindow`: `transparent`, `frame: false`, `alwaysOnTop: 'screen-saver'`, `skipTaskbar`, non-resizable, no shadow. Click-through by default (`setIgnoreMouseEvents(true, { forward: true })`); the renderer flips interactive mode while the pointer is over the pet. Topmost is re-asserted on `blur` and on a 2s interval — required on Windows, where non-focusable topmost windows get demoted.
- **preload.js** exposes only `petBridge.setInteractive / openSite / dragStart / dragEnd / resize`.
- **renderer.js** polls `/activity` + `/state`, renders the bubble (compact ↔ expanded step log), and opens DSH on **double-click** — a single click stays inert so a stray click or a barely-moving drag can't launch a browser. Right-click offers restore bubble / open DSH / hide desktop pet. Dragging is delegated to the main process, which follows the OS cursor (`screen.getCursorScreenPoint`) — coordinates a moving window cannot perturb.

## Invariants

- Every side effect is registered through `ctx.effect` / `ctx.on` / `slots.inject` so stop/update disposes cleanly.
- `scripts/check-bom.mjs` runs on `prepack` and in CI: no file may ship with a UTF-8 BOM (a BOM'd `package.json` breaks DSH's manifest `JSON.parse`).
- `scripts/verify.mjs` is the local smoke check for the bundle shape.
