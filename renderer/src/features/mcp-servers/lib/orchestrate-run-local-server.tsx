import { type UseMutateAsyncFunction } from '@tanstack/react-query'
import {
  type CoreWorkload,
  type PermissionsOutboundNetworkPermissions,
  type PostApiV1BetaSecretsDefaultKeysData,
  type SecretsSecretParameter,
  type V1CreateRequest,
  type V1CreateSecretResponse,
  type V1UpdateRequest,
  type V1ListSecretsResponse,
} from '@api/types.gen'
import type { Options } from '@api/client'
import type { DefinedSecret, PreparedSecret } from '@/common/types/secrets'
import { getVolumes, mapEnvVars } from '@/common/lib/utils'
import type { FormSchemaLocalMcp } from './form-schema-local-mcp'

type SaveSecretFn = UseMutateAsyncFunction<
  V1CreateSecretResponse,
  string,
  Options<PostApiV1BetaSecretsDefaultKeysData>,
  unknown
>

/**
 * Takes all of the secrets from the form and saves them serially to the
 * secret store. Accepts a `toastId`, which it uses to provide feedback on the
 * progress of the operation.
 * // NOTE: We add a short, arbitrary delay to allow the `toast` message that
 * displays progress to show up-to-date progress.
 */
export async function saveSecrets(
  secrets: PreparedSecret[],
  saveSecret: SaveSecretFn,
  onSecretSuccess: (completedCount: number, secretsCount: number) => void,
  onSecretError: (
    error: string,
    variables: Options<PostApiV1BetaSecretsDefaultKeysData>
  ) => void
): Promise<SecretsSecretParameter[]> {
  const secretsCount: number = secrets.length
  let completedCount: number = 0
  const createdSecrets: SecretsSecretParameter[] = []

  for (const { secretStoreKey, target, value } of secrets) {
    const { key: createdKey } = await saveSecret(
      {
        body: { key: secretStoreKey, value },
      },
      {
        onError: (error, variables) => {
          onSecretError(error, variables)
        },
        onSuccess: () => {
          completedCount++
          onSecretSuccess(completedCount, secretsCount)
        },
      }
    )

    if (!createdKey) {
      throw new Error(`Failed to create secret for key "${secretStoreKey}"`)
    }

    // The arbitrary delay a UX/UI affordance to allow the user to see the progress
    // of the operation. This is not strictly necessary, but it helps to avoid
    // confusion when many secrets are being created in quick succession.
    // The delay is between 100 and 500ms
    await new Promise((resolve) =>
      setTimeout(
        resolve,
        process.env.NODE_ENV === 'test'
          ? 0
          : Math.floor(Math.random() * 401) + 100
      )
    )
    createdSecrets.push({
      /** The name of the secret in the secret store */
      name: createdKey,
      /** The property in the MCP server's config that we are mapping the secret to */
      target: target,
    })
  }

  return createdSecrets
}

/**
 * Transforms the type specific (e.g. docker vs package manager) data from the
 * form into a request object that can be sent to the API.
 */
function transformTypeSpecificData(
  values: FormSchemaLocalMcp
): V1CreateRequest {
  const type = values.type
  switch (type) {
    case 'docker_image': {
      return {
        name: values.name,
        transport: values.transport,
        image: values.image,
      }
    }
    case 'package_manager': {
      return {
        name: values.name,
        transport: values.transport,
        image: `${values.protocol}://${values.package_name}`,
      }
    }
    default:
      throw new Error(`Unsupported type: ${type}`)
  }
}

/**
 * Combines the registry server definition, the form fields, and the newly
 * created secrets from the secret store into a single request object.
 */
export function prepareCreateWorkloadData(
  data: FormSchemaLocalMcp,
  secrets: SecretsSecretParameter[] = []
): V1CreateRequest {
  const request = transformTypeSpecificData(data)

  // Extract and transform fields with proper typing
  const cmd_arguments = data.cmd_arguments as string[] | undefined
  const envVars = data.envVars as
    | Array<{ name: string; value?: string }>
    | undefined
  const allowedHosts = data.allowedHosts as Array<{ value: string }> | undefined
  const allowedPorts = data.allowedPorts as Array<{ value: string }> | undefined
  const networkIsolation = data.networkIsolation as boolean | undefined
  const volumes = data.volumes as
    | Array<{ host: string; container: string; accessMode?: 'ro' | 'rw' }>
    | undefined

  request.cmd_arguments = cmd_arguments || []
  request.env_vars = mapEnvVars(envVars || [])
  request.secrets = secrets
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

  return {
    ...request,
    network_isolation: networkIsolation,
    permission_profile,
    volumes: getVolumes(volumes ?? []),
  }
}

/**
 * Converts a CoreWorkload back to form data for editing
 */
export function convertWorkloadToFormData(
  workload: CoreWorkload
): FormSchemaLocalMcp {
  const image = workload.package || ''

  // Determine type based on image format
  const isPackageManager =
    image.includes('://') &&
    ['npx://', 'uvx://', 'go://'].some((protocol) => image.startsWith(protocol))

  const baseFormData = {
    name: workload.name || '',
    transport: (workload.transport_type || 'stdio') as
      | 'sse'
      | 'stdio'
      | 'streamable-http',
    target_port: workload.port,
    cmd_arguments: [],
    envVars: [],
    secrets: [],
    networkIsolation: false,
    allowedHosts: [],
    allowedPorts: [],
    volumes: [],
  }

  if (isPackageManager) {
    const [protocol, packageName] = image.split('://')
    return {
      ...baseFormData,
      type: 'package_manager',
      protocol: (protocol || 'npx') as 'npx' | 'uvx' | 'go',
      package_name: packageName || '',
    }
  } else {
    return {
      ...baseFormData,
      type: 'docker_image',
      image: image || '',
    }
  }
}

/**
 * A utility function to filter out secrets that are not defined.
 */
export function getDefinedSecrets(
  secrets: FormSchemaLocalMcp['secrets']
): DefinedSecret[] {
  return secrets.reduce<DefinedSecret[]>((acc, { name, value }) => {
    if (name && value.secret) {
      acc.push({
        name,
        value: {
          secret: value.secret,
          isFromStore: value.isFromStore ?? false,
        },
      })
    }
    return acc
  }, [])
}

// The type of the GET is V1CreateRequest
export function convertCreateRequestToFormData(
  createRequest: V1CreateRequest,
  availableSecrets?: V1ListSecretsResponse
): FormSchemaLocalMcp {
  const image = createRequest.image || ''

  // Determine type based on image format
  const isPackageManager =
    image.includes('://') &&
    ['npx://', 'uvx://', 'go://'].some((protocol) => image.startsWith(protocol))

  // Validate and safely cast transport value
  const validTransports = ['sse', 'stdio', 'streamable-http'] as const
  type ValidTransport = (typeof validTransports)[number]
  const isValidTransport = (
    value: string | undefined
  ): value is ValidTransport =>
    Boolean(value && validTransports.includes(value as ValidTransport))

  const transport = isValidTransport(createRequest.transport)
    ? createRequest.transport
    : 'stdio'

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

  const baseFormData = {
    name: createRequest.name || '',
    transport,
    target_port: transport === 'stdio' ? 0 : createRequest.target_port,
    cmd_arguments: createRequest.cmd_arguments || [],
    envVars: Object.entries(createRequest.env_vars || {}).map(
      ([name, value]) => ({ name, value })
    ),
    secrets,
    networkIsolation: createRequest.network_isolation || false,
    allowedHosts:
      createRequest.permission_profile?.network?.outbound?.allow_host?.map(
        (value) => ({ value })
      ) || [],
    allowedPorts:
      createRequest.permission_profile?.network?.outbound?.allow_port?.map(
        (port) => ({ value: port.toString() })
      ) || [],
    volumes:
      createRequest.volumes?.map((vol) => {
        // Parse volume string format "host:container:mode"
        const parts = vol.split(':')
        return {
          host: parts[0] || '',
          container: parts[1] || '',
          accessMode: (parts[2] as 'ro' | 'rw') || 'rw',
        }
      }) || [],
  }

  if (isPackageManager) {
    const [protocol, packageName] = image.split('://')
    return {
      ...baseFormData,
      type: 'package_manager',
      protocol: (protocol || 'npx') as 'npx' | 'uvx' | 'go',
      package_name: packageName || '',
    }
  } else {
    return {
      ...baseFormData,
      type: 'docker_image',
      image: image || '',
    }
  }
}

/**
 * Transforms form data into an update request object
 */
export function prepareUpdateWorkloadData(
  data: FormSchemaLocalMcp,
  secrets: SecretsSecretParameter[] = []
): V1UpdateRequest {
  // V1UpdateRequest has a flatter structure than V1CreateRequest
  const image =
    data.type === 'docker_image'
      ? data.image
      : `${data.protocol}://${data.package_name}`

  return {
    image,
    transport: data.transport,
    target_port: data.target_port,
    cmd_arguments: data.cmd_arguments || [],
    env_vars: mapEnvVars(data.envVars),
    secrets,
    network_isolation: data.networkIsolation,
    permission_profile: data.networkIsolation
      ? {
          network: {
            outbound: {
              allow_host: data.allowedHosts?.map((host) => host.value),
              allow_port: data.allowedPorts?.map((port) =>
                parseInt(port.value, 10)
              ),
              insecure_allow_all: false,
            } as PermissionsOutboundNetworkPermissions,
          },
        }
      : undefined,
    volumes: getVolumes(data.volumes ?? []),
  }
}

/**
 * Groups secrets into two categories: new secrets (not from the registry) and
 * existing secrets (from the registry). We need this separation to know which
 * secrets need to be encrypted and stored before creating the server workload.
 */
export function groupSecrets(secrets: DefinedSecret[]): {
  newSecrets: DefinedSecret[]
  existingSecrets: DefinedSecret[]
} {
  return secrets.reduce<{
    newSecrets: DefinedSecret[]
    existingSecrets: DefinedSecret[]
  }>(
    (acc, secret) => {
      if (secret.value.isFromStore) {
        acc.existingSecrets.push(secret)
      } else {
        acc.newSecrets.push(secret)
      }
      return acc
    },
    { newSecrets: [], existingSecrets: [] }
  )
}
