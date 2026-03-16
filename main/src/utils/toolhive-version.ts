import {
  isCurrentVersionOlder,
  normalizeVersion,
} from '../../../utils/parse-release-version'
import { getAppVersion } from '../util'
import log from '../logger'
import * as Sentry from '@sentry/electron/main'

interface ReleasesJson {
  currentRelease: string
  releases: {
    version: string
    updateTo: {
      version: string
      pub_date: string
      name: string
      url: string
    }
  }[]
}

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

export async function fetchLatestRelease(span: Sentry.Span) {
  const currentVersion = getAppVersion()
  const channel = getChannel(currentVersion)

  log.info('[update] checking CloudFront for ToolHive update...')

  const response = await fetch(
    `https://releases.toolhive.dev/${channel}/latest/${process.platform}/${process.arch}/RELEASES.json`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )

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

  const data: ReleasesJson = await response.json()
  const latestTag = data.currentRelease

  const currentIsPrerelease = isCurrentVersionPrerelease(currentVersion)

  const isNewVersion = currentIsPrerelease
    ? latestTag !== undefined
    : isCurrentVersionOlder(currentVersion, normalizeVersion(latestTag ?? ''))

  span.setAttribute('latest_version', latestTag ?? 'unknown')
  span.setAttribute('is_new_version_available', isNewVersion)
  span.setStatus({ code: 1 })

  return {
    currentVersion,
    latestVersion: latestTag,
    isNewVersionAvailable: isNewVersion,
  }
}
