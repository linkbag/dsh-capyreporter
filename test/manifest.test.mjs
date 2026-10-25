import { test } from 'node:test'
import assert from 'node:assert/strict'
import { access, readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))

test('manifest serves a browser half for the DSH 0.2.x loader', async () => {
  assert.equal(manifest.type, 'module')
  assert.equal(manifest.dsh.client.platform, 'web')
  assert.ok(manifest.dsh.client.inject.includes('@deepseek-ai/dsh-client-connection'))
  const entry = typeof manifest.exports['./client'] === 'string' ? manifest.exports['./client'] : manifest.exports['./client']?.default
  assert.equal(entry, './lib/client.js')
  await access(join(root, entry))
  await access(join(root, manifest.exports['.'].default ?? manifest.exports['.']))
  await access(join(root, manifest.dsh.bundle.patch))
})

test('peer metadata stays installable without dragging the DSH suite into the lockfile', () => {
  assert.equal(manifest.peerDependencies['@deepseek-ai/dsh'], undefined)
  for (const name of Object.keys(manifest.peerDependencies)) {
    assert.ok(!name.startsWith('@deepseek-ai/dsh'), 'peer ' + name + ' pulls the DSH peer closure into npm ci')
  }
  assert.match(manifest.peerDependencies['@deepseek-ai/cordis'], /^(\^|>=)/)
  assert.equal(manifest.peerDependencies['@deepseek-ai/dsh-client-runtime'], undefined)
  assert.ok(!manifest.dsh.client.inject.includes('@deepseek-ai/dsh-client-runtime'))
})

test('published package files never depend on the removed client runtime', async () => {
  for (const file of ['lib/client.js', 'lib/index.js']) {
    const source = await readFile(join(root, file), 'utf8')
    assert.ok(!source.includes('dsh-client-runtime'), file + ' must not reference the removed client runtime')
  }
})

test('npm test lists every node:test file so node 20 runs the same suite', async () => {
  // `node --test test/*.test.mjs` needs glob support that node 21+ only has;
  // the script therefore names files explicitly. Fail when a new test file
  // is added without updating the script.
  const entries = manifest.scripts.test.split(' ').filter(part => part.startsWith('test/'))
  const onDisk = (await readdir(join(root, 'test'))).filter(name => name.endsWith('.test.mjs')).map(name => `test/${name}`).sort()
  assert.deepEqual([...entries].sort(), onDisk)
  assert.ok(entries.length >= 5)
})
