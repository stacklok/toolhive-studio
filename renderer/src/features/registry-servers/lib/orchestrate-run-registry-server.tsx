import {
  type Options,
  type PermissionsOutboundNetworkPermissions,
  type PostApiV1BetaSecretsDefaultKeysData,
  type RegistryImageMetadata,
  type SecretsSecretParameter,
  type V1CreateRequest,
  type V1CreateSecretResponse,
} from '@/common/api/generated'
import type { FormSchemaRunFromRegistry } from './get-form-schema-run-from-registry'
import type { DefinedSecret, PreparedSecret } from '@/common/types/secrets'
import type { UseMutateAsyncFunction } from '@tanstack/react-query'
import { isEmptyEnvVar } from '@/common/lib/utils'

type SaveSecretFn = UseMutateAsyncFunction<
  V1CreateSecretResponse,
  string,
  Options<PostApiV1BetaSecretsDefaultKeysData>,
  unknown
>

/**
 * A utility function to filter out secrets that are not defined.
 */
export function getDefinedSecrets(
  secrets: FormSchemaRunFromRegistry['secrets']
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
    // For single secret: 2000ms, for multiple secrets: random 200-1000ms
    await new Promise((resolve) =>
      setTimeout(
        resolve,
        secretsCount === 1 ? 2000 : Math.floor(Math.random() * 801) + 200
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
 * Combines the registry server definition, the form fields, and the newly
 * created secrets from the secret store into a single request object.
 */
export function prepareCreateWorkloadData(
  server: RegistryImageMetadata,
  data: FormSchemaRunFromRegistry,
  secrets: SecretsSecretParameter[] = []
): V1CreateRequest {
  const envVars: Array<string> = data.envVars
    .filter((envVar) => !isEmptyEnvVar(envVar.value))
    .map((envVar) => `${envVar.name}=${envVar.value}`)

  // Extract and transform network isolation fields
  const { allowedHosts, allowedPorts, networkIsolation } = data
  const permission_profile = networkIsolation
    ? {
        network: {
          outbound: {
            allow_host: allowedHosts,
            allow_port: allowedPorts.map(parseInt),
            insecure_allow_all: false,
          } as PermissionsOutboundNetworkPermissions,
        },
      }
    : undefined

  return {
    name: data.serverName,
    image: server.image,
    transport: server.transport,
    env_vars: envVars,
    secrets,
    cmd_arguments: data.cmd_arguments
      ? data.cmd_arguments?.split(' ').filter(Boolean)
      : [],
    target_port: server.target_port,
    network_isolation: networkIsolation,
    permission_profile,
    // ...rest does not include the omitted fields
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
