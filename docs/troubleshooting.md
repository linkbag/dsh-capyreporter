# Troubleshooting

## The desktop window does not appear

CapyReporter stays **in-page** unless an Electron binary is available. Check in this order:

1. `C:\Users\YOURUSER\.dsh\electron\electron.exe` exists (the default location),
   or set `DSH_PET_ELECTRON_PATH` to any `electron.exe` / `electron` binary.
2. Set `DSH_CAPYREP_BASE_URL` if DSH web is not at `http://127.0.0.1:3080`.
3. Check the status endpoint: `GET http://127.0.0.1:3080/dsh-capyreporter/state` should
   report `"desktop": true` once the window is up.

## The window appears but slips behind other windows

The topmost level is re-asserted on blur and every 2s. If some window still covers the
pet (rare), that window has a higher z-order (usually a fullscreen exclusive game).

## The pet image is blank / broken

The image is served by the host at `/dsh-capyreporter/image` (byte-exact; no base64 in
the page). A broken image means the host could not read `assets/capybara.png` — reinstall
the package. Uploading your own transparent PNG happens in **Settings → CapyReporter**.

## Bubble text is truncated

The bubble clamps the headline to 2 lines and the detail to 3, and expands on click to
the full scrollable step log; double-click dismisses; right-click → **Restore bubble**.

## GPU crashes / the helper quits on startup

On hybrid-GPU laptops a transparent window can crash at startup; the helper disables
hardware acceleration by design. If it still fails, run the helper manually:

```sh
C:\Users\YOURUSER\.dsh\electron\electron.exe <plugin>/runtime/electron-helper/main.js
```

and read the console output.
