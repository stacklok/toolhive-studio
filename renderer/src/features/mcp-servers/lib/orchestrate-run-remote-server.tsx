import {
  type SecretsSecretParameter,
  type V1CreateRequest,
  type V1ListSecretsResponse,
  type V1UpdateRequest,
} from '@api/types.gen'
import type { FormSchemaRemoteMcp } from '@/common/lib/workloads/remote/form-schema-remote-mcp'
import { omit } from '@/common/lib/utils'
import { getRemoteAuthFieldType } from '@/common/lib/workloads/remote/form-fields-util-remote'
import { REMOTE_MCP_AUTH_TYPES } from '@/common/lib/form-schema-mcp'

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
 * If newlyCreatedSecrets is provided, uses the actual secret name from the store
 * (handles naming collisions where secret_key becomes secret_key_2).
 */
export function prepareCreateWorkloadData(
  data: FormSchemaRemoteMcp,
  newlyCreatedSecrets?: SecretsSecretParameter[]
): V1CreateRequest {
  const oauthConfig = getOAuthConfig(
    data,
    newlyCreatedSecrets,
    data.oauth_config.client_secret?.name
  )

  const request = {
    ...omit({ ...data }, 'auth_type', 'secrets', 'tools', 'tools_override'),
    oauth_config: oauthConfig,
    tools: data.tools ?? undefined,
    tools_override: data.tools_override ?? undefined,
  }

  return request
}

/**
 * Transforms form data into an update request object.
 * If newlyCreatedSecrets is provided, uses the actual secret name from the store
 * (handles naming collisions where secret_key becomes secret_key_2).
 */
export function prepareUpdateRemoteWorkloadData(
  data: FormSchemaRemoteMcp,
  newlyCreatedSecrets?: SecretsSecretParameter[]
): V1UpdateRequest {
  const oauthConfig = getOAuthConfig(
    data,
    newlyCreatedSecrets,
    data.oauth_config.client_secret?.value.secret
  )

  return {
    ...omit({ ...data }, 'auth_type', 'secrets', 'tools', 'tools_override'),
    oauth_config: oauthConfig,
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
    availableSecrets?.keys?.map((key) => key.key).filter(Boolean) || []
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

  const baseFormData: Omit<FormSchemaRemoteMcp, 'proxy_mode'> = {
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
    auth_type: authType,
    secrets,
    group: createRequest.group ?? 'default',
    tools: createRequest.tools || undefined,
    tools_override: createRequest.tools_override || undefined,
  }

  return baseFormData
}
