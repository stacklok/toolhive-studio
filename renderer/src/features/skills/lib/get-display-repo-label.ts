/**
 * Produces a human-readable label for a repository URL intended for UI
 * surfaces like card subheadings or detail-page badges.
 *
 * - GitHub URLs collapse to `org/repo`.
 * - Other hosts collapse to `host/path` with `www.` and `.git`/trailing
 *   slashes stripped.
 * - Returns `null` when the URL is missing or unparseable so callers can
 *   omit the element entirely.
 */
export function getDisplayRepoLabel(
  url: string | undefined | null
): string | null {
  if (!url) return null

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  const host = parsed.hostname.replace(/^www\./, '')
  const path = parsed.pathname.replace(/^\/+|\/+$/g, '').replace(/\.git$/, '')
  if (!path) return null

  if (host === 'github.com') {
    const [org, repo] = path.split('/')
    return org && repo ? `${org}/${repo}` : null
  }

  return `${host}/${path}`
}
