# Changelog

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
