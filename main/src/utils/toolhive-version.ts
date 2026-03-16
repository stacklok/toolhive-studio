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

function isCurrentVersionPrerelease(currentVersion: string): boolean {
  return (
    currentVersion.includes('-beta') ||
    currentVersion.includes('-alpha') ||
    currentVersion.includes('-rc')
  )
}

function getChannel(currentVersion: string): string {
  return isCurrentVersionPrerelease(currentVersion) ? 'pre-release' : 'stable'
}

function getManifestUrl(currentVersion: string): string {
  if (process.platform === 'linux') {
    return GITHUB_PAGES_MANIFEST
  }
  const channel = getChannel(currentVersion)
  return `https://releases.toolhive.dev/${channel}/latest/${process.platform}/${process.arch}/RELEASES.json`
}

function parseLatestVersion(
  data: ReleasesJson | LatestManifest
): string | undefined {
  if ('currentRelease' in data) {
    return data.currentRelease
  }
  return data.tag
}

export async function fetchLatestRelease(span: Sentry.Span) {
  const currentVersion = getAppVersion()
  const url = getManifestUrl(currentVersion)

  log.info('[update] checking for latest ToolHive release...')

  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    log.error(
      '[update] Failed to check for ToolHive update: ',
      response.statusText
    )
    span.setStatus({
      code: 2,
      message: `HTTP ${response.status}: ${response.statusText}`,
    })
    return {
      currentVersion,
      latestVersion: undefined,
      isNewVersionAvailable: false,
    }
  }

  const data = await response.json()
  const latestTag = parseLatestVersion(data)

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
