# CapyReporter end-to-end audit and improvement

**Reviewed:** 2026-10-19. **Baseline:** installed `dsh-capyreporter@0.1.5`, Git `6ebea54`, upstream <https://github.com/linkbag/dsh-capyreporter>.

**Outcome:** implemented a reliability/security hardening pass and prepared the 0.1.6 release. The installed plugin copy was upgraded to 0.1.6 for testing with a backup of 0.1.5; the live DSH process still runs the old host code until restarted, and no user preference was reset. Version 0.1.6 has a dated changelog and release metadata ready for publication.

**Follow-up (2026-10-25):** the audit findings carried into a UX pass — milestone-only bubble, opt-in thinking, 30-minute configurable mute, always-available Dismiss, a freely resizable bubble whose layout adapts (bottom-pinned actions, scrolling details, reset via double-click or the pet menu), *Go to chat* via `uiWorkspace.openSession`, ten-language localization with an in-chat switcher (RTL for Arabic), and desktop parity (freely resizable companion bubble and a helper-only `/desktop/navigate` hand-off the page consumes once). Those changes ship as **0.1.8**; 0.1.7 was versioned but never published.

## Executive assessment

The original 13 helper tests and bundle-shape check passed, but did not exercise real nested DSH events, HTTP policy, renderer lifecycle or a real browser. Live read-only evidence confirmed two material issues: unauthenticated reporter routes returned data while the DSH root required authentication, and actual activity lost tool names/text because fixtures used an invented flat event shape.

The highest-value change is **trustworthy reporting before more pet features**: only authoritative completed turns get a success label, each parallel session retains its own unread result, and a launched desktop process does not count as a healthy visible pet. The package still has no added runtime dependencies or network services.

## Findings and disposition

P1 = important privacy/correctness/lifecycle defect to fix before trusting the reporter; P2 = reliability/interaction/maintenance defect. These are local product priorities, not CVSS scores or claims of demonstrated remote code execution.

| Priority | Baseline finding | Implemented disposition |
| --- | --- | --- |
| P1 | Raw plugin routes bypass the DSH SPA login gate. `/activity` exposed session metadata with `Access-Control-Allow-Origin: *`; disabled mode did not hide it. | Loopback peer + Host/port policy, browser same-origin provenance, no wildcard CORS, empty activity while disabled, private desktop capability. This is **not full local-user authentication**. |
| P1 | Reset/desktop controls mutated on GET; setters did not enforce JSON POST. | Explicit method table, 405/Allow, strict JSON object/schema checks, helper-only heartbeat. |
| P1 | Flat event guesses missed real `event.data.chunk.text` / `data.name`; trimming every delta joined words. | Pure nested-wire projection, whitespace-preserving streaming, authoritative whole-message replacement, explicit privacy exclusions. |
| P1 | Idle, error, stop and disposal were all presented as successful completion. | Completed/aborted/error/blocked/max-tokens/interrupted outcomes from `turn/end.data.reason.kind`; idle without a reason is only idle. |
| P1 | A single global completion was erased by any new running session; metadata events invented live work. | Identity-keyed running records, bounded independent result queue and exact timestamp acknowledgements; status owns liveness. |
| P1 | Desktop was reported running immediately after spawn; failed polls could leave stale/orphan windows while hiding fallback. | Image/activity bootstrap + heartbeat before readiness/show, page fallback on stale heartbeat, bounded watchdog, lost-host exit and awaited shutdown. |
| P1 | An upload in flight could finish after disposal and respawn/mutate the stopped plugin. | Disposal checks both before and after body awaits; instance-owned state/capability/routes/child, bounded async child cleanup. |
| P2 | Body overflow destroyed the request without settling the body promise; abort/error/deadline cases were untested. | Controlled 413/408/400, bounded allocation, listener/timer cleanup and real partial-upload cancellation regression. |
| P2 | Arbitrary image data URLs were saved and served as PNG; no byte/pixel/container checks. | PNG-only, 4 MiB, 1–4096 px per side, signature/IHDR/chunk bounds/IEND checks. This deliberately is not a full PNG decoder. |
| P2 | Global module state, accumulating maps/caches and unmanaged timers could survive lifecycle transitions. | Per-activation ownership, 20 results / six-hour retention, bounded previews/logs, cleanup and hot-activation seeding. |
| P2 | Saves silently failed; paths were Windows-specific; any config load error triggered legacy fallback. | Platform-native paths, directory creation, private atomic temp/rename, error responses with previous preferences retained, migration only for missing config. |
| P2 | Browser/desktop custom-to-custom image replacement kept the same cache key. | Revision changes on replacement/reset; both surfaces refresh decoded artwork. |
| P2 | Independent browser polling overlapped; no deadline/backoff/abort, and older responses could overwrite a successful mutation. | Shared subscribed single-flight feed, deadline/cancellation/backoff, visible disconnect and mutation generation guard. |
| P2 | Wheel listener was not rebound/removed; generic CSS/slot/IPC names collided with Homura; no coherent keyboard controls. | Namespaced resources, effect cleanup, Ctrl/Cmd-wheel only, explicit semantic buttons, Escape/Enter/Space, drag threshold and reduced-motion-safe styling. |
| P2 | Desktop sandbox disabled, no CSP/navigation/permission restrictions, and IPC did not verify the owned main frame. | Sandbox + context isolation, CSP with no renderer network, deny navigation/windows/webviews/permissions, exact top-level sender and request allowlist. Defense-in-depth; no demonstrated baseline RCE. |
| P2 | Full host environment exposed provider keys/Node injection variables to the helper; port was hardcoded. | Minimal OS/display environment plus private capability; actual webServer port or validated loopback override. |
| P2 | Primary-display resize clamping could move a secondary-monitor pet; self-referential viewport sizing could feed back. | Current-display work area and pixel/natural-aspect sizing; preserve OS-cursor dragging and the original same-size fractional-DPI guard. |
| P2 | Browser permission alone enabled notifications, including while focused/disabled/desktop, and settings failures looked successful. | Explicit persisted opt-in + browser permission, away-only per-page deduplication, focused observations marked seen, visible mutation errors. |
| P2 | README implied persistent native position/uninstall behavior and inconsistent install/control semantics. | Corrected bilingual controls, PNG/scale limits, page-only position persistence, safe upgrade/reload guidance and actual removal command. |
| P2 | Tests only covered flattened helpers; verification omitted newly required modules; package/release checks were weak. | 50 regression tests, three real browser/native smoke scenarios, full shipped-source syntax/shape check, lockfile, stricter package files and expanded CI definition. |

Fixed-source entry points: [host](../lib/index.js), [activity projection](../lib/activity.js), [request/image policy](../lib/security.js), [browser](../lib/client.js), [Electron main](../runtime/electron-helper/main.js), [IPC policy](../runtime/electron-helper/policy.cjs), [renderer](../runtime/electron-helper/renderer.js). See [architecture](architecture.md) for exact limits and HTTP contracts.

## What we learned from other pets

These were architecture comparisons, **not source or asset imports**. Similar lineage is not independent evidence of correctness.

| Reference | Useful lesson | Applied here / deliberately not copied |
| --- | --- | --- |
| [ysyyhhh/dsh-pet, HarnessBridge](https://github.com/ysyyhhh/dsh-pet/blob/a17346b9c41efb4220f387216008928bba652e0e/src/integration/HarnessBridge.ts) | Treat integration as a host bridge; scoped agent/session events need global subscriptions. Native overlays should be capability-gated. | Global owned subscriptions, actual host port/readiness contract. A native `dsh.desktop.overlay` backend remains a separate compatibility-gated project. |
| [Skylarking/dsh-plugin-codex-pets](https://github.com/Skylarking/dsh-plugin-codex-pets/blob/22e93f403d8795627042e0df8bc5855d35047f89/lib/client.js) | Identity-aware session snapshots; waiting/running/unread-result arbitration; accessible controls; explicit cleanup and cancellation. | Independent unread results, keyboard interaction, abortable feed and reduced-motion-safe treatment. Its UNLICENSED package/code and sprite art were **not copied**. |
| [DamonKoy/dsh-web-ui, event projection](https://github.com/DamonKoy/dsh-web-ui/blob/15a894690e17aedf36bff5df5bcbe6df10468ac4/packages/dsh-pet/src/event-projection.ts) | Keep reporting as a pure projection; use explicit turn-end reasons rather than interpreting every event as activity. | Small separately tested projection and truthful outcomes. Avoided global latest-event arbitration that could hide another session's result. |
| Installed Homura 0.1.0 and the original CapyReporter | Shared host/polling/IPC lineage explains inherited assumptions; existing OS-cursor drag and same-size bounds guards are valuable. | Kept those fixes, removed legacy namespace collisions. Homura was not treated as an independent validation oracle. |
| Codex-style sprite pets | Frame metadata, timing, static reduced-motion frames and clean state/animation separation are better than hardcoded sprite assumptions. | Recorded as a future design direction, not a reason to add an atlas engine, marketplace, physics, affinity or asset licensing surface to this hardening pass. |

## Validation actually performed

Environment: Windows; Node **24.18.0**; installed Chrome through Playwright **1.61.1**; existing Electron **43.3.0**. All fixtures use temporary settings and ephemeral loopback ports. Screenshots are test fixtures, not the user's production GUI.

| Check | Result |
| --- | --- |
| Baseline `npm test` | 13/13 passed, illustrating missing integration coverage |
| Final `npm test` | **54/54 passed**, including all turn outcomes, true nested chunks, retry text reset, parallel identity, atomic-save failure, scoped subscription assertions, route/method/origin policy, same-origin fetch metadata, manifest/bundle contract, real partial upload abort, bounds and IPC policy |
| `npm run test:browser` | **3/3 passed, none skipped**: real Chromium UI; real host→spawned Electron→capability/heartbeat→hide/show/dispose; real sandboxed Electron renderer with aspect fit, exact-size bounds stability, IPC deny and lost-host exit |
| `npm run verify` | Host contract, all required runtime files and syntax of all eight shipped JS/CJS sources passed |
| `git diff --check` | Passed after removing one trailing-space defect |
| `npm pack --dry-run` / prepack | Passed, including BOM check; docs and helper policy modules included |
| `npm audit --omit=dev --audit-level=high` | Registry reported **0 vulnerabilities**; not a substitute for this source review |
| Existing `http://127.0.0.1:3080/` | Still returns 401 without the existing DSH login; no restart or replacement server |
| Existing installed `/dsh-capyreporter/state` | Still reports original `enabled:false`, `hasCustom:true`, `desktop:false`, `desktopEnabled:false`, `scale:0.7`; confirms this working copy was **not deployed** |

Attempted alternate-Node runs via the environment's `npx` route still resolved Node 24.18.0; they are **not counted as Node 20/22 validation**. CI now defines Node 20/22/24 on Windows/Linux plus Chromium, but those remote jobs have not been executed in this session.

Smoke script: [browser/native harness](../scripts/browser-smoke.mjs). Regression suites: [activity](../test/activity.test.mjs), [HTTP/persistence](../test/host-routes.test.mjs), [security/IPC](../test/security.test.mjs) and [legacy helpers](../test/host-helpers.test.mjs). [CI definition](../.github/workflows/ci.yml).

## Latest-DSH compatibility review (DSH 0.2.1-alpha.1)

Re-checked the shipped interfaces against the installed `@deepseek-ai` **0.2.1-alpha.1** packages (Cordis **4.0.5-alpha.1**):

| Surface | Evidence / disposition |
| --- | --- |
| Host routes | `webServer.register({kind:'prefix', …})` and the `port` getter are unchanged in `dsh-host-webserver`; activation and authorisation both use them. |
| Client bundle | 0.2.1 serves client halves as `/plugins/??<id>/client.js&rev=…` resolved from `exports["./client"]`. The old `/plugins/<id>/client.js` path is gone, so its 404 is expected. The manifest has the required export and `dsh.client.platform:'web'`. |
| Slots | `slots.inject` still wraps `ctx.effect`, so the generator form is valid; `shell.overlay` and `settings.section` list slots accept `id`/`order`/`label` (string or thunk). |
| Events/services | `agent/status`, `agent/disposed`, `session/event`, `session/disposed` payloads, `Session.header`, `SessionStore.get`, `workspaceRegistry` and `sessionTitle` match the tracker/host code. Only `idle`/`running` statuses are emitted, so older `error/stopped/disposed` branches are harmless dead code. |
| Stale metadata | `@deepseek-ai/dsh-client-runtime` no longer exists. Its `dsh.client.inject` entry was inert but misleading; it is removed from both inject and peers, and the `@deepseek-ai/dsh` peer was added. |

Defects found by this pass and fixed in **0.1.6**: background-tab polling (and therefore away notifications) could stall for minutes; the desktop helper never re-anchored after display changes, leaving no visible pet while the host reported desktop ready; the size slider lost keyboard focus after one step; a strict referrer policy would have blocked every poll; and a cold Electron start could be killed by a 20 s watchdog. Tests now also assert the manifest contract, slot metadata and the same-origin fetch-metadata path.

Known test gaps: the real DSH boot path (cookie gate, combo batch, `__DSH_BOOT__`) is not exercised by the fixture; click-through is OS-level and needs the manual checklist; notifications are not automatable headless. The desktop→page navigation hand-off is covered by two halves rather than one live pair: the Electron smoke asserts the helper posts `/desktop/navigate`, and the Chromium smoke injects a one-shot `state.navigate` to prove the page consumes it and calls `uiWorkspace.openSession`.

## Remaining risks / follow-up priorities

1. **Host-auth integration:** same-origin/loopback checks defeat cross-site browser reads/mutations but a malicious local process can forge headers. A reusable authenticated plugin-route API belongs in DSH; LAN/reverse-proxy deployments are deliberately unsupported meanwhile.
2. **Production rollout:** this is a reviewed/tested development copy, not a live hot patch. Back up the installed package, preserve settings, version/package, reactivate at a safe stopping point, then refresh the existing GUI. Do not restart an active agent session merely to claim deployment.
3. **Compatibility/manual native QA:** only this Windows/Electron/Chrome combination was run. Mixed DPI, secondary monitors, taskbar changes, exclusive fullscreen, Linux/macOS desktop behavior and real DSH loader/hot-reload integration still need rollout validation. Same-size bounds stability is not a substitute for mixed-DPI testing.
4. **Notifications/privacy:** deduplication is per tab, not a shared multi-tab leader. Session titles and assistant previews can be visible to bystanders; opt-in is not redaction. No tool arguments/output/reasoning are included.
5. **Artwork:** structural PNG checks bound common malformed/oversized input, not full CRC/deflate validity. Browsers perform decoding; a valid container with bad compressed content can fail to render. Desktop readiness refuses to declare a healthy image in that case.
6. **Future pet features:** a native overlay adapter, per-session deep links/approval affordances, Codex atlas schema and cross-tab notification leadership are useful next features, not delivered capabilities. Native position persistence is also not implemented.

## Rollout recommendation

Review the source diff and run the tests in a Git checkout. Use the [release checklist](releasing.md), preserve user preferences, and roll out only after versioning. The current active GUI still has the original plugin and therefore still has its original route/reporting defects until that deployment occurs.
