import { type GithubComStacklokToolhivePkgSecretsSecretParameter as SecretsSecretParameter } from '@common/api/generated/types.gen'
import type {
  PermissionsOutboundNetworkPermissions,
  RegistryImageMetadata,
  V1CreateRequest,
} from '@common/api/registry-types'
import { getVolumes, mapEnvVars } from '@/common/lib/utils'
import {
  ALLOWED_DESTINATIONS,
  NETWORK_ACCESS_MODES,
} from '@/common/lib/form-schema-mcp'
import type { FormSchemaRegistryMcp } from './form-schema-registry-mcp'

/**
 * Combines the registry server definition, the form fields, and the newly
 * created secrets from the secret store into a single request object.
 */
export function prepareCreateWorkloadData(
  server: RegistryImageMetadata,
  data: FormSchemaRegistryMcp,
  secrets: SecretsSecretParameter[] = []
): V1CreateRequest {
  // Extract and transform network access fields
  const {
    allowedHosts,
    allowedPorts,
    networkAccess,
    allowedDestinations,
    allowHostAccess,
  } = data
  const filteredHosts =
    allowedHosts
      ?.map(({ value }: { value: string }) => value)
      .filter((host: string) => host.trim() !== '') ?? []
  const filteredPorts =
    allowedPorts
      ?.map(({ value }: { value: string }) => parseInt(value, 10))
      .filter((port: number) => !isNaN(port)) ?? []

  const permission_profile =
    networkAccess === NETWORK_ACCESS_MODES.Proxy
      ? {
          network: {
            outbound: {
              allow_host:
                allowedDestinations === ALLOWED_DESTINATIONS.Selected
                  ? filteredHosts
                  : [],
              allow_port:
                allowedDestinations === ALLOWED_DESTINATIONS.Selected
                  ? filteredPorts
                  : [],
              insecure_allow_all:
                allowedDestinations === ALLOWED_DESTINATIONS.Anywhere,
            } as PermissionsOutboundNetworkPermissions,
          },
        }
      : networkAccess === NETWORK_ACCESS_MODES.Host
        ? { network: { mode: 'host' } }
        : undefined

  const volumes = getVolumes(data.volumes ?? [])

  return {
    name: data.name,
    image: server.image,
    transport: server.transport,
    proxy_mode: data.proxy_mode,
    proxy_port: data.proxy_port,
    env_vars: mapEnvVars(data.envVars),
    secrets,
    cmd_arguments: data.cmd_arguments || [],
    target_port: server.target_port,
    network_isolation: networkAccess === NETWORK_ACCESS_MODES.Proxy,
    permission_profile,
    allow_docker_gateway:
      networkAccess === NETWORK_ACCESS_MODES.Proxy
        ? allowHostAccess
        : undefined,
    volumes,
    // Tag the request as a registry install so the API records the source
    // registry on the workload. `name` is the workload name (user-editable
    // and may diverge from the registry entry name when the user installs
    // the same server twice into different groups), so the canonical
    // registry entry name from `server.name` is sent separately. Without
    // these fields the API treats the request as a direct image install
    // and policy gates that allow only registry servers reject it.
    registry: 'default',
    server: server.name,
  }
}
