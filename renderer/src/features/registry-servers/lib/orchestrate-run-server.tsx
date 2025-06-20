import {
  getApiV1BetaSecretsDefaultKeys,
  type Options,
  type PostApiV1BetaSecretsDefaultKeysData,
  type PostApiV1BetaWorkloadsData,
  type RegistryServer,
  type SecretsSecretParameter,
  type V1CreateRequest,
  type V1CreateSecretResponse,
  type V1CreateWorkloadResponse,
} from '@/common/api/generated'
import { getApiV1BetaWorkloadsQueryKey } from '@/common/api/generated/@tanstack/react-query.gen'
import { QueryClient, type UseMutateAsyncFunction } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { FormSchemaRunFromRegistry } from './get-form-schema-run-from-registry'
import { Progress } from '@/common/components/ui/progress'
import type { DefinedSecret, PreparedSecret } from '../types'
import { prepareSecretsWithoutNamingCollision } from './prepare-secrets-without-naming-collision'

type SaveSecretFn = UseMutateAsyncFunction<
  V1CreateSecretResponse,
  string,
  Options<PostApiV1BetaSecretsDefaultKeysData>,
  unknown
>

type CreateWorkloadFn = UseMutateAsyncFunction<
  V1CreateWorkloadResponse,
  string,
  Options<PostApiV1BetaWorkloadsData>,
  unknown
>

/**
 * A utility function to filter out secrets that are not defined.
 */
function getDefinedSecrets(
  secrets: FormSchemaRunFromRegistry['secrets']
): DefinedSecret[] {
  return secrets.reduce<DefinedSecret[]>((acc, { name, value }) => {
    if (name && value) {
      acc.push({ name, value })
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
async function saveSecrets(
  secrets: PreparedSecret[],
  saveSecret: SaveSecretFn,
  toastID: string
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
          toast.error(
            [
              `Failed to encrypt secret "${variables.body.key}"`,
              `\n${error}`,
            ].join(''),
            {
              id: toastID,
            }
          )
        },
        onSuccess: () => {
          completedCount++
          toast.loading(
            <div className="w-full">
              <p className="mb-2">
                Encrypting secrets ({completedCount} of {secretsCount})...
              </p>
              <Progress
                value={(completedCount / secretsCount) * 100}
                className="w-full"
              />
            </div>,
            { id: toastID }
          )
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
 * Combines the registry server definition, the form fields, and the newly
 * created secrets from the secret store into a single request object.
 */
function prepareCreateWorkloadData(
  server: RegistryServer,
  data: FormSchemaRunFromRegistry,
  secrets: SecretsSecretParameter[] = []
): V1CreateRequest {
  const envVars: Array<string> = data.envVars.map(
    (envVar) => `${envVar.name}=${envVar.value}`
  )

  return {
    name: data.serverName,
    image: server.image,
    transport: server.transport,
    env_vars: envVars,
    secrets,
    cmd_arguments: server.args,
    target_port: server.target_port,
  }
}

type GroupedSecrets = {
  newSecrets: DefinedSecret[]
  existingSecrets: DefinedSecret[]
}

/**
 * Groups secrets into two categories: new secrets (not from the store) and
 * existing secrets (from the store). We need this separation to know which
 * secrets need to be encrypted and stored before creating the server workload.
 */
function groupSecrets(secrets: DefinedSecret[]): {
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

/**
 * Orchestrates the "onSubmit" action for the "Run from Registry" form.
 */
export async function orchestrateRunServer({
  createWorkload,
  data,
  getIsServerReady,
  queryClient,
  saveSecret,
  server,
}: {
  createWorkload: CreateWorkloadFn
  data: FormSchemaRunFromRegistry
  getIsServerReady: (serverName: string) => Promise<boolean>
  queryClient: QueryClient
  saveSecret: SaveSecretFn
  server: RegistryServer
}) {
  const toastID: string = server.name ?? new Date(Date.now()).toISOString()

  let newlyCreatedSecrets: SecretsSecretParameter[] = []

  // NOTE: Due to how we populate the names of the secrets in the form, we may
  // have secrets with a `key` but no `value`. We filter those out.
  const definedSecrets = getDefinedSecrets(data.secrets)

  // Step 1: Group secrets into new and existing
  // We need to know which secrets are new (not from the store) and which are
  // existing (already stored). This helps us handle the encryption and storage
  // of secrets correctly.
  const { existingSecrets, newSecrets } = groupSecrets(definedSecrets)

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
    try {
      newlyCreatedSecrets = await saveSecrets(
        preparedNewSecrets,
        saveSecret,
        toastID
      )
    } catch (error) {
      toast.error(
        [
          'An error occurred while starting the server.',
          error instanceof Error ? `\n${error.message}` : null,
        ].join(''),
        {
          id: toastID,
        }
      )
      return
    }
  }

  // Step 4: Create the MCP server workload
  // Prepare the request data and send it to the API
  // We pass the encrypted secrets along with the request.
  const secretsForRequest: SecretsSecretParameter[] = [
    ...newlyCreatedSecrets,
    ...existingSecrets.map((secret) => ({
      name: secret.value.secret,
      target: secret.name,
    })),
  ]

  const createRequest: V1CreateRequest = prepareCreateWorkloadData(
    server,
    data,
    secretsForRequest
  )

  try {
    await createWorkload({
      body: createRequest,
    })
  } catch (error) {
    toast.error(
      [
        'An error occurred while starting the server.',
        error instanceof Error ? `\n${error.message}` : null,
      ].join(''),
      {
        id: toastID,
      }
    )
    return
  }

  // Step 5: Poll server status
  // After the server is created, we need to wait for it to be ready.
  // We use a polling function to check the server status.
  // When the server is ready, we show feedback to the user.
  toast.loading(`Starting "${data.serverName}"...`, {
    duration: 30_000,
    id: toastID,
  })

  if (await getIsServerReady(data.serverName)) {
    toast.success(`Server "${data.serverName}" is now running and ready!`, {
      id: toastID,
    })

    // Invalidate queries to refresh server lists
    queryClient.invalidateQueries({
      queryKey: getApiV1BetaWorkloadsQueryKey({ query: { all: true } }),
    })
  } else {
    toast.warning(
      `Server "${data.serverName}" was created but may still be starting up. Check the servers list to monitor its status.`,
      {
        id: toastID,
      }
    )
  }
}
