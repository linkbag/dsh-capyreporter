# Changelog

## 0.1.3 (2026-09-09)

- **Fix: the pet no longer sinks.** On Windows with fractional display scaling, every redundant `setBounds` round-trip rounded the window position a pixel further down — and the renderer re-issued a resize on every poll tick, so the pet visibly sank a little each second. The renderer now only calls resize when the computed size actually changed, and the main process skips `setBounds` when the size is unchanged.

## 0.1.2 (2026-09-02)

- **Fix: drag tracking.** The floating pet now uses pointer capture and holds the window interactive for the whole drag — fast cursor movements no longer break the drag trail. Adds `pointercancel` handling and `touch-action: none`.
- **Compatibility: DeepSeek Harness 0.1.2-rc.1.** Audited the 0.1.2-rc.1 packages directly: `window.__ModuleLoader__.load`, webServer `prefix` routes, slots `inject`, and the `workspaceRegistry` / `sessions` / `sessionTitle` services are all unchanged. Peer dependencies widened to accept 0.1.2-rc.1 and later (`^0.1.1-rc.2 || >=0.1.2-0`).

## 0.1.1 (2026-09-02)

- **Fix: stripped UTF-8 BOMs** from shipped files — DSH's manifest reader does a plain `JSON.parse` and a BOM'd `package.json` killed `dsh plugin` installs on other machines.
- Added `scripts/check-bom.mjs` as a **pre-publish guard** (`npm prepack` + CI now fail the build if any package file carries a BOM), so this class of bug can't ship again.

## 0.1.0 (2026-09-02)

Initial public release.

- Always-on-top transparent capybara window (Electron), with an in-page overlay fallback.
- Speech bubble narrates each trajectory step (`🔧 tool`, `💭 writing…`, `🧭 steering`, `🚀 workflow`, `⚠️ errors/retries`) in a scrollable log.
- Compact ↔ expanded bubble: single click expands, double-click dismisses, right-click → restore.
- Project-aware headers: the bubble names the workspace the run belongs to.
- Completion alerts that stay visible while you work elsewhere; click the pet to return to DSH.
- Replaceable pet art (upload any transparent PNG), wheel-resize, Settings page, uninstall.
- Bilingual README (EN / 中文), MIT license.
