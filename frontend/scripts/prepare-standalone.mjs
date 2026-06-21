import { cp, mkdir, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(scriptDir, '..')
const standaloneDir = path.join(frontendRoot, '.next', 'standalone')

async function exists(targetPath) {
  try {
    await stat(targetPath)
    return true
  } catch {
    return false
  }
}

async function copyDirectoryIfPresent(sourcePath, destinationPath, label) {
  if (!(await exists(sourcePath))) {
    console.log(`Standalone prep skipped ${label}; source folder was not found.`)
    return
  }

  await rm(destinationPath, { recursive: true, force: true })
  await mkdir(path.dirname(destinationPath), { recursive: true })
  await cp(sourcePath, destinationPath, { recursive: true })
  console.log(`Standalone prep copied ${label}.`)
}

if (!(await exists(standaloneDir))) {
  console.warn('Standalone prep skipped; .next/standalone was not found. Confirm output: "standalone" is enabled.')
  process.exit(0)
}

await copyDirectoryIfPresent(
  path.join(frontendRoot, 'public'),
  path.join(standaloneDir, 'public'),
  'public assets',
)

await copyDirectoryIfPresent(
  path.join(frontendRoot, '.next', 'static'),
  path.join(standaloneDir, '.next', 'static'),
  'Next static assets',
)
