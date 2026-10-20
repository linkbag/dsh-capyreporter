# Changelog

## 0.1.6 (2026-10-19) — audit hardening + latest-DSH compatibility

- Re-verified against DeepSeek Harness 0.2.1-alpha.1: `webServer` prefix routes, `slots.inject`/`register`, the combo client-bundle contract (`exports["./client"]`), and the `agent/status`, `agent/disposed`, `session/event`, `session/disposed` payloads still match. Removed the obsolete `@deepseek-ai/dsh-client-runtime` client inject/peer, added the `@deepseek-ai/dsh` peer, and bumped the version.
- Consume real nested DSH events, retain token spacing, and distinguish authoritative turn outcomes from idle. Preserve unread results independently across parallel sessions and seed already-running agents on activation.
- Reject cross-origin/non-loopback reads, GET mutations, malformed/aborted/oversized JSON and non-PNG/unbounded artwork. Remove wildcard CORS. Save settings atomically with visible failures. Browser authorisation accepts Chromium's `sec-fetch-site: same-origin` fetch metadata when a strict referrer policy strips Origin/Referer; cross-site, same-site and opaque requests remain rejected.
- Isolate activation state, subscriptions and child lifecycle. Derive the actual host port, scrub child environment secrets (keeping common OS variables case-insensitively), require desktop readiness/heartbeat before suppressing the page, and await shutdown. A cold Electron start gets a 60 s grace period; 20 s once a heartbeat proves liveness.
- Sandbox the desktop renderer, restrict CSP/navigation/permissions, validate IPC sender's main frame, and proxy an explicit request allowlist through Electron main with a private capability.
- Fix image replacement cache keys, async settings/poll races, portrait sizing feedback, secondary-display resize anchors, and preserve same-size/fractional-DPI and OS-cursor drag fixes. The helper re-anchors its window after monitor add/remove/metrics changes so the pet cannot stay off-screen while the page pet is suppressed.
- Share cancellable, deadline-bound browser polling; surface disconnects; clean up listeners/styles; separate drag/click, add keyboard controls and reduced-motion styling. Away notifications are explicitly opt-in, no longer rely solely on throttled background timers, and already-notified completions survive a reload via `sessionStorage`. The size slider keeps keyboard focus after stepping and redundant scale writes are skipped.
- Expand 13 helper tests to 54 host/activity/security/manifest tests plus real Chromium/Electron smoke coverage, including slot metadata, same-origin authorisation and bundle-contract assertions; add an architecture/comparison audit and correct installation/control/security documentation.

## 0.1.5 (2026-09-10)

- **Change: returning to DSH now needs a double-click on the pet.** A single click used to launch the browser, which fired on stray clicks and on drags that barely moved. Single click is now inert; double-click the pet (or use the right-click menu's *Open DeepSeek Harness*) to go back. The bubble keeps its own single-click = expand behaviour.

## 0.1.4 (2026-09-10)

- **Fix: the desktop pet was bigger than the in-page pet.** The two surfaces used different base metrics (in-page: width `132 × scale`; desktop window: height `182 × scale`), which is invisible for a tall sprite but made a near-square pet ~35% larger in desktop mode. Both now size from the same base width, with height following the image aspect ratio.
- **Fix: dragging ran away from the cursor.** The drag computed the target from the renderer's pointer coordinates, so a window moving under the cursor fed its own movement back into the next coordinate — the pet drifted off in the wrong direction while the button was held. Dragging is now owned by the **main process**, which tracks the OS cursor (`screen.getCursorScreenPoint`) and moves the window itself; the coordinates can no longer be affected by our own window. Also clamps to the work area and ends the drag on `pointercancel` / window blur.

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
