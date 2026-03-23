import {
  isCurrentVersionOlder,
  normalizeVersion,
} from '../../../utils/parse-release-version'
import { getAppVersion } from '../util'
import log from '../logger'
import * as Sentry from '@sentry/electron/main'

interface ReleasesJson {
  currentRelease: string
}

interface LatestManifest {
  tag: string
}

const GITHUB_PAGES_MANIFEST =
  'https://stacklok.github.io/toolhive-studio/latest/index.json'

export function getChannel(currentVersion: string): string {
  const isPrerelease =
    currentVersion.includes('-beta') ||
    currentVersion.includes('-alpha') ||
    currentVersion.includes('-rc')
  return isPrerelease ? 'pre-release' : 'stable'
}

export function getManifestUrl(currentVersion: string): string {
  const channel = getChannel(currentVersion)
  switch (process.platform) {
    case 'darwin':
      return `https://releases.toolhive.dev/${channel}/latest/darwin/${process.arch}/RELEASES.json`
    case 'win32':
      return `https://releases.toolhive.dev/${channel}/latest/win32/${process.arch}/RELEASES`
    default:
      return GITHUB_PAGES_MANIFEST
  }
}

export function parseVersionFromSquirrelReleases(
  text: string
): string | undefined {
  const match = text.match(/ToolHive-(.+?)-full\.nupkg/)
  return match?.[1]
}

function parseLatestVersion(
  data: ReleasesJson | LatestManifest
): string | undefined {
  if ('currentRelease' in data) {
    return data.currentRelease
  }
  return data.tag
}

async function fetchLatestVersionFromUrl(
  url: string
): Promise<string | undefined> {
  const response = await fetch(url)
  if (!response.ok) return undefined

  if (url.endsWith('/RELEASES')) {
    const text = await response.text()
    return parseVersionFromSquirrelReleases(text)
  }

  const data = await response.json()
  return parseLatestVersion(data)
}

export async function fetchLatestRelease(span: Sentry.Span) {
  const currentVersion = getAppVersion()
  const url = getManifestUrl(currentVersion)

  log.info('[update] checking for latest ToolHive release...')

  const latestTag = await fetchLatestVersionFromUrl(url)

  if (!latestTag) {
    log.error('[update] Failed to check for ToolHive update from: ', url)
    span.setStatus({
      code: 2,
      message: `Failed to fetch latest version from ${url}`,
    })
    return {
      currentVersion,
      latestVersion: undefined,
      isNewVersionAvailable: false,
    }
  }

  const isNewVersion = isCurrentVersionOlder(
    normalizeVersion(currentVersion),
    normalizeVersion(latestTag ?? '')
  )

  span.setAttribute('latest_version', latestTag ?? 'unknown')
  span.setAttribute('is_new_version_available', isNewVersion)
  span.setStatus({ code: 1 })

  return {
    currentVersion,
    latestVersion: latestTag,
    isNewVersionAvailable: isNewVersion,
  }
}
