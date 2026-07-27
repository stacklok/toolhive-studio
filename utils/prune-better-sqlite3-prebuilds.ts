import fs from 'node:fs'
import path from 'node:path'

/**
 * Prebuild basenames to keep for a given Electron packager target.
 *
 * Linux ships both glibc and musl variants; better-sqlite3 picks at runtime.
 * Other platforms only need the matching `${platform}-${arch}.node`.
 */
export function getBetterSqlite3PrebuildNames(
  platform: NodeJS.Platform,
  arch: NodeJS.Architecture
): Set<string> {
  const names = new Set<string>()

  if (platform === 'linux') {
    names.add(`linux-${arch}.node`)
    names.add(`linuxmusl-${arch}.node`)
    return names
  }

  if (platform === 'darwin' || platform === 'win32') {
    names.add(`${platform}-${arch}.node`)
  }

  return names
}

/** Remove prebuilds for other platforms/architectures from a packaged app tree. */
export function pruneBetterSqlite3Prebuilds(
  prebuildsDir: string,
  platform: NodeJS.Platform,
  arch: NodeJS.Architecture
): void {
  const keep = getBetterSqlite3PrebuildNames(platform, arch)

  for (const entry of fs.readdirSync(prebuildsDir)) {
    if (entry.endsWith('.node') && !keep.has(entry)) {
      fs.unlinkSync(path.join(prebuildsDir, entry))
    }
  }
}
