export function normalizeVersion(version: string): string {
  return version.startsWith('v') ? version.slice(1) : version
}

export function parseVersion(version: string): number[] {
  return normalizeVersion(version).split('.').map(Number)
}

export function isCurrentVersionOlder(
  currentVersionTag: string,
  latestVersionTag: string
): boolean {
  const currentVersion = parseVersion(currentVersionTag)
  const latestVersion = parseVersion(latestVersionTag)

  for (let i = 0; i < latestVersion.length; i++) {
    const part1 = currentVersion[i] || 0
    const part2 = latestVersion[i] || 0

    if (part1 < part2) return true
    if (part1 > part2) return false
  }

  return false
}
