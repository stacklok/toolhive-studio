import {
  type SecretsSecretParameter,
  type V1CreateRequest,
  type V1HeaderForwardConfig,
  type V1ListSecretsResponse,
  type V1UpdateRequest,
} from '@common/api/generated/types.gen'
import type { FormSchemaRemoteMcp } from '@/common/lib/workloads/remote/form-schema-remote-mcp'
import { omit } from '@/common/lib/utils'
import { getRemoteAuthFieldType } from '@/common/lib/workloads/remote/form-fields-util-remote'
import { REMOTE_MCP_AUTH_TYPES } from '@/common/lib/form-schema-mcp'

type FormHeaderForward = FormSchemaRemoteMcp['header_forward']

type HeaderSecretItem = NonNullable<
  NonNullable<FormHeaderForward>['add_headers_from_secret']
>[number]

/**
 * Extracts secrets from header_forward that need to be created.
 */
export function getHeaderForwardSecrets(
  headerForward: FormHeaderForward
): HeaderSecretItem['secret'][] {
  if (!headerForward?.add_headers_from_secret) return []
  return headerForward.add_headers_from_secret
    .filter(
      (item) => item.header_name.trim() && item.secret.value.secret.trim()
    )
    .map((item) => item.secret)
}

/**
 * Transforms form header_forward arrays to API record format.
 * Uses newlyCreatedSecrets to get actual secret names (handles naming collisions).
 */
function transformHeaderForwardToApi(
  headerForward: FormHeaderForward,
  newlyCreatedSecrets?: SecretsSecretParameter[]
): V1HeaderForwardConfig | undefined {
  if (!headerForward) return undefined

  const hasPlaintextHeaders =
    headerForward.add_plaintext_headers &&
    headerForward.add_plaintext_headers.length > 0
  const hasSecretHeaders =
    headerForward.add_headers_from_secret &&
    headerForward.add_headers_from_secret.length > 0

  if (!hasPlaintextHeaders && !hasSecretHeaders) return undefined

  const result: V1HeaderForwardConfig = {}

  if (hasPlaintextHeaders) {
    result.add_plaintext_headers = headerForward.add_plaintext_headers!.reduce(
      (acc, { header_name, header_value }) => {
        if (header_name.trim()) {
          acc[header_name] = header_value
        }
        return acc
      },
      {} as Record<string, string>
    )
  }

  if (hasSecretHeaders) {
    // Build a map of original secret names to actual created names
    const secretNameMap = new Map<string, string>()
    newlyCreatedSecrets?.forEach((created) => {
      if (created.name) {
        secretNameMap.set(created.target ?? created.name, created.name)
      }
    })

    result.add_headers_from_secret =
      headerForward.add_headers_from_secret!.reduce(
        (acc, { header_name, secret }) => {
          if (header_name.trim() && secret.value.secret.trim()) {
            // Use the actual created secret name if available, otherwise use the original
            const secretName = secret.value.isFromStore
              ? secret.name
              : (secretNameMap.get(secret.name) ?? secret.name)
            acc[header_name] = secretName
          }
          return acc
        },
        {} as Record<string, string>
      )
  }

  return result
}

/**
 * Transforms API header_forward records to form array format.
 */
function transformHeaderForwardToForm(
  headerForward: V1HeaderForwardConfig | undefined,
  availableSecretKeys: Set<string>
): FormHeaderForward {
  if (!headerForward) {
    return {
      add_plaintext_headers: [],
      add_headers_from_secret: [],
    }
  }

  return {
    add_plaintext_headers: headerForward.add_plaintext_headers
      ? Object.entries(headerForward.add_plaintext_headers).map(
          ([header_name, header_value]) => ({
            header_name,
            header_value,
          })
        )
      : [],
    add_headers_from_secret: headerForward.add_headers_from_secret
      ? Object.entries(headerForward.add_headers_from_secret).map(
          ([header_name, secret_name]) => ({
            header_name,
            secret: {
              name: secret_name,
              value: {
                secret: secret_name,
                isFromStore: availableSecretKeys.has(secret_name),
              },
            },
          })
        )
      : [],
  }
}

function getOAuthConfig(
  data: FormSchemaRemoteMcp,
  newlyCreatedSecrets?: SecretsSecretParameter[],
  clientSecretFallback?: string
) {
  const { oauth_config, auth_type } = data

  // Use the actual secret name from store if available (handles naming collisions)
  // For bearer_token auth, the secret is in bearer_token field
  // For oauth2/oidc auth, the secret is in client_secret field
  const isBearerAuth = auth_type === REMOTE_MCP_AUTH_TYPES.BearerToken
  const secretName = isBearerAuth
    ? (newlyCreatedSecrets?.[0]?.name ?? oauth_config.bearer_token?.name)
    : (newlyCreatedSecrets?.[0]?.name ?? clientSecretFallback)

  const oauthConfig = {
    ...oauth_config,
    scopes: oauth_config.scopes
      ? oauth_config.scopes.split(',').map((s: string) => s.trim())
      : [],
  }

  // Transform secrets from object to SecretsSecretParameter if they exist
  return oauthConfig
    ? {
        ...oauthConfig,
        client_secret:
          !isBearerAuth && oauth_config.client_secret && secretName
            ? ({
                name: secretName,
                target: secretName,
              } as SecretsSecretParameter)
            : undefined,
        bearer_token:
          isBearerAuth && oauth_config.bearer_token && secretName
            ? ({
                name: secretName,
                target: secretName,
              } as SecretsSecretParameter)
            : undefined,
      }
    : oauthConfig
}
/**
 * Combines the registry server definition, the form fields, and the newly
 * created secrets from the secret store into a single request object.
 * Auth secrets and header secrets are handled separately to avoid confusion.
 */
export function prepareCreateWorkloadData(
  data: FormSchemaRemoteMcp,
  createdAuthSecrets?: SecretsSecretParameter[],
  createdHeaderSecrets?: SecretsSecretParameter[]
): V1CreateRequest {
  const oauthConfig = getOAuthConfig(
    data,
    createdAuthSecrets,
    data.oauth_config.client_secret?.name
  )

  const request = {
    ...omit(
      { ...data },
      'auth_type',
      'secrets',
      'tools',
      'tools_override',
      'header_forward'
    ),
    oauth_config: oauthConfig,
    header_forward: transformHeaderForwardToApi(
      data.header_forward,
      createdHeaderSecrets
    ),
    tools: data.tools ?? undefined,
    tools_override: data.tools_override ?? undefined,
  }

  return request
}

/**
 * Transforms form data into an update request object.
 * Auth secrets and header secrets are handled separately to avoid confusion.
 */
export function prepareUpdateRemoteWorkloadData(
  data: FormSchemaRemoteMcp,
  createdAuthSecrets?: SecretsSecretParameter[],
  createdHeaderSecrets?: SecretsSecretParameter[]
): V1UpdateRequest {
  const oauthConfig = getOAuthConfig(
    data,
    createdAuthSecrets,
    data.oauth_config.client_secret?.value.secret
  )

  return {
    ...omit(
      { ...data },
      'auth_type',
      'secrets',
      'tools',
      'tools_override',
      'header_forward'
    ),
    oauth_config: oauthConfig,
    header_forward: transformHeaderForwardToApi(
      data.header_forward,
      createdHeaderSecrets
    ),
    tools: data.tools ?? undefined,
    tools_override: data.tools_override ?? undefined,
  }
}

// The type of the GET is V1CreateRequest
export function convertCreateRequestToFormData(
  createRequest: V1CreateRequest,
  availableSecrets?: V1ListSecretsResponse
): FormSchemaRemoteMcp {
  // Convert secrets from API format to form format
  const availableSecretKeys = new Set(
    availableSecrets?.keys
      ?.map((key) => key.key)
      .filter((key): key is string => Boolean(key)) || []
  )

  const secrets = (createRequest.secrets || []).map((secret) => {
    const secretKey = secret.name || ''
    const isFromStore = availableSecretKeys.has(secretKey)

    return {
      name: secret.target || '',
      value: {
        secret: secretKey,
        isFromStore,
      },
    }
  })

  const authType = getRemoteAuthFieldType(createRequest.oauth_config)

  const baseFormData: FormSchemaRemoteMcp = {
    name: createRequest.name || '',
    url: createRequest.url || '',
    transport: createRequest.transport as 'sse' | 'streamable-http',
    proxy_port: createRequest.proxy_port,
    oauth_config: {
      skip_browser: createRequest.oauth_config?.skip_browser ?? false,
      use_pkce: createRequest.oauth_config?.use_pkce ?? true,
      authorize_url: createRequest.oauth_config?.authorize_url,
      callback_port: createRequest.oauth_config?.callback_port,
      client_id: createRequest.oauth_config?.client_id,
      client_secret: createRequest.oauth_config?.client_secret
        ? {
            name: createRequest.oauth_config.client_secret.name || '',
            value: {
              secret: createRequest.oauth_config.client_secret.target || '',
              isFromStore: availableSecretKeys.has(
                createRequest.oauth_config.client_secret.target || ''
              ),
            },
          }
        : undefined,
      bearer_token: createRequest.oauth_config?.bearer_token
        ? {
            name: createRequest.oauth_config.bearer_token.name || '',
            value: {
              secret: createRequest.oauth_config.bearer_token.target || '',
              isFromStore: availableSecretKeys.has(
                createRequest.oauth_config.bearer_token.target || ''
              ),
            },
          }
        : undefined,
      issuer: createRequest.oauth_config?.issuer,
      oauth_params: createRequest.oauth_config?.oauth_params,
      scopes: Array.isArray(createRequest.oauth_config?.scopes)
        ? createRequest.oauth_config.scopes.join(',')
        : createRequest.oauth_config?.scopes || '',
      token_url: createRequest.oauth_config?.token_url,
    },
    header_forward: transformHeaderForwardToForm(
      createRequest.header_forward,
      availableSecretKeys
    ),
    auth_type: authType,
    secrets,
    group: createRequest.group ?? 'default',
    tools: createRequest.tools || undefined,
    tools_override: createRequest.tools_override || undefined,
  }

  return baseFormData
}
