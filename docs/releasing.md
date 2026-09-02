# Releasing

## 1. Publish to npm

```sh
cd <repo>
npm login                       # or a granular token with "Bypass 2FA"
npm publish --access public
```

If publishing hits `403 Two-factor ... bypass 2fa`:

1. Create a **granular access token** at <https://www.npmjs.com/settings/you/tokens>:
   - Packages and scopes → **Read and write**
   - scope: **All packages**
   - **Bypass Two-Factor Authentication** → tick it
2. `npm config set //registry.npmjs.org/:_authToken npm_XXX`
3. `npm publish --access public`
4. `npm config delete //registry.npmjs.org/:_authToken`

## 2. Bump the version

Edit `package.json` `version` and `CHANGELOG.md`, then:

```sh
git add -A && git commit -m "Release v0.x.y" && git push
npm publish
```

## 3. List in the DSH plugin catalog

Open a PR against <https://github.com/awesome-dsh-plugin/awesome-dsh-plugin> adding one file:

`data/plugins/linkbag__dsh-capyreporter.yml`

```yaml
url: https://github.com/linkbag/dsh-capyreporter
name: linkbag/dsh-capyreporter
category: ui
description:
  en: 'Always-on-top capybara task reporter for DSH Web — a transparent floating pet that narrates each trajectory step, names the project it reports for, and alerts you when a task completes while you work elsewhere.'
  zh: '为 DSH Web 打造的永远置顶的水豚任务播报宠物——透明悬浮气泡逐条播报运行轨迹、标明所属项目，任务完成时提醒正在别处忙碌的你。'
```

Requirements (checked by CI): the repo declares `dsh.bundle` in `package.json`, is at least 1 day old, and has ≥10 commits. Do not edit the generated READMEs.
