# Changelog

## 0.1.7 (2026-10-25) — milestone-only bubble, thinking opt-in, snooze

- **The bubble now shows assistant milestones only.** The collapsed line follows the assistant's latest statement (or the final result) and no longer falls back to the last tool line, so a run between tool calls stops flashing `🛠️ ops_bash`-style noise. The expanded Details view keeps the full bounded step log.
- **Report thinking is a settings opt-in.** When enabled, the model's current reasoning becomes the live milestone with a 💭 prefix (row `kind: 'think'` on `/activity`); it resets at step/turn boundaries, completed previews still prefer final assistant text, and the same toggle turns it off. Default off — reasoning stays private.
- **Mute the bubble for 30 minutes by default.** The bubble's third button is *Mute 30 min* (the pet menu offers the same), and a mute hides the bubble on both the page and the desktop companion until the timer lapses. *Restore bubble* ends a mute early; hiding the pet also clears it. Duration is configurable in settings (10/30/60/240 min, clamped 5–480 and persisted); the mute itself deliberately does not survive a restart.
- **Dismiss is always available.** The middle bubble button never turns into a mute: while a run is live it hides the current bubble without muting (new activity resurfaces it), and once a run ends it acknowledges the result. The desktop companion gained a separate *Dismiss* button next to *Mute*.
- **Freely resizable status bubble.** Grab any edge or corner of the bubble to resize it with pointer or touch; the corner handle is keyboard-focusable (←/→ width, ↑/↓ height) and Ctrl + wheel over the bubble still adjusts the width. Width 260–560 px, height 160–720 px, clamped to the viewport and persisted per browser. The layout adapts to whatever size you pick: the action row stays pinned to the bottom edge, the headline stays on top, and the detail/log area in between scrolls when the bubble is too short for its content. The height follows the content until you drag vertically (or press ↑/↓), so widening the bubble never freezes its height; the desktop bubble keeps scaling with the pet size. Double-click any resize handle — or pick **Reset bubble size** in the pet menu — to return to the default 360 px width with content-driven height.
- **English and Chinese localization.** The page overlay and the desktop companion follow the browser/OS language (`zh*` → Chinese, otherwise English; override via `localStorage['dsh-capyreporter:lang'] = 'en' | 'zh'`): bubble headlines, Details/Mute/Dismiss actions, pet menu and every settings row are translated.
- Desktop companion matches the page: milestone-only detail (no tool-line fallback), 💭 thinking prefix, always-available *Dismiss* plus a separate *Mute* button that adopts the configured duration, hidden bubble while snoozed, and *Restore* unmutes.
- Packaging/CI: dropped the `@deepseek-ai/dsh*` peer declarations (kept `@deepseek-ai/cordis` + `react`) and regenerated `package-lock.json`. The old peers forced npm to materialize the whole DSH suite's peer closure into the lockfile, which resolved differently across npm versions and broke `npm ci` in GitHub Actions. DSH APIs are still feature-detected at activation; the plugin declares no DSH packages it does not import. Unit tests 54 → 59 (thinking gating, snooze/thinking routes and persistence, peer-closure guard).

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
