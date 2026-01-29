import { useMutation } from '@tanstack/react-query'
import { postApiV1BetaSecretsDefaultKeysMutation } from '@common/api/generated/@tanstack/react-query.gen'
import { getApiV1BetaSecretsDefaultKeys } from '@common/api/generated/sdk.gen'
import type {
  PostApiV1BetaSecretsDefaultKeysData,
  SecretsSecretParameter,
  V1CreateSecretResponse,
} from '@common/api/generated/types.gen'
import type { Options } from '@common/api/generated/client'
import { prepareSecretsWithoutNamingCollision } from '@/common/lib/secrets/prepare-secrets-without-naming-collision'
import type { SecretFieldValue, PreparedSecret } from '@/common/types/secrets'
import type { FormSchemaLocalMcp } from '@/features/mcp-servers/lib/form-schema-local-mcp'
import type { FormSchemaRemoteMcp } from '@/common/lib/workloads/remote/form-schema-remote-mcp'
import type { FormSchemaRegistryMcp } from '@/features/registry-servers/lib/form-schema-registry-mcp'
import type { UseMutateAsyncFunction } from '@tanstack/react-query'

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
      setTimeout(resolve, Math.floor(Math.random() * 401) + 100)
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
export function getMCPSecretFieldValues(
  secrets:
    | FormSchemaRemoteMcp['secrets']
    | FormSchemaLocalMcp['secrets']
    | FormSchemaRegistryMcp['secrets']
): SecretFieldValue[] {
  return secrets.reduce<SecretFieldValue[]>((acc, { name, value }) => {
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
export function groupMCPSecretFieldValues(secrets: SecretFieldValue[]): {
  newSecrets: SecretFieldValue[]
  existingSecrets: SecretFieldValue[]
} {
  return secrets.reduce<{
    newSecrets: SecretFieldValue[]
    existingSecrets: SecretFieldValue[]
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

interface UseMCPSecretsParams {
  onSecretSuccess: (completedCount: number, secretsCount: number) => void
  onSecretError: (
    error: string,
    variables: Options<PostApiV1BetaSecretsDefaultKeysData>
  ) => void
}

interface MCPSecretsResult {
  newlyCreatedSecrets: SecretsSecretParameter[]
  existingSecrets: SecretFieldValue[]
}

interface UseMCPSecretsReturn {
  handleSecrets: (secrets: SecretFieldValue[]) => Promise<MCPSecretsResult>
  isPendingSecrets: boolean
  isErrorSecrets: boolean
}

/**
 * Custom hook for handling MCP secrets processing.
 *
 * This hook encapsulates the complete workflow for processing MCP secrets:
 * 1. Groups secrets into new and existing categories
 * 2. Fetches current secrets to handle naming collisions
 * 3. Prepares new secrets with unique names
 * 4. Encrypts and saves new secrets to the secret store
 *
 * @param params - Configuration object with success and error callbacks
 * @returns Object with handleSecrets function and loading/error states
 */
export function useMCPSecrets({
  onSecretSuccess = () => {},
  onSecretError = () => {},
}: UseMCPSecretsParams): UseMCPSecretsReturn {
  const { mutateAsync: saveSecret } = useMutation({
    ...postApiV1BetaSecretsDefaultKeysMutation(),
  })

  const {
    mutateAsync: handleSecrets,
    isPending: isPendingSecrets,
    isError: isErrorSecrets,
  } = useMutation({
    mutationFn: async (
      secrets:
        | FormSchemaRemoteMcp['secrets']
        | FormSchemaLocalMcp['secrets']
        | FormSchemaRegistryMcp['secrets']
    ): Promise<MCPSecretsResult> => {
      let newlyCreatedSecrets: SecretsSecretParameter[] = []

      // Step 1: Group secrets into new and existing
      // We need to know which secrets are new (not from the registry) and which are
      // existing (already stored). This helps us handle the encryption and storage
      // of secrets correctly.
      const { existingSecrets, newSecrets } = groupMCPSecretFieldValues(
        getMCPSecretFieldValues(secrets)
      )

      // Step 2: Fetch existing secrets & handle naming collisions
      // We need an up-to-date list of secrets so we can handle any existing keys
      // safely & correctly. This is done with a manual fetch call to avoid freshness issues /
      // side-effects from the `useQuery` hook.
      // In the event of a naming collision, we will append an incrementing number
      // to the secret name, e.g. `MY_API_TOKEN` -> `MY_API_TOKEN_2`
      const { data: fetchedSecrets } = await getApiV1BetaSecretsDefaultKeys({
        throwOnError: true,
      })
      const preparedNewSecrets = prepareSecretsWithoutNamingCollision(
        newSecrets,
        fetchedSecrets
      )

      // Step 3: Encrypt secrets
      // If there are secrets with values, create them in the secret store first.
      // We need the data returned by the API to pass along with the "run workload" request.
      if (preparedNewSecrets.length > 0) {
        newlyCreatedSecrets = await saveMCPSecrets(
          preparedNewSecrets,
          saveSecret,
          onSecretSuccess,
          onSecretError
        )
      }

      return {
        newlyCreatedSecrets,
        existingSecrets,
      }
    },
  })

  return {
    handleSecrets,
    isPendingSecrets,
    isErrorSecrets,
  }
}
