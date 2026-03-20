import type { RegistryFormData } from './schema'

export const REGISTRY_WRONG_AUTH_TOAST =
  'Authentication failed. Check your Client ID'

export const REGISTRY_WRONG_ISSUER_TOAST =
  'Failed to configure OAuth. Check your Issuer URL.'

export const OIDC_DISCOVERY_PATTERN = 'OIDC discovery failed'

const REGISTRY_AUTH_REQUIRED_CODE = 'registry_auth_required'

/** Shown when GET /api/v1beta/registry fails with `code: registry_auth_required` (API Server API + OAuth). */
export const REGISTRY_AUTH_REQUIRED_UI_MESSAGE =
  'There is an issue with your registry configuration. Please check your authentication configuration (Client ID and Issuer), then try again.'

/** Fallback when GET /api/v1beta/registry fails for any other reason (or non-api_url types). */
export const REGISTRY_LIST_LOAD_FALLBACK_MESSAGE =
  'Failed to load registry configuration. The registry source may be misconfigured or unavailable.'

export function isRegistryAuthRequiredError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }
  return (error as Record<string, unknown>).code === REGISTRY_AUTH_REQUIRED_CODE
}

/**
 * Detects structured errors from GET /api/v1beta/registry when the backend
 * requires OAuth. Returns our UI copy — not the raw API `message` (e.g. no CLI hints).
 */
export function getRegistryAuthRequiredMessage(
  error: unknown
): string | undefined {
  if (isRegistryAuthRequiredError(error)) {
    return REGISTRY_AUTH_REQUIRED_UI_MESSAGE
  }
  return undefined
}

/**
 * Message under the registry source field when GET /api/v1beta/registry failed.
 * Uses OAuth-specific copy only for Registry Server API when `registryAuthRequiredMessage` is set.
 */
export function resolveRegistryListLoadErrorMessage(
  registryType: RegistryFormData['type'],
  registryAuthRequiredMessage?: string
): string {
  if (registryType === 'api_url' && registryAuthRequiredMessage) {
    return registryAuthRequiredMessage
  }
  return REGISTRY_LIST_LOAD_FALLBACK_MESSAGE
}
