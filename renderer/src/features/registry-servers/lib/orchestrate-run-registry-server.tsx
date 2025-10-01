import {
  type PermissionsOutboundNetworkPermissions,
  type RegistryImageMetadata,
  type SecretsSecretParameter,
  type V1CreateRequest,
} from '@api/types.gen'
import { getVolumes, mapEnvVars } from '@/common/lib/utils'
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
