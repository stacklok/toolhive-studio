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
  type V1ListSecretsResponse,
} from '@/common/api/generated'
import {
  postApiV1BetaWorkloadsMutation,
  getApiV1BetaWorkloadsByNameOptions,
  postApiV1BetaSecretsDefaultKeysMutation,
  getApiV1BetaWorkloadsQueryKey,
} from '@/common/api/generated/@tanstack/react-query.gen'
import { pollServerStatus } from '@/common/lib/polling'
import {
  QueryClient,
  useMutation,
  useQueryClient,
  type UseMutateAsyncFunction,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import type { FormSchemaRunFromRegistry } from '../lib/get-form-schema-run-from-registry'
import { Progress } from '@/common/components/ui/progress'
import { useCallback } from 'react'

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

type PreparedSecret = {
  /** The name of the secret in the secret store */
  secretStoreKey: string
  /** The property in the MCP server's config that the secret maps to */
  target: string
  /** The value of the secret */
  value: string
}

const SECRET_NAME_REGEX = /^(.+?)(?:_(\d+))?$/

if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest

  test('SECRET_NAME_REGEX', () => {
    expect('MY_SECRET'.match(SECRET_NAME_REGEX)).toStrictEqual(
      expect.arrayContaining(['MY_SECRET', 'MY_SECRET', undefined])
    )
    expect('MY_SECRET_2'.match(SECRET_NAME_REGEX)).toStrictEqual(
      expect.arrayContaining(['MY_SECRET_2', 'MY_SECRET', '2'])
    )
    expect('MY_SECRET_10'.match(SECRET_NAME_REGEX)).toStrictEqual(
      expect.arrayContaining(['MY_SECRET_10', 'MY_SECRET', '10'])
    )
    expect('MY_SECRET_2_3'.match(SECRET_NAME_REGEX)).toStrictEqual(
      expect.arrayContaining(['MY_SECRET_2_3', 'MY_SECRET_2', '3'])
    )
  })
}

/**
 * A utility function to update the keys used in the form schema to prevent any
 * naming conflicts with existing secrets.
 * Strategy:
 * - If the secret name already exists in the secret store, append a number to
 *   the name to make it unique, e.g. `MY_API_TOKEN` -> `MY_API_TOKEN_2`
 * - If the secret name already exists in the store *with* a number appended,
 *   increment the number until a unique name is found, e.g. `MY_API_TOKEN_2` -> `MY_API_TOKEN_3`
 * - If the secret name does not exist, use it as is.
 */
function prepareSecretsWithoutNamingCollision(
  /**
   * NOTE: For simplicity, we are expecting that any undefined secrets are
   * already filtered out by this stage
   */
  secrets: {
    name: string
    value: string
  }[],
  existingSecrets: V1ListSecretsResponse
): PreparedSecret[] {
  // A map is the most efficient way to check for existing keys
  const keyMap = new Set(
    existingSecrets.keys
      ?.filter((k) => k != null)
      .map((secret) => secret.key || '') || []
  )

  return secrets.map((secret) => {
    let secretStoreKey = secret.name

    // Early return — if the key does not exist, we can use it as is
    if (keyMap.has(secretStoreKey) === false) {
      return {
        secretStoreKey,
        target: secret.name,
        value: secret.value,
      }
    }

    // Extract base name and number if the key already has a number suffix
    const match = secretStoreKey.match(SECRET_NAME_REGEX)
    if (!match) {
      // This shouldn't happen, but handle as fallback
      secretStoreKey = `${secretStoreKey}_${Date.now()}`
    } else {
      const [, baseName, currentNumberStr] = match
      const currentNumber = currentNumberStr
        ? parseInt(currentNumberStr, 10)
        : 1

      // Find the next available number
      let nextNumber = currentNumber + 1
      let candidateKey = `${baseName}_${nextNumber}`

      while (keyMap.has(candidateKey)) {
        nextNumber++
        candidateKey = `${baseName}_${nextNumber}`
      }

      secretStoreKey = candidateKey
    }

    return {
      secretStoreKey,
      target: secret.name,
      value: secret.value,
    }
  })
}

if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest

  test('should use original names when no collisions exist', () => {
    expect(
      prepareSecretsWithoutNamingCollision(
        [
          { name: 'GITHUB_PERSONAL_ACCESS_TOKEN', value: 'foo-bar' },
          { name: 'JIRA_API_KEY', value: 'foo-bar' },
        ],
        {
          keys: [{ key: 'GRAFANA_API_KEY' }, { key: 'CONFLUENCE_API_KEY' }],
        }
      )
    ).toEqual([
      {
        secretStoreKey: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        target: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        value: 'foo-bar',
      },
      {
        secretStoreKey: 'JIRA_API_KEY',
        target: 'JIRA_API_KEY',
        value: 'foo-bar',
      },
    ])
  })

  test('should append number suffix on collision', () => {
    expect(
      prepareSecretsWithoutNamingCollision(
        [
          { name: 'GITHUB_PERSONAL_ACCESS_TOKEN', value: 'foo-bar' },
          { name: 'JIRA_API_KEY', value: 'foo-bar' },
        ],
        {
          keys: [
            { key: 'GITHUB_PERSONAL_ACCESS_TOKEN' },
            { key: 'JIRA_API_KEY' },
          ],
        }
      )
    ).toEqual([
      {
        secretStoreKey: 'GITHUB_PERSONAL_ACCESS_TOKEN_2',
        target: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        value: 'foo-bar',
      },
      {
        secretStoreKey: 'JIRA_API_KEY_2',
        target: 'JIRA_API_KEY',
        value: 'foo-bar',
      },
    ])
  })

  test('should increment number suffix when collision exists with numbered secret', () => {
    expect(
      prepareSecretsWithoutNamingCollision(
        [
          { name: 'GITHUB_PERSONAL_ACCESS_TOKEN', value: 'foo-bar' },
          { name: 'JIRA_API_KEY', value: 'foo-bar' },
        ],
        {
          keys: [
            { key: 'GITHUB_PERSONAL_ACCESS_TOKEN' },
            { key: 'GITHUB_PERSONAL_ACCESS_TOKEN_2' },
            { key: 'JIRA_API_KEY' },
            { key: 'JIRA_API_KEY_2' },
          ],
        }
      )
    ).toEqual([
      {
        secretStoreKey: 'GITHUB_PERSONAL_ACCESS_TOKEN_3',
        target: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        value: 'foo-bar',
      },
      {
        secretStoreKey: 'JIRA_API_KEY_3',
        target: 'JIRA_API_KEY',
        value: 'foo-bar',
      },
    ])
  })
}

/**
 * A utility function to filter out secrets that are not defined.
 */
function getDefinedSecrets(secrets: FormSchemaRunFromRegistry['secrets']): {
  name: string
  value: string
}[] {
  return secrets.reduce<
    {
      name: string
      value: string
    }[]
  >((acc, { name, value }) => {
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
 * // NOTE 1: `thv` appears to hold a lock on the OS keychain while retrieving
 * the secret value, so we need to save them one by one.
 * // NOTE 2: We add a short, arbitrary delay to allow the `toast` message that
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

/**
 * Orchestrates the "onSubmit" action for the "Run from Registry" form.
 */
async function onSubmitOrchestrator({
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

  let storedSecrets: SecretsSecretParameter[] = []

  // NOTE: Due to how we populate the names of the secrets, we may have
  // secrets with a `key` but no `value`. We filter those out.
  const definedSecrets = getDefinedSecrets(data.secrets)

  // Step 1: Fetch existing secrets & handle naming collisions
  // We need an up-to-date list of secrets so we can handle any existing keys
  // safely & correctly. This is done with a manual fetch call to avoid freshness issues /
  // side-effects from the `useQuery` hook.
  // In the event of a naming collision, we will append an incrementing number
  // to the secret name, e.g. `MY_API_TOKEN` -> `MY_API_TOKEN_2`
  const { data: existingSecrets } = await getApiV1BetaSecretsDefaultKeys({
    throwOnError: true,
  })
  const preparedSecrets = prepareSecretsWithoutNamingCollision(
    definedSecrets,
    existingSecrets
  )

  // Step 2: Encrypt secrets
  // If there are secrets with values, create them in the secret store first.
  // We need the data returned by the API to pass along with the "run workload" request.
  if (preparedSecrets.length > 0) {
    try {
      storedSecrets = await saveSecrets(preparedSecrets, saveSecret, toastID)
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

  // Step 3: Create the MCP server workload
  // Prepare the request data and send it to the API
  // We pass the encrypted secrets along with the request.
  const createRequest: V1CreateRequest = prepareCreateWorkloadData(
    server,
    data,
    storedSecrets
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

  // Step 4: Poll server status
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

if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest

  test('onSubmit happy path', async () => {
    const mockSaveSecret = vi.fn().mockResolvedValue({ key: 'TEST_SECRET' })
    const mockCreateWorkload = vi.fn().mockResolvedValue({})
    const mockGetIsServerReady = vi.fn().mockResolvedValue(true)
    const mockQueryClient = {
      fetchQuery: vi.fn().mockResolvedValue({ status: 'Running' }),
      invalidateQueries: vi.fn(),
    } as unknown as QueryClient

    const server = {
      name: 'test-server',
      image: 'test-image',
      transport: 'tcp',
      args: ['--arg1', '--arg2'],
      target_port: 8080,
    }

    const formData = {
      serverName: 'Test Server',
      envVars: [{ name: 'TEST_ENV', value: 'test-value' }],
      secrets: [
        { name: 'TEST_SECRET', value: 'test-secret-value' },
        { name: '', value: '' }, // Should be ignored
      ],
    }

    await onSubmitOrchestrator({
      createWorkload: mockCreateWorkload,
      data: formData,
      getIsServerReady: mockGetIsServerReady,
      queryClient: mockQueryClient,
      saveSecret: mockSaveSecret,
      server,
    })

    expect(mockSaveSecret).toHaveBeenCalledTimes(1)
    expect(mockSaveSecret).toHaveBeenCalledWith(
      { body: { key: 'TEST_SECRET', value: 'test-secret-value' } },
      expect.objectContaining({
        onError: expect.any(Function),
        onSuccess: expect.any(Function),
      })
    )

    expect(mockCreateWorkload).toHaveBeenCalledTimes(1)
    expect(mockCreateWorkload).toHaveBeenCalledWith({
      body: {
        name: 'Test Server',
        image: 'test-image',
        transport: 'tcp',
        env_vars: ['TEST_ENV=test-value'],
        secrets: [{ name: 'TEST_SECRET', target: 'TEST_SECRET' }],
        cmd_arguments: ['--arg1', '--arg2'],
        target_port: 8080,
      },
    })

    // Verify invalidateQueries called to refresh server lists
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: expect.anything(),
    })
  }, 10_000)
}

export function useRunFromRegistry() {
  const queryClient = useQueryClient()

  const { mutateAsync: saveSecret } = useMutation({
    ...postApiV1BetaSecretsDefaultKeysMutation(),
  })
  const { mutateAsync: createWorkload } = useMutation({
    ...postApiV1BetaWorkloadsMutation(),
  })

  const getIsServerReady: (serverName: string) => Promise<boolean> =
    useCallback(
      (serverName: string) =>
        pollServerStatus(() =>
          queryClient.fetchQuery(
            getApiV1BetaWorkloadsByNameOptions({
              path: { name: serverName },
            })
          )
        ),
      [queryClient]
    )

  const handleSubmit = useCallback(
    async (server: RegistryServer, data: FormSchemaRunFromRegistry) =>
      onSubmitOrchestrator({
        server,
        data,
        saveSecret,
        createWorkload,
        queryClient,
        getIsServerReady,
      }),
    [createWorkload, getIsServerReady, queryClient, saveSecret]
  )

  return {
    handleSubmit,
  }
}
