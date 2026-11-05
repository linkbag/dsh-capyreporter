import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const sources = await Promise.all(['../lib/client.js', '../runtime/electron-helper/renderer.js'].map(path => readFile(new URL(path, import.meta.url), 'utf8')))
function literal(source, name) {
  const match = source.match(new RegExp('^( *)const ' + name + ' = (\\{[\\s\\S]*?\\n\\1\\})[;\\r\\n]', 'm'))
  assert.ok(match, name + ' literal exists')
  return new Function('return (' + match[2] + ')')()
}
const locales = ['en', 'zh', 'es', 'hi', 'ar', 'pt', 'ru', 'ja', 'fr', 'de']
for (const [index, surface] of ['page', 'desktop'].entries()) {
  test(surface + ' dictionaries have all ten locales and complete UI keys', () => {
    const strings = literal(sources[index], 'STRINGS')
    assert.deepEqual(Object.keys(strings).sort(), locales.slice().sort())
    for (const locale of locales) assert.deepEqual(Object.keys(strings[locale]).sort(), Object.keys(strings.en).sort(), locale + ' key coverage')
  })
}
test('completion outcomes are localized identically on both surfaces, independent of English host labels', () => {
  const page = literal(sources[0], 'OUTCOMES'), desktop = literal(sources[1], 'OUTCOMES')
  assert.deepEqual(page, desktop)
  assert.deepEqual(Object.keys(page).sort(), locales.slice().sort())
  for (const locale of locales) {
    assert.deepEqual(Object.keys(page[locale]).sort(), ['completed', 'error', 'aborted', 'blocked', 'max-tokens', 'interrupted', 'idle'].sort())
    for (const value of Object.values(page[locale])) assert.ok(value.trim())
  }
})
