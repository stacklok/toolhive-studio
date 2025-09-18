import {
  type PermissionsOutboundNetworkPermissions,
  type RegistryEnvVar,
  type RegistryImageMetadata,
  type RegistryRemoteServerMetadata,
  type SecretsSecretParameter,
  type V1CreateRequest,
} from '@api/types.gen'
import { getVolumes, mapEnvVars } from '@/common/lib/utils'
import type { FormSchemaRegistryMcp } from './form-schema-registry-mcp'
import type { FormSchemaRemoteMcp } from '@/common/lib/workloads/remote/form-schema-remote-mcp'

/**
 * Combines the registry server definition, the form fields, and the newly
 * created secrets from the secret store into a single request object.
 */
export function prepareCreateWorkloadData(
  server: RegistryImageMetadata,
  data: FormSchemaRegistryMcp,
  secrets: SecretsSecretParameter[] = []
): V1CreateRequest {
  // Extract and transform network isolation fields
  const { allowedHosts, allowedPorts, networkIsolation } = data
  const permission_profile = networkIsolation
    ? {
        network: {
          outbound: {
            allow_host:
              allowedHosts
                ?.map(({ value }: { value: string }) => value)
                .filter((host: string) => host.trim() !== '') ?? [],
            allow_port:
              allowedPorts
                ?.map(({ value }: { value: string }) => parseInt(value, 10))
                .filter((port: number) => !isNaN(port)) ?? [],
            insecure_allow_all: false,
          } as PermissionsOutboundNetworkPermissions,
        },
      }
    : undefined

  const volumes = getVolumes(data.volumes ?? [])

  return {
    name: data.name,
    image: server.image,
    transport: server.transport,
    env_vars: mapEnvVars(data.envVars),
    secrets,
    cmd_arguments: data.cmd_arguments || [],
    target_port: server.target_port,
    network_isolation: networkIsolation,
    permission_profile,
    volumes,
    // ...rest does not include the omitted fields
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
  createRequest: RegistryRemoteServerMetadata | null,
  secrets: RegistryEnvVar[],
  envVars: RegistryEnvVar[]
): FormSchemaRemoteMcp {
  if (!createRequest)
    return {
      name: '',
      url: '',
      transport: 'streamable-http',
      oauth_config: {
        skip_browser: false,
        use_pkce: true,
      },
      auth_type: 'none',
      envVars: [],
      secrets: [],
    }

  const authType = getAuthType(createRequest.oauth_config)

  const baseFormData: FormSchemaRemoteMcp = {
    name: createRequest.name || '',
    url: createRequest.url || '',
    transport: createRequest.transport as 'sse' | 'streamable-http',
    oauth_config: {
      skip_browser: false,
      use_pkce: createRequest.oauth_config?.use_pkce ?? true,
      authorize_url: createRequest.oauth_config?.authorize_url,
      callback_port: createRequest.oauth_config?.callback_port,
      client_id: createRequest.oauth_config?.client_id,
      client_secret: '',
      issuer: createRequest.oauth_config?.issuer,
      oauth_params: createRequest.oauth_config?.oauth_params,
      scopes: Array.isArray(createRequest.oauth_config?.scopes)
        ? createRequest.oauth_config.scopes.join(',')
        : createRequest.oauth_config?.scopes || '',
      token_url: createRequest.oauth_config?.token_url,
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
