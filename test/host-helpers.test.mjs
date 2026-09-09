// Unit tests for the pure host helpers. Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const m = await import(pathToFileURL(join(root, 'lib', 'index.js')).href)
const { asText, titleOf, extractEventText, tailPreview, stepLineOf } = m

test('asText collapses whitespace and trims', () => {
  assert.equal(asText('  a \t b  ', 200), 'a b')
})

test('asText truncates to max and returns null for non-strings', () => {
  assert.equal(asText('abcdef', 3), 'abc')
  assert.equal(asText(42, 10), null)
  assert.equal(asText(null, 10), null)
})

test('titleOf picks the first present key in priority order', () => {
  assert.equal(titleOf({ title: 'T', name: 'N' }), 'T')
  assert.equal(titleOf({ name: 'N', label: 'L' }), 'N')
  assert.equal(titleOf({ label: 'L', summary: 'S' }), 'L')
  assert.equal(titleOf({}), null)
  assert.equal(titleOf(null), null)
})

test('titleOf truncates long titles', () => {
  assert.equal(titleOf({ title: 'x'.repeat(100) }).length, 80)
})

test('extractEventText treats delta/chunk as streaming appends', () => {
  assert.deepEqual(extractEventText({ delta: 'abc' }), { text: 'abc', append: true })
  assert.deepEqual(extractEventText({ chunk: 'xyz' }), { text: 'xyz', append: true })
})

test('extractEventText treats whole-message payloads as replacements', () => {
  assert.deepEqual(extractEventText({ text: 'hello' }), { text: 'hello', append: false })
  assert.deepEqual(extractEventText({ output: 'out' }), { text: 'out', append: false })
  assert.deepEqual(extractEventText({ message: { text: 'msg' } }), { text: 'msg', append: false })
})

test('extractEventText prefers delta over text and returns null with no text', () => {
  assert.equal(extractEventText({ delta: 'd', text: 't' }).append, true)
  assert.equal(extractEventText({}), null)
  assert.equal(extractEventText(null), null)
})

test('tailPreview passes short text through collapsed', () => {
  assert.equal(tailPreview('  a \n b  '), 'a b')
  assert.equal(tailPreview('x'.repeat(120)), 'x'.repeat(120))
})

test('tailPreview marks long text with an ellipsis and keeps the tail', () => {
  const long = 'y'.repeat(200)
  const out = tailPreview(long)
  assert.ok(out.startsWith('\u2026'))
  assert.ok(out.length <= 121)
})

test('tailPreview cuts at a word boundary after the ellipsis', () => {
  const long = 'word '.repeat(60).trim() // 299 chars, space separated
  const out = tailPreview(long)
  assert.ok(out.startsWith('\u2026'))
  assert.ok(!out.startsWith('\u2026 '))
  assert.ok(out.length <= 122)
})

test('stepLineOf summarises tool calls with object, string and toolName forms', () => {
  assert.equal(stepLineOf({ kind: 'tool-call', tool: { name: 'pwsh' } }).line, '\uD83D\uDD27 pwsh')
  assert.equal(stepLineOf({ kind: 'tool-call', tool: 'git' }).line, '\uD83D\uDD27 git')
  assert.equal(stepLineOf({ toolName: 'read' }).line, '\uD83D\uDD27 read')
  assert.equal(stepLineOf({ kind: 'tool-call', name: 'bash', title: 'list files' }).line, '\uD83D\uDD27 bash \u00B7 list files')
})

test('stepLineOf summarises non-tool steps', () => {
  assert.equal(stepLineOf({ kind: 'turn-error' }).line, '\u26A0\uFE0F error')
  assert.equal(stepLineOf({ kind: 'model-retry' }).line, '\uD83D\uDD01 retry')
  assert.equal(stepLineOf({ kind: 'steering' }).line, '\uD83E\uDDED steering')
  assert.equal(stepLineOf({ kind: 'workflow-run', title: 'deploy app' }).line, '\uD83D\uDE80 deploy app')
  assert.equal(stepLineOf({ kind: 'command', commandName: 'balance' }).line, '\u2328\uFE0F command \u00B7 balance')
  assert.equal(stepLineOf({ kind: 'assistant-step' }).line, '\uD83D\uDCAD writing\u2026')
  assert.equal(stepLineOf({ kind: 'compaction' }).line, '\uD83D\uDCC4 context')
})

test('stepLineOf returns null for unknown or empty events', () => {
  assert.equal(stepLineOf({ kind: 'mystery' }), null)
  assert.equal(stepLineOf({}), null)
  assert.equal(stepLineOf(null), null)
})
