# Releasing

Use a Git checkout; installed runtime packages intentionally omit browser test fixtures and dev dependencies. Publishing is a maintainer action, not part of the audit or smoke tests.

## 1. Validate before versioning

```sh
npm ci --ignore-scripts
npm test
npm run verify
npm run test:browser
npm pack --dry-run
```

`test:browser` uses local Chrome unless `DSH_TEST_BROWSER_CHANNEL=chromium` is set. Native coverage is explicitly skipped when Electron is unavailable; for a desktop release, run it on Windows with `DSH_PET_ELECTRON_PATH` set to a supported Electron executable. Also manually check mixed-DPI/multiple monitors, taskbar work areas and fullscreen behavior. CI defines Windows/Linux checks on Node 20/22/24 and Chromium smoke coverage; that workflow configuration is not evidence those remote jobs have already passed.

Inspect the tarball file list. It must include all host helper modules, the desktop policy/preload/page, artwork and the Cordis patch. `prepack` rejects UTF-8 BOMs. Runtime sources are handwritten JavaScript; there is no build step. No automatic Electron download or external service is required at runtime.

## 2. Version before publication

Promote the Unreleased changelog and bump both manifest/lockfile, then re-run validation. Commit the reviewed, explicit files and tag the intended release. Never publish a changed package as the already-published version.

```sh
npm version patch --no-git-tag-version
```

Use the existing publish workflow and a short-lived, least-privileged `NPM_TOKEN` scoped only to this package, or configure npm trusted publishing according to your organization policy. Do not paste tokens into commits, terminal transcripts, or broad all-package permanent credentials. No token is needed for local tests or packing.

## 3. Verify deployment

Keep a copy of the previous installed package and preserve `$DSH_HOME/capyreporter.json`. Reactivate the plugin or restart DSH **at a safe stopping point**, then refresh the existing DSH GUI. A page refresh alone does not reload host code, and starting another Vite server does not update DSH.

Check state from the authenticated DSH page console, inspect a real running session/tool event, cancel a separate harmless run, and confirm desktop readiness before the page pet is hidden. Do not create fake user activity in production to make an audit look green. Remote/proxied installations remain unsupported by the current local-only route policy.

## 4. Catalog metadata (if required)

The existing catalog is <https://github.com/awesome-dsh-plugin/awesome-dsh-plugin>. Check its current contribution requirements before submitting `data/plugins/linkbag__dsh-capyreporter.yml`; do not edit generated catalog READMEs. The package must retain its `dsh.bundle` and `./client` export metadata.
