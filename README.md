# 🐾 CapyReporter

English | [简体中文](README.zh.md)

A local task reporter for DeepSeek Harness Web: a page pet, plus an optional transparent always-on-top Electron companion.

## What it reports

- Live **workspace + session** labels and a bounded **assistant milestone** preview: the collapsed bubble follows the assistant's latest statement instead of tool chatter. Reasoning stays hidden unless you opt in to *Report thinking*; prompts, tool arguments and tool output are never displayed.
- Separate **completed, cancelled, failed, blocked, interrupted and output-limit** outcomes, using actual DSH `turn/end` events. Idle alone is not success.
- Independent unread results for parallel sessions: starting another session does not erase a result. Up to 20 results are retained in memory for six hours.
- Compact headlines and explicit **Details / Mute / Dismiss result** controls. Keyboard support and reduced-motion-safe styling.
- Optional away notifications: off by default, require both the plugin toggle and browser permission, and do not notify a focused page. Different open DSH tabs may each notify.

## Install

```sh
dsh plugin --profile web add dsh-capyreporter
```

Use a DSH version satisfying the [package peer dependencies](package.json) (`^0.1.1-rc.2 || >=0.1.2-0`); 0.1.7 was re-verified against **DeepSeek Harness 0.2.1-alpha.1** (routes, slots, client bundle serving, and agent/session events). Refresh after a client update; host-code updates need plugin reactivation or a DSH restart. A page refresh alone cannot replace a loaded host module.

### Optional desktop companion

Use `DSH_PET_ELECTRON_PATH` (or `ELECTRON_PATH`) for an existing Electron executable. The plugin also checks `$DSH_HOME/electron/electron.exe` on Windows (`electron` on Linux), the user npm installation, and legacy Windows install locations. No binary is downloaded automatically. macOS should use an explicit executable path.

The host's actual port is used automatically. `DSH_CAPYREP_BASE_URL` can override it with an exact loopback HTTP(S) origin, not a URL with credentials, paths or auth tokens. Remote/reverse-proxied origins are deliberately not supported by this plugin's local-only route boundary.

The page pet is hidden **only after** the desktop has decoded its image, fetched activity, and reported healthy. Missing Electron, a failed renderer, or a stale heartbeat keeps/restores the page fallback. Some exclusive fullscreen applications can still cover a topmost window. Empty window background is click-through; the artwork element and bubble are interactive rectangles.

## Controls

| Action | Result |
| --- | --- |
| Drag the pet | Move it; dragging does not dismiss results or open DSH |
| Ctrl / Cmd + wheel over the pet | Resize, 50–250% (ordinary scrolling remains available) |
| Click, right-click, or Enter/Space on pet controls | Open controls |
| Details / Collapse | Toggle scrollable session details |
| Mute 30 min / Dismiss result | Silence the bubble for the configured duration (default 30 min) / acknowledge this result |
| Restore bubble | Show current activity again and end a mute early |
| Double-click desktop pet / Open DeepSeek Harness | Open the configured DSH origin |
| Escape | Close controls/details |

## Appearance and preferences

Settings → **🐾 CapyReporter** controls visibility, desktop mode, size, artwork, notifications, the **Status bubble** mute duration (10/30/60/240 min, default 30) and **Report thinking** (opt-in 💭 reasoning as the live milestone, off by default). Artwork must be a PNG, at most **4 MiB**, with each side **1–4096 px**. SVG, arbitrary data URLs and malformed/truncated containers are rejected. Custom-to-custom changes invalidate the image revision immediately.

Image, size and toggles are saved atomically to `$DSH_HOME/capyreporter.json` (default `~/.dsh`). A legacy `homura-pet.json` is read only when that file is absent. Page position is stored separately in this browser's local storage; desktop position is session-only. Corrupt settings are logged, not silently replaced with unrelated legacy settings. Failed writes leave the previous preferences active.

**Hide pet is not uninstall.** Remove the package using DSH's plugin manager or:

```sh
dsh plugin --profile web remove dsh-capyreporter
```

## Security and diagnostics

Plugin HTTP handlers are separate from DSH's SPA authentication gate. This plugin rejects cross-origin/opaque browser requests, non-loopback callers/Host headers and GET mutations; it does not expose wildcard CORS. The desktop uses an activation-scoped capability held in its main process, a sandboxed renderer, restrictive CSP and an allowlisted IPC broker. See [architecture](docs/architecture.md) for boundaries, including what they do **not** protect against.

No telemetry or outbound service is used. Notifications and the desktop window can expose session titles/assistant previews on your screen; disable them in shared-screen environments.

- [Troubleshooting](docs/troubleshooting.md)
- [Audit, comparisons and validation](docs/audit.md)
- [Architecture](docs/architecture.md)

## Development

Handwritten JavaScript is the shipped source; there is no build step.

```sh
npm ci
npm test
npm run verify
npm run test:browser
npm pack --dry-run
```

Browser smoke tests use installed Chrome by default (`DSH_TEST_BROWSER_CHANNEL=chromium` for a Playwright browser) and an optional existing Electron executable. They use temporary settings and ephemeral loopback fixtures, never your installed preferences or running DSH server. Electron coverage is explicitly skipped when no binary is found. Tests and dev dependencies are not runtime requirements.

MIT. Artwork is replaceable; other projects referenced in the audit were studied for architecture, not copied into this package.
