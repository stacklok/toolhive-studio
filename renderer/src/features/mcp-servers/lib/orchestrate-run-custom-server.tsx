import { type UseMutateAsyncFunction } from '@tanstack/react-query'
import {
  type PermissionsOutboundNetworkPermissions,
  type PostApiV1BetaSecretsDefaultKeysData,
  type SecretsSecretParameter,
  type V1CreateRequest,
  type V1CreateSecretResponse,
} from '@api/types.gen'
import type { Options } from '@api/client'
import type { FormSchemaRunMcpCommand } from './form-schema-run-mcp-server-with-command'
import type { DefinedSecret, PreparedSecret } from '@/common/types/secrets'
import { isEmptyEnvVar } from '@/common/lib/utils'

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
 * Maps environment variables from the form into the format expected by the API.
 * Filters out environment variables with empty or whitespace-only values.
 */
function mapEnvVars(envVars: { name: string; value: string }[]) {
  return envVars
    .filter((envVar) => !isEmptyEnvVar(envVar.value))
    .map((envVar) => `${envVar.name}=${envVar.value}`)
}

/**
 * Transforms the type specific (e.g. docker vs package manager) data from the
 * form into a request object that can be sent to the API.
 */
function transformTypeSpecificData(
  values: FormSchemaRunMcpCommand
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
      return type satisfies never
  }
}

/**
 * Combines the registry server definition, the form fields, and the newly
 * created secrets from the secret store into a single request object.
 */
export function prepareCreateWorkloadData(
  data: FormSchemaRunMcpCommand,
  secrets: SecretsSecretParameter[] = []
): V1CreateRequest {
  const request = transformTypeSpecificData(data)

  request.cmd_arguments = data.cmd_arguments || []
  request.env_vars = mapEnvVars(data.envVars)
  request.secrets = secrets

  // Extract and transform network isolation fields
  const { allowedHosts, allowedPorts, networkIsolation } = data
  const permission_profile = networkIsolation
    ? {
        network: {
          outbound: {
            allow_host: allowedHosts,
            allow_port: allowedPorts.map((port) => parseInt(port, 10)),
            insecure_allow_all: false,
          } as PermissionsOutboundNetworkPermissions,
        },
      }
    : undefined

  return {
    ...request,
    network_isolation: networkIsolation,
    permission_profile,
  }
}

type GroupedSecrets = {
  newSecrets: DefinedSecret[]
  existingSecrets: DefinedSecret[]
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
  return secrets.reduce<GroupedSecrets>(
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
