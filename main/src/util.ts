import { app } from 'electron'
import { execSync } from 'node:child_process'

function getVersionFromGit(): string {
  try {
    const exactTag = execSync('git describe --exact-match --tags HEAD', {
      encoding: 'utf8',
      stdio: 'pipe',
    }).trim()

    return exactTag.replace(/^v/, '')
  } catch {
    try {
      const describe = execSync('git describe --tags --always', {
        encoding: 'utf8',
        stdio: 'pipe',
      }).trim()

      const version = describe.replace(/^v/, '').split('-')[0]
      return version ?? app.getVersion()
    } catch {
      return app.getVersion()
    }
  }
}

export function getAppVersion(): string {
  if (process.env.SENTRY_RELEASE) {
    return process.env.SENTRY_RELEASE
  }

  return getVersionFromGit()
}
