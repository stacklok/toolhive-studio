import {
  isCurrentVersionOlder,
  normalizeVersion,
} from '../../../utils/parse-release-version'
import { getAppVersion } from '../util'
import log from '../logger'
import * as Sentry from '@sentry/electron/main'

interface ReleaseAsset {
  name: string
  url: string
  size: number
  sha256: string
}

interface ReleaseInfo {
  tag: string
  prerelease: boolean
  published_at: string
  base_url: string
  assets: ReleaseAsset[]
}

/**
 * Gets all download assets for the current platform
 * @param releaseInfo - The release information from the API
 * @returns The tag of the release
 */
function getAssetsTagByPlatform(releaseInfo: ReleaseInfo): string | undefined {
  const platform = process.platform

  // Map platform to asset name patterns
  const assetPatterns: Record<string, string[]> = {
    darwin: ['darwin-arm64', 'darwin-x64'],
    win32: ['win32-x64', 'Setup.exe'],
    linux: ['linux-x64', 'amd64'],
  }

  const patterns = assetPatterns[platform]
  if (!patterns) {
    log.error(`[update] Unsupported platform: ${platform}`)
    return
  }

  const assets = releaseInfo.assets.filter((asset) => {
    const assetName = asset.name.toLowerCase()
    return patterns.some((pattern) => assetName.includes(pattern.toLowerCase()))
  })

  if (assets.length > 0) {
    return releaseInfo.tag
  } else {
    log.error(`[update] No assets found for patterns: ${patterns.join(', ')}`)
    return
  }
}

function isCurrentVersionPrerelease(
  currentVersion: string,
  releaseData: ReleaseInfo
): boolean {
  return (
    currentVersion.includes('-beta') ||
    currentVersion.includes('-alpha') ||
    currentVersion.includes('-rc') ||
    releaseData.prerelease === true
  )
}

export async function fetchLatestRelease(span: Sentry.Span) {
  const currentVersion = getAppVersion()
  log.info('[update] checking github pages for ToolHive update...')
  const response = await fetch(
    'https://stacklok.github.io/toolhive-studio/latest',
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
      currentVersion: currentVersion,
      latestVersion: undefined,
      isNewVersionAvailable: false,
    }
  }

  const data = await response.json()
  const latestTag = getAssetsTagByPlatform(data)

  // If current version is a prerelease (contains -beta, -alpha, -rc) OR data.prerelease is true,
  // always consider it as older than ANY latest version
  // This allows testing updates even when running a prerelease build
  const currentIsPrerelease = isCurrentVersionPrerelease(currentVersion, data)

  const isNewVersion = currentIsPrerelease
    ? latestTag !== undefined // If prerelease, any latest tag is considered new
    : isCurrentVersionOlder(currentVersion, normalizeVersion(latestTag ?? ''))

  span.setAttribute('latest_version', latestTag ?? 'unknown')
  span.setAttribute('is_new_version_available', isNewVersion)
  span.setStatus({ code: 1 })

  return {
    currentVersion: currentVersion,
    latestVersion: latestTag,
    isNewVersionAvailable: isNewVersion,
  }
}
