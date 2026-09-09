# 🐾 CapyReporter — the capybara that reports for you

English | [简体中文](README.zh.md)

**An always-on-top capybara task reporter for the DeepSeek Harness Web UI.**

CapyReporter is a tiny transparent window that floats above **every** app and tab of your desktop — not just inside the page — and quietly narrates what your deepseek harness agent is doing, one step at a time, so you can focus on your other work and never miss the moment a task finishes.

## 🦫 What makes it special

- **Always on top, everywhere.** A true desktop overlay (transparent, frameless, click-through except on the capybara). Writes in Notepad, videos, games, other editors — she stays floating and readable. Companion to the in-page overlay for browsers without Electron.
- **Narrates the trajectory.** Every checkpoint of a run becomes a short bubble line: `🔧 tool calls`, `💭 writing…`, `🧭 steering`, `🚀 workflow phases`, `⚠️ errors & retries`. You watch the agent think, in real time.
- **Smart bubble that never gets in the way.**
  - *Compact* — headline + latest status line.
  - *Click to expand* — a scrollable history of the run's steps.
  - *Double-click to dismiss* — she goes quiet until the next update.
  - *Right-click → Restore bubble* — call the report back any time.
- **Project-aware.** The bubble names the **workspace/project** the run belongs to (the same name as the sidebar), so with several sessions running you always know who's reporting.
- **Completion alert while you're away.** `✅ Task complete — <project>` stays on the always-on-top window until you dismiss it — then one click on the capybara jumps you straight back into DeepSeek Harness. Optional desktop notification too.
- **Make her yours.** Upload any transparent PNG in **Settings → 🐾 CapyReporter** to change the character, and scroll the mouse wheel over her to resize. Settings also lets you enable/disable her and uninstall the plugin.
- **Persistent & local-first.** Preferences (image, size, position) live in `$DSH_HOME/capyreporter.json`; no cloud, no accounts, no telemetry.

## 📦 Install

**Package Manager** — once listed: *Settings → Plugin Market → search "capy" → install → refresh the page*.

**CLI:**

```sh
dsh plugin --profile web add dsh-capyreporter
```

Restart `dsh web` (or just refresh the page). Requires DSH web 0.1.0-rc.6 or newer.

**Electron for the always-on-top window** (optional but recommended):

- If Electron is already at `%USERPROFILE%\.dsh\electron\electron.exe` (or any path in `DSH_PET_ELECTRON_PATH`), the desktop window just works.
- Without it, CapyReporter still runs **in-page** — a transparent floating capybara inside the DeepSeek Harness page with the same bubble features.

## 🎛 Control summary

| Action | Result |
| --- | --- |
| Drag the capybara | Move her (window follows) |
| Mouse wheel over her | Resize |
| Single click the bubble | Expand / collapse the step log |
| Double-click the bubble | Dismiss until the next update |
| Left-click the capybara | Return to DeepSeek Harness |
| Right-click the capybara | Menu: Restore bubble · Open DSH · Hide desktop pet |

## 🎨 Art & licensing

- Ships with the built-in capybara art. Replace it with your own transparent PNG in Settings.
- MIT license; the capybara artwork is intended to be replaced/replaceable by the user.

## 🌍 Contributing & feedback

Issues and pull requests welcome. *This plugin is community code — install sources you trust.*

---

Made with 🧡 for the DeepSeek Harness community.
