import type { RegistryFormData } from './schema'
import { REGISTRY_FORM_TYPE } from './utils'

export const REGISTRY_WRONG_AUTH_TOAST =
  'Authentication failed. Check your Client ID'

export const REGISTRY_WRONG_ISSUER_TOAST =
  'Failed to configure OAuth. Check your Issuer URL.'

export const OIDC_DISCOVERY_PATTERN = 'OIDC discovery failed'

export const AUTH_FIELDS_REQUIRED_PATTERN =
  'auth.issuer and auth.client_id are required'

export const REGISTRY_AUTH_FIELDS_REQUIRED_TOAST =
  'Both Client ID and Issuer URL are required'

export const REGISTRY_AUTH_TOAST_ID = 'registry-auth-required'

const REGISTRY_AUTH_REQUIRED_CODE = 'registry_auth_required'
const REGISTRY_UNAVAILABLE_CODE = 'registry_unavailable'

/** Shown when GET /api/v1beta/registry fails with `code: registry_auth_required` (Registry Server API + OAuth). */
export const REGISTRY_AUTH_REQUIRED_UI_MESSAGE =
  'The configured registry server requires authentication. Please provide your Server URL, Client ID and Issuer URL to authenticate.'

/** Persistent toast shown when the app detects the registry auth error on startup. */
export const REGISTRY_AUTH_REQUIRED_TOAST_MESSAGE =
  'The configured registry requires authentication. The app will not work correctly until the registry is fixed or reset to default.'

/** Persistent toast shown when the app detects the registry is unreachable on startup. */
export const REGISTRY_UNAVAILABLE_TOAST_MESSAGE =
  'The configured registry is unreachable. The app will not work correctly until the registry URL is fixed or reset to default.'

/** Returns the appropriate toast message for a registry config error. */
export function getRegistryErrorToastMessage(
  error: unknown
): string | undefined {
  if (isRegistryAuthRequiredError(error))
    return REGISTRY_AUTH_REQUIRED_TOAST_MESSAGE
  if (isRegistryUnavailableError(error))
    return REGISTRY_UNAVAILABLE_TOAST_MESSAGE
  return undefined
}

/** Fallback when GET /api/v1beta/registry fails for any other reason (or non-api_url types). */
const REGISTRY_LIST_LOAD_FALLBACK_MESSAGE =
  'Failed to load registry configuration. The registry source may be misconfigured or unavailable.'

function getErrorField(error: unknown, field: string): string | undefined {
  if (!error || typeof error !== 'object') return undefined
  return (error as Record<string, unknown>)[field] as string | undefined
}

export function isRegistryAuthRequiredError(error: unknown): boolean {
  return getErrorField(error, 'code') === REGISTRY_AUTH_REQUIRED_CODE
}

export function isRegistryUnavailableError(error: unknown): boolean {
  return getErrorField(error, 'code') === REGISTRY_UNAVAILABLE_CODE
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

/** Shown in the registry error page when the upstream registry is unreachable. */
export const REGISTRY_UNAVAILABLE_UI_MESSAGE =
  'The upstream registry is unreachable or the API URL is misconfigured. Please check your Registry Server API URL in the settings.'

export const REGISTRY_UNAVAILABLE_SOURCE_MESSAGE =
  'The Registry Server API URL is not correct. Make sure it points to a valid MCP Registry API endpoint.'

/** Extracts the misconfigured registry URL from the raw API error message. */
export function getRegistryUnavailableUrl(error: unknown): string | undefined {
  if (!isRegistryUnavailableError(error)) return undefined
  const raw = getErrorField(error, 'message') ?? ''
  const match = raw.match(/upstream registry at (\S+) is unavailable/)
  return match?.[1]
}

/**
 * Message under the registry source field when GET /api/v1beta/registry failed.
 * Uses OAuth-specific copy only for Registry Server API when `registryAuthRequiredMessage` is set.
 */
export function resolveRegistryListLoadErrorMessage(
  registryType: RegistryFormData['type'],
  registryAuthRequiredMessage?: string
): string {
  if (
    registryType === REGISTRY_FORM_TYPE.API_URL &&
    registryAuthRequiredMessage
  ) {
    return registryAuthRequiredMessage
  }
  return REGISTRY_LIST_LOAD_FALLBACK_MESSAGE
}
