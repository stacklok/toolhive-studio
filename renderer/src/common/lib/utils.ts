import type { Options } from '@api/client'
import type {
  PostApiV1BetaSecretsDefaultKeysData,
  SecretsSecretParameter,
  V1CreateSecretResponse,
} from '@api/types.gen'
import type { UseMutateAsyncFunction } from '@tanstack/react-query'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { DefinedSecret, PreparedSecret } from '../types/secrets'
import type { FormSchemaRegistryMcp } from '@/features/registry-servers/lib/form-schema-registry-mcp'
import type { FormSchemaRemoteMcp } from '@/features/mcp-servers/lib/form-schema-remote-mcp'
import type { FormSchemaLocalMcp } from '@/features/mcp-servers/lib/form-schema-local-mcp'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Checks if an environment variable value is effectively empty (null, undefined, or whitespace-only).
 * This is used consistently across form validation and orchestration logic for environment variables.
 */
export function isEmptyEnvVar(value: string | undefined | null): boolean {
  return !value || value.trim() === ''
}

export function getVolumes(
  volumes: Array<{
    host: string
    container: string
    accessMode?: 'ro' | 'rw'
  }>
): Array<string> {
  return volumes
    .filter((volume) => volume.host && volume.container)
    .map(
      (volume) =>
        `${volume.host}:${volume.container}${volume.accessMode === 'ro' ? ':ro' : ''}`
    )
}

/**
 * Maps environment variables from the form into the format expected by the API.
 * Filters out environment variables with empty or whitespace-only values.
 */
export function mapEnvVars(envVars: { name: string; value?: string }[]) {
  return Object.fromEntries(
    envVars
      .filter((envVar) => !isEmptyEnvVar(envVar.value))
      .map(({ name, value }) => [name, value as string])
  )
}

/**
 * Creates a new object with specified keys omitted from the original object.
 * Type-safe utility that ensures the omitted keys exist on the source object.
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  ...keys: K[]
): Omit<T, K> {
  const result = { ...obj }
  for (const key of keys) {
    delete result[key]
  }
  return result
}

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
export async function saveMCPSecrets(
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
 * A utility function to filter out secrets that are not defined.
 */
export function getMCPDefinedSecrets(
  secrets:
    | FormSchemaRemoteMcp['secrets']
    | FormSchemaLocalMcp['secrets']
    | FormSchemaRegistryMcp['secrets']
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
 * Groups secrets into two categories: new secrets (not from the registry) and
 * existing secrets (from the registry). We need this separation to know which
 * secrets need to be encrypted and stored before creating the server workload.
 */
export function groupMCPDefinedSecrets(secrets: DefinedSecret[]): {
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
