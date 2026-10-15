import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const roots = ['src', 'dist']
const prohibited = [
  /SUPABASE_SERVICE_ROLE_KEY/i,
  /service[_-]?role/i,
  /PAYMENT_WEBHOOK_SECRET/i,
  /MOCK_PAYMENT_WEBHOOK_SECRET/i,
]
const inspectedExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.map'])
const findings = []

async function inspect(entryPath) {
  const entry = await stat(entryPath)
  if (entry.isDirectory()) {
    for (const child of await readdir(entryPath)) await inspect(path.join(entryPath, child))
    return
  }
  if (!inspectedExtensions.has(path.extname(entryPath))) return

  const contents = await readFile(entryPath, 'utf8')
  for (const pattern of prohibited) {
    if (pattern.test(contents)) findings.push(`${entryPath}: ${pattern.source}`)
  }
}

for (const root of roots) {
  try {
    await inspect(root)
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
}

if (findings.length > 0) {
  process.stderr.write(
    `Potential privileged secret names found in browser sources/bundle:\n${findings.join('\n')}\n`,
  )
  process.exitCode = 1
} else {
  process.stdout.write('Browser sources and built assets contain no privileged secret names.\n')
}
