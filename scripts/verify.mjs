// Lightweight smoke check for the CapyReporter bundle. Run: node scripts/verify.mjs
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const problems = []

// ESM needs a file:// URL on Windows (a plain C:\ path throws ERR_UNSUPPORTED_ESM_URL_SCHEME)
const host = await import(pathToFileURL(join(root, 'lib', 'index.js')).href)
if (typeof host.apply !== 'function' || !Array.isArray(host.inject) || typeof host.name !== 'string') {
  problems.push('lib/index.js does not export the Cordis plugin contract {apply, inject, name}')
}
if (!host.inject.includes('webServer')) problems.push('host must inject webServer')

for (const f of ['lib/client.js', 'cordis.patch.yml', 'assets/capybara.png', 'runtime/electron-helper/main.js', 'runtime/electron-helper/renderer.js']) {
  if (!existsSync(join(root, f))) problems.push('missing file: ' + f)
}

const pkg = JSON.parse(await import('node:fs/promises').then((fs) => fs.readFile(join(root, 'package.json'), 'utf8')))
if (!pkg.dsh?.bundle?.patch) problems.push('package.json missing dsh.bundle.patch')
if (!pkg.exports?.['./client']) problems.push('package.json missing exports["./client"]')

if (problems.length) {
  console.error('verify FAILED:\n  ' + problems.join('\n  '))
  process.exit(1)
}
console.log('verify OK — bundle shape looks publishable')
