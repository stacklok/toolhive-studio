import {
  type RegistryEnvVar,
  type RegistryRemoteServerMetadata,
  type V1CreateRequest,
} from '@api/types.gen'
import type { FormSchemaRemoteMcp } from '@/common/lib/workloads/remote/form-schema-remote-mcp'

const getAuthType = (
  oauthConfig?: V1CreateRequest['oauth_config']
): 'oauth2' | 'oidc' | 'none' => {
  if (!oauthConfig) return 'none'
  if (oauthConfig.authorize_url) return 'oauth2'
  if (oauthConfig.issuer) return 'oidc'
  return 'none'
}

export function convertCreateRequestToFormData(
  createRequest: RegistryRemoteServerMetadata,
  secrets: RegistryEnvVar[],
  envVars: RegistryEnvVar[]
): FormSchemaRemoteMcp {
  const authType = getAuthType(createRequest.oauth_config)
  const baseFormData: FormSchemaRemoteMcp = {
    name: createRequest.name || '',
    url: createRequest.url || '',
    transport: createRequest.transport as 'sse' | 'streamable-http',
    oauth_config: {
      skip_browser: false,
      use_pkce: createRequest.oauth_config?.use_pkce ?? true,
      authorize_url: createRequest.oauth_config?.authorize_url ?? '',
      callback_port: createRequest.oauth_config?.callback_port,
      client_id: createRequest.oauth_config?.client_id ?? '',
      client_secret: undefined,
      issuer: createRequest.oauth_config?.issuer ?? '',
      oauth_params: undefined,
      scopes: Array.isArray(createRequest.oauth_config?.scopes)
        ? createRequest.oauth_config.scopes.join(',')
        : createRequest.oauth_config?.scopes || '',
      token_url: createRequest.oauth_config?.token_url ?? '',
    },
    auth_type: authType,
    envVars: envVars.map((e) => ({
      name: e.name || '',
      value: e.default || '',
    })),
    secrets: secrets.map((s) => ({
      name: s.name || '',
      value: { secret: s.default || '', isFromStore: false },
    })),
  }

  return baseFormData
}
