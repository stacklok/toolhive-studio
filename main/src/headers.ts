import { getAppVersion, isOfficialReleaseBuild } from './util'

export function getHeaders() {
  const appVersion = getAppVersion()
  const isReleaseBuild = isOfficialReleaseBuild()
  return {
    'X-Client-Type': 'toolhive-studio',
    'X-Client-Version': appVersion,
    'X-Client-Platform': process.platform,
    'X-Client-Release-Build': isReleaseBuild,
  }
}
