import {
  getApiV1BetaSecretsDefaultKeys,
  type Options,
  type PostApiV1BetaSecretsDefaultKeysData,
  type PostApiV1BetaWorkloadsData,
  type SecretsSecretParameter,
  type V1CreateRequest,
  type V1CreateSecretResponse,
  type V1CreateWorkloadResponse,
} from '@/common/api/generated'
import { getApiV1BetaWorkloadsQueryKey } from '@/common/api/generated/@tanstack/react-query.gen'
import { QueryClient, type UseMutateAsyncFunction } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Progress } from '@/common/components/ui/progress'

import { Link } from '@tanstack/react-router'
import { Button } from '@/common/components/ui/button'
import type { FormSchemaRunMcpCommand } from './form-schema-run-mcp-server-with-command'
import type { DefinedSecret, PreparedSecret } from '@/common/types/secrets'
import { prepareSecretsWithoutNamingCollision } from '@/common/lib/secrets/prepare-secrets-without-naming-collision'
import { trackEvent } from '@/common/lib/analytics'
import { restartClientNotification } from './restart-client-notification'

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
 * Maps environment variables from the form into the format expected by the API.
 */
function mapEnvVars(envVars: { name: string; value: string }[]) {
  return envVars.map((envVar) => `${envVar.name}=${envVar.value}`)
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
function prepareCreateWorkloadData(
  data: FormSchemaRunMcpCommand,
  secrets: SecretsSecretParameter[] = []
): V1CreateRequest {
  const request = transformTypeSpecificData(data)

  request.cmd_arguments = data.cmd_arguments?.split(' ').filter(Boolean)

  request.env_vars = mapEnvVars(data.envVars)

  request.secrets = secrets

  return request
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
 * Orchestrates the "onSubmit" action for the "Run custom server" form.
 */
export async function orchestrateRunCustomServer({
  createWorkload,
  data,
  getIsServerReady,
  queryClient,
  saveSecret,
}: {
  createWorkload: CreateWorkloadFn
  data: FormSchemaRunMcpCommand
  getIsServerReady: (serverName: string) => Promise<boolean>
  queryClient: QueryClient
  saveSecret: SaveSecretFn
}) {
  const toastID: string = new Date(Date.now()).toISOString()
  try {
    let newlyCreatedSecrets: SecretsSecretParameter[] = []

    // Step 1: Group secrets into new and existing
    // We need to know which secrets are new (not from the registry) and which are
    // existing (already stored). This helps us handle the encryption and storage
    // of secrets correctly.
    const { existingSecrets, newSecrets } = groupSecrets(data.secrets)

    // Step 2: Fetch existing secrets & handle naming collisions
    // We need an up-to-date list of secrets so we can handle any existing keys
    // safely & correctly. This is done with a manual fetch call to avoid freshness issues /
    // side-effects from the `useQuery` hook.
    // In the event of a naming collision, we will append an incrementing number
    // to the secret name, e.g. `MY_API_TOKEN` -> `MY_API_TOKEN_2`
    const { data: fetchedSecrets } = await getApiV1BetaSecretsDefaultKeys({
      throwOnError: true,
    }).catch((e) => {
      toast.error(
        [
          `An error occurred while starting the server.`,
          'Could not retrieve secrets from the secret store.',
          e instanceof Error ? `\n${e.message}` : null,
        ].join('\n'),
        {
          id: toastID,
        }
      )
      throw e
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
      data,
      secretsForRequest
    )

    try {
      await createWorkload({
        body: createRequest,
      })
      await restartClientNotification({
        queryClient,
      })
      trackEvent(`Workload ${data.name} started`, {
        workload: data.name,
        transport: data.transport,
        'route.pathname': '/',
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
    toast.loading(`Starting "${data.name}"...`, {
      duration: 30_000,
      id: toastID,
    })

    if (await getIsServerReady(data.name)) {
      // Invalidate queries to refresh server lists
      await queryClient.invalidateQueries({
        queryKey: getApiV1BetaWorkloadsQueryKey({ query: { all: true } }),
      })

      toast.success(`"${data.name}" started successfully.`, {
        id: toastID,
        duration: 5_000, // slightly longer than default
        action: (
          <Button asChild>
            <Link
              to="/"
              search={{ newServerName: data.name }}
              onClick={() => toast.dismiss(toastID)}
              viewTransition={{ types: ['slide-left'] }}
              className="ml-auto"
            >
              View
            </Link>
          </Button>
        ),
      })
    } else {
      toast.warning(
        `Server "${data.name}" was created but may still be starting up. Check the servers list to monitor its status.`,
        {
          id: toastID,
          duration: 2_000, // reset to default
        }
      )
    }
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
    throw error
  }
}
