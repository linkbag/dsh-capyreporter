# Architecture

CapyReporter has three lifecycle-owned surfaces. It ships handwritten JavaScript, not a generated bundle.

```text
DSH host ── same-origin fetch ── DSH page overlay + Settings
   │                              lib/client.js
   │ spawn + private capability
   ▼
Electron main ── allowlisted IPC ── sandboxed file renderer
```

## Host

[Host entry](../lib/index.js) exports the Cordis contract `name`, `inject: ['webServer']`, `apply(ctx)`. Each activation owns its settings, activity tracker, capability, routes, child and watchdog. Subscriptions use `{global:true}` so scoped session/agent events reach the reporter. Existing running agents are seeded on activation, not inferred from replayed session events.

[Activity projection](../lib/activity.js) consumes real `event.type` + nested `event.data` payloads. `agent/status` owns liveness; metadata/text events cannot create running sessions. DSH `turn/end.data.reason.kind` determines the outcome; an idle status without that event is merely idle. The current turn resets at `turn/start`. Assistant step changes and failed same-step retry attempts reset preview text; authoritative assistant messages replace it, including empty/tool-only messages. Only text blocks are used, never reasoning, tool arguments, tool output or prompts.

Bounds: 600 characters of accumulated assistant text, ~120-character display tail, 16 internal step lines / 12 returned, 20 unread results, six-hour result expiry. Session identity and monotonically distinct completion timestamps permit exact acknowledgement without clearing another session. Workspace/session labels are refreshed through optional `workspaceRegistry`, `sessions`, and `sessionTitle` services; neither registry nor title service is required for the other to work.

Preferences use platform-native paths, create the parent directory, write a private temporary file and rename atomically before updating memory. Legacy migration occurs only on `ENOENT`. Artwork validates type, base64 size, signature, chunk bounds, dimensions and terminal IEND; this is **container validation, not a full PNG decoder/CRC or decompression validator**. Decoding remains the browser's responsibility.

## HTTP boundary

All endpoints are below `/dsh-capyreporter`. Responses are no-store/nosniff and use same-origin resource policy; there is no wildcard CORS. Reads require GET and mutations require POST + a JSON object. Bodies are bounded (~5.34 MiB for 4 MiB base64 PNG + envelope), with a five-second deadline and explicit abort/error cleanup.

| Endpoint | Purpose |
| --- | --- |
| `GET /state` | Toggles, scale, image revision, desktop readiness/status/error |
| `GET /activity` | Running identities/titles/previews/lines and per-session unread outcomes |
| `GET /image` | Current PNG bytes |
| `POST /image` | `{dataUrl: 'data:image/png;base64,…'}` |
| `POST /reset` | Reset artwork |
| `POST /enabled` | `{enabled:boolean}` |
| `POST /notifications` | Persist notification opt-in `{enabled:boolean}` |
| `POST /scale` | `{scale:number}`, clamped 0.5–2.5 |
| `POST /dismiss` | Acknowledge `{at:completionTimestamp}` |
| `POST /desktop/show`, `/desktop/hide` | Request desktop mode / use page instead |
| `POST /desktop/heartbeat` | Desktop capability only |

DSH's raw plugin handlers run **outside the SPA auth gate**. The reporter therefore requires a loopback Host with the real host port and a loopback peer address. Browser requests additionally require a matching Origin or Referer and reject cross-site/opaque origins. The desktop uses a timing-safe activation-scoped bearer capability, held only by its main process.

**Limits:** same-origin checks are a browser/CSRF boundary, not authentication against a malicious local OS process capable of forging headers. This does not inherit or replace DSH login, support remote origins/reverse proxies, or protect against another trusted same-origin plugin/XSS. A proper reusable host-auth middleware/service is an upstream follow-up. HTTPS/forwarded origins are not inferred from untrusted proxy headers.

## Browser

[Client entry](../lib/client.js) registers with `window.__ModuleLoader__.load` and injects namespaced overlay/settings slots and CSS. Both React surfaces subscribe to one feed. A poll fetches state and then activity only when enabled, never overlapping itself; requests have five-second abort deadlines, disconnect feedback and bounded exponential backoff. Mutation generations prevent older in-flight polls from overwriting a newer settings response. Unmount/stop aborts requests and removes timers, wheel/outside-click/resize listeners and CSS.

The page pet is hidden only when the host reports a recent desktop heartbeat. Browser-local position is persisted and clamped after resize/image load. Buttons support keyboard operation; drag/click are separated, ordinary scrolling is not intercepted, and reduced-motion styling is respected. Image URLs use a revision, so replacing custom art with more custom art cannot retain the old cache key.

Notifications require explicit plugin opt-in plus granted browser permission; no automatic permission prompt. Results observed while focused are marked seen, not replayed on blur. Deduplication is per page; multiple DSH tabs can still notify independently.

## Electron

[Main process](../runtime/electron-helper/main.js) loads its page by absolute path. `nodeIntegration:false`, `contextIsolation:true`, and `sandbox:true` are mandatory. Navigation, new windows, webviews and permission requests are denied. The page CSP forbids network access; the renderer cannot fetch the host or choose a target URL.

[Policy](../runtime/electron-helper/policy.cjs) requires the owned webContents **and its main frame with the exact local page URL** for IPC. A bounded allowlist accepts only the reporter's read, scale, dismiss, hide and heartbeat operations. The main process makes authenticated, deadline-bound HTTP requests and supplies image data URLs. Open-site IPC has no URL parameter and opens only the validated configured loopback origin. Provider/API keys and Node injection variables are excluded from the child's OS/display environment.

The window starts hidden. The renderer fetches state, decodes artwork, fetches activity, and only then heartbeats; the main process reveals it. Ten seconds without heartbeat restores the page pet; a 20-second watchdog kills an unresponsive helper. Three failed renderer polls close an orphan after host loss. Plugin disposal removes routes/tracking and awaits child shutdown (with a bounded force-kill fallback). No automatic crash-respawn loop is used; toggle desktop mode to retry.

Native dragging follows `screen.getCursorScreenPoint()` and clamps to the nearest work area. Resize is display-aware, preserves the bottom anchor, and skips identical bounds to avoid fractional-DPI sinking. Artwork uses display-relative pixel caps, never `vh` of its self-resizing window. Empty window background is click-through; this is not per-pixel alpha hit testing. Desktop position is not persisted across launches.

## Verification

- `npm test`: pure real-wire event fixtures, route isolation/validation, persistence failures and privileged IPC policy.
- `npm run test:browser`: isolated real Chromium UI and optional real Electron bootstrap/bridge/lost-host tests. It never restarts or replaces the running DSH GUI.
- `npm run verify`: contract, syntax and package shape checks.
- `npm pack --dry-run`: shipped-file list; prepack checks BOMs.

See [audit](audit.md) for evidence, comparisons and remaining limitations.
