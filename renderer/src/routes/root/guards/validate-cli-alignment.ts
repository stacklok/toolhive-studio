import { redirect } from '@tanstack/react-router'
import log from 'electron-log/renderer'

const SKIP_ROUTES = ['/cli-issue', '/shutdown']

const ACTIONABLE_STATUSES = [
  'external-cli-found',
  'symlink-broken',
  'symlink-tampered',
]

/**
 * Verifies that the bundled ToolHive CLI binary is correctly symlinked and
 * not shadowed by an external installation.
 * Redirects to /cli-issue when an actionable problem is detected
 * (external-cli-found, symlink-broken, symlink-tampered).
 * Skipped when the user is already on /cli-issue or /shutdown to avoid
 * redirect loops.
 */
export async function validateCliAlignment(pathname: string): Promise<void> {
  if (SKIP_ROUTES.includes(pathname)) return

  const validationResult =
    await window.electronAPI.cliAlignment.getValidationResult()

  if (
    validationResult &&
    ACTIONABLE_STATUSES.includes(validationResult.status)
  ) {
    log.info(
      `[beforeLoad] CLI validation issue: ${validationResult.status}, redirecting to /cli-issue`
    )
    throw redirect({ to: '/cli-issue' })
  }
}
