# Troubleshooting

## Desktop does not appear / duplicate or ghost pet

1. Check Settings → CapyReporter for enabled, desktop status, and desktop error. `starting` is **not** ready.
2. Install an Electron binary yourself; set `DSH_PET_ELECTRON_PATH` or `ELECTRON_PATH`, or use `$DSH_HOME/electron/`. No automatic download occurs. Legacy Windows install locations are still supported.
3. The actual DSH port is automatic. If overriding `DSH_CAPYREP_BASE_URL`, use only an exact loopback origin such as `http://127.0.0.1:3080`. Do not include credentials, paths, query parameters or login tokens.
4. Toggle **Use page pet**, then **Enable always-on-top pet** to retry. There is deliberately no endless crash/restart loop.

The page pet remains until artwork and activity load and the renderer heartbeats. A heartbeat older than ten seconds restores the page fallback; the host watchdog stops an unresponsive helper after ~20 seconds. A disconnected helper closes after three failed polls. An orderly plugin stop waits for helper shutdown. Reloading only the page does not replace old host code.

Do **not** launch the helper manually without its DSH host: the private, activation-scoped capability is required. Inspect host warnings for launch/load failures instead. GPU acceleration is disabled by design for transparent-window compatibility.

## Checking state safely

From the **DSH page's** developer console:

```js
await fetch('/dsh-capyreporter/state', { cache: 'no-store' }).then(r => r.json())
```

Opening a reporter route as a standalone tab, a raw unauthenticated CLI request, cross-origin fetch, or a `file://` renderer is rejected by design. No public CORS bypass is provided. The boundary is local-only and is not an authentication guarantee against other local processes. For a caller using `curl`, a forged same-origin header can pass; that does not make it a supported remote API.

## Blank artwork / replacement not updating

PNG only, at most 4 MiB and 4096 pixels per side. SVG, malformed base64 and truncated containers are rejected. A structurally valid but undecodable PNG can still fail browser decoding; this validator does not implement full CRC/deflate verification. Try another PNG or **Reset artwork**. If the bundled asset is missing, reinstall the package.

The image revision changes on every replacement/reset, including custom-to-custom changes. New desktop sizing uses natural aspect ratio with a display-relative pixel cap, not `vh` of a moving/self-resizing window. Native equal-size resize requests are ignored to preserve the fractional-DPI sinking fix.

## Activity missing, wrong, or surprising

- Only running agents create live rows; metadata and replay do not.
- Completed means the latest authoritative DSH turn ended with `completed`. Cancellation, error, blocked, output limit and interruption have distinct labels; idle without a turn outcome is not called success.
- Project and session names depend on optional host services and refresh when available. Otherwise the safe fallback is `Session`.
- Details show the last 12 bounded status lines and a short text preview, not the entire session. Reasoning, prompts, arguments and tool output are deliberately excluded.
- Results survive unrelated session starts, but restarting the same session clears its previous unread result. Results expire after six hours, and at most 20 are retained.

## Controls / settings

Use **Ctrl/Cmd + wheel**, not plain wheel. Ordinary wheel scrolling must remain usable inside Details. Click/right-click or Enter/Space opens controls; Escape closes them. Drag is separate from click. **Hide pet** does not uninstall anything.

Page position is browser-local and clamped to the current viewport; desktop position is not persisted. Host preferences are in `$DSH_HOME/capyreporter.json`. Corrupt config is logged, and only a missing config triggers legacy migration. A failed save is shown rather than falsely claiming success.

Notifications are off by default; both the plugin toggle and browser permission are needed. They only fire while away from the page. Browser/OS policies may suppress them, and several DSH tabs can notify independently.

## Verification without touching preferences

Run `npm ci`, `npm test`, `npm run verify`, then `npm run test:browser` in a development copy. Chrome is the default real-browser channel; set `DSH_TEST_BROWSER_CHANNEL=chromium` after installing a Playwright Chromium browser if needed. Native smoke coverage uses an existing Electron executable and explicitly skips if unavailable. These fixtures use temporary configuration and ephemeral ports, not the running DSH server.
