import type { RegistryRemoteServerMetadata } from '@common/api/registry-types'
import type { GithubComStacklokToolhivePkgSecretsSecretParameter as SecretsSecretParameter } from '@common/api/generated/types.gen'
import type { FormSchemaRemoteMcp } from '@/common/lib/workloads/remote/form-schema-remote-mcp'
import {
  REMOTE_MCP_AUTH_TYPES,
  type RemoteMcpAuthType,
} from '@/common/lib/form-schema-mcp'

type RegistrySecretReference = SecretsSecretParameter | string | undefined

const getSecretReferenceName = (secret: RegistrySecretReference) => {
  if (!secret) return undefined
  if (typeof secret === 'string') return secret
  return secret.name || secret.target
}

const convertSecretReferenceToFormValue = (secret: RegistrySecretReference) => {
  const secretName = getSecretReferenceName(secret)
  return secretName
    ? {
        name: secretName,
        value: {
          secret: secretName,
          isFromStore: true,
        },
      }
    : undefined
}

const getRegistryRemoteAuthFieldType = (
  oauthConfig: RegistryRemoteServerMetadata['oauth_config']
): RemoteMcpAuthType => {
  if (!oauthConfig) return REMOTE_MCP_AUTH_TYPES.AutoDiscovered
  if (oauthConfig.bearer_token) return REMOTE_MCP_AUTH_TYPES.BearerToken
  if (oauthConfig.authorize_url) return REMOTE_MCP_AUTH_TYPES.OAuth2
  if (oauthConfig.issuer) return REMOTE_MCP_AUTH_TYPES.OIDC
  return REMOTE_MCP_AUTH_TYPES.AutoDiscovered
}

export function convertCreateRequestToFormData(
  createRequest: RegistryRemoteServerMetadata
): FormSchemaRemoteMcp {
  const authType = getRegistryRemoteAuthFieldType(createRequest.oauth_config)
  const baseFormData: FormSchemaRemoteMcp = {
    name: (createRequest.name || '').split('/').pop() || '',
    url: createRequest.url || '',
    transport: createRequest.transport as 'sse' | 'streamable-http',
    proxy_port: undefined,
    oauth_config: {
      skip_browser: false,
      use_pkce: createRequest.oauth_config?.use_pkce ?? true,
      authorize_url: createRequest.oauth_config?.authorize_url ?? '',
      callback_port: createRequest.oauth_config?.callback_port,
      client_id: createRequest.oauth_config?.client_id ?? '',
      client_secret: convertSecretReferenceToFormValue(
        createRequest.oauth_config?.client_secret
      ),
      bearer_token: convertSecretReferenceToFormValue(
        createRequest.oauth_config?.bearer_token
      ),
      issuer: createRequest.oauth_config?.issuer ?? '',
      oauth_params: undefined,
      scopes: Array.isArray(createRequest.oauth_config?.scopes)
        ? createRequest.oauth_config.scopes.join(',')
        : createRequest.oauth_config?.scopes || '',
      token_url: createRequest.oauth_config?.token_url ?? '',
    },
    auth_type: authType,
    group: 'default',
    secrets: [],
  }

  return baseFormData
}
