import {
  type SecretsSecretParameter,
  type V1CreateRequest,
  type V1ListSecretsResponse,
  type V1UpdateRequest,
} from '@api/types.gen'
import type { FormSchemaRemoteMcp } from '@/common/lib/workloads/remote/form-schema-remote-mcp'
import { omit } from '@/common/lib/utils'

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
  const { oauth_config, ...rest } = data

  const oauthConfig = {
    ...oauth_config,
    scopes: oauth_config.scopes
      ? oauth_config.scopes.split(',').map((s: string) => s.trim())
      : [],
  }

  // Use the actual secret name from store if available (handles naming collisions)
  const secretName =
    newlyCreatedSecrets?.[0]?.name ?? oauth_config.client_secret?.name

  // Transform client_secret from object to SecretsSecretParameter if it exists
  const transformedOAuthConfig = oauthConfig
    ? {
        ...oauthConfig,
        client_secret:
          oauth_config.client_secret && secretName
            ? ({
                name: secretName,
                target: secretName,
              } as SecretsSecretParameter)
            : undefined,
      }
    : oauthConfig

  const request = {
    ...omit(rest, 'auth_type', 'secrets', 'tools', 'tools_override'),
    oauth_config: transformedOAuthConfig,
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
  const { oauth_config, ...rest } = data

  const oauthConfig = {
    ...oauth_config,
    scopes: oauth_config.scopes
      ? oauth_config.scopes.split(',').map((s: string) => s.trim())
      : [],
  }

  // Use the actual secret name from store if available (handles naming collisions)
  const secretName =
    newlyCreatedSecrets?.[0]?.name ?? oauth_config.client_secret?.value.secret

  // Transform client_secret from string to SecretsSecretParameter if it exists
  const transformedOAuthConfig = oauthConfig
    ? {
        ...oauthConfig,
        client_secret:
          oauth_config.client_secret && secretName
            ? ({
                name: secretName,
                target: secretName,
              } as SecretsSecretParameter)
            : undefined,
      }
    : oauthConfig

  return {
    ...omit(rest, 'auth_type', 'secrets', 'tools', 'tools_override'),
    oauth_config: transformedOAuthConfig,
    tools: data.tools ?? undefined,
    tools_override: data.tools_override ?? undefined,
  }
}

const getAuthType = (
  oauthConfig?: V1CreateRequest['oauth_config']
): 'oauth2' | 'oidc' | 'none' => {
  if (!oauthConfig) return 'none'
  if (oauthConfig.authorize_url) return 'oauth2'
  if (oauthConfig.issuer) return 'oidc'
  return 'none'
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

  const authType = getAuthType(createRequest.oauth_config)

  const baseFormData: FormSchemaRemoteMcp = {
    name: createRequest.name || '',
    url: createRequest.url || '',
    transport: createRequest.transport as 'sse' | 'streamable-http',
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
