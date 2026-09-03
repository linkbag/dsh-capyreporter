// Refuse to ship a UTF-8 BOM — DSH's manifest reader does a plain JSON.parse
// and rejects BOM'd files, which kills `dsh plugin` installs.
// Runs automatically via npm prepack; also wired into the CI workflow.
import { promises as fs } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const bad = []

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git') continue
    if (e.name.endsWith('.png') || e.name.endsWith('.tgz')) continue
    const p = join(dir, e.name)
    if (e.isDirectory()) {
      await walk(p)
      continue
    }
    const buf = await fs.readFile(p)
    if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) bad.push(relative(root, p))
  }
}

await walk(root)
if (bad.length) {
  console.error('UTF-8 BOM found in package files (would break DSH manifest parsing):\n  ' + bad.join('\n  '))
  process.exit(1)
}
console.log('check-bom OK — no UTF-8 BOM in package files')
