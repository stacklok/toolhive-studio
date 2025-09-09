import { type UseMutateAsyncFunction } from '@tanstack/react-query'
import {
  type PostApiV1BetaSecretsDefaultKeysData,
  type SecretsSecretParameter,
  type V1CreateRequest,
  type V1CreateSecretResponse,
  type V1ListSecretsResponse,
  type V1UpdateRequest,
} from '@api/types.gen'
import type { Options } from '@api/client'
import type { FormSchemaRemoteMcp } from './form-schema-remote-mcp'
import type { DefinedSecret, PreparedSecret } from '@/common/types/secrets'
import { mapEnvVars, omit } from '@/common/lib/utils'

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
 * Combines the registry server definition, the form fields, and the newly
 * created secrets from the secret store into a single request object.
 */
export function prepareCreateWorkloadData(
  data: FormSchemaRemoteMcp,
  secrets: SecretsSecretParameter[] = []
): V1CreateRequest {
  const { oauth_config, envVars, ...rest } = data
  // Transform client_secret from string to SecretsSecretParameter if it exists
  const transformedOAuthConfig = oauth_config
    ? {
        ...oauth_config,
        client_secret: oauth_config.client_secret
          ? ({
              name: 'oauth_client_secret',
              target: 'client_secret',
            } as SecretsSecretParameter)
          : undefined,
      }
    : oauth_config

  const request = {
    ...rest,
    oauth_config: transformedOAuthConfig,
    env_vars: mapEnvVars(envVars),
    secrets,
  }

  return request
}

/**
 * A utility function to filter out secrets that are not defined.
 */
export function getDefinedSecrets(
  secrets: FormSchemaRemoteMcp['secrets']
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
 * Transforms form data into an update request object
 */
export function prepareUpdateWorkloadData(
  data: FormSchemaRemoteMcp,
  secrets: SecretsSecretParameter[] = []
): V1UpdateRequest {
  const { oauth_config, envVars, ...rest } = data

  // Transform client_secret from string to SecretsSecretParameter if it exists
  const transformedOAuthConfig = oauth_config
    ? {
        ...oauth_config,
        client_secret: oauth_config.client_secret
          ? ({
              name: 'oauth_client_secret',
              target: 'client_secret',
            } as SecretsSecretParameter)
          : undefined,
      }
    : oauth_config

  return {
    ...omit(rest, 'auth_type'),
    oauth_config: transformedOAuthConfig,
    env_vars: mapEnvVars(envVars),
    secrets,
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

const getAuthType = (
  oauthConfig?: V1CreateRequest['oauth_config']
): 'oauth2' | 'oidc' | 'none' => {
  if (!oauthConfig) return 'none'
  if (oauthConfig.authorize_url) return 'oauth2'
  if (oauthConfig.issuer) return 'oidc'
  return 'none'
}

// The type of the GET is V1CreateRequest
export function convertCreateRequestToFormData(
  createRequest: V1CreateRequest,
  availableSecrets?: V1ListSecretsResponse
): FormSchemaRemoteMcp {
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

  const authType = getAuthType(createRequest.oauth_config)

  const baseFormData: FormSchemaRemoteMcp = {
    name: createRequest.name || '',
    url: createRequest.url || '',
    transport: createRequest.transport as 'sse' | 'streamable-http',
    oauth_config: {
      skip_browser: createRequest.oauth_config?.skip_browser ?? false,
      use_pkce: createRequest.oauth_config?.use_pkce ?? true,
      authorize_url: createRequest.oauth_config?.authorize_url,
      callback_port: createRequest.oauth_config?.callback_port,
      client_id: createRequest.oauth_config?.client_id,
      client_secret: createRequest.oauth_config?.client_secret?.name,
      issuer: createRequest.oauth_config?.issuer,
      oauth_params: createRequest.oauth_config?.oauth_params,
      scopes: createRequest.oauth_config?.scopes,
      token_url: createRequest.oauth_config?.token_url,
    },
    auth_type: authType,
    envVars: Object.entries(createRequest.env_vars || {}).map(
      ([name, value]) => ({ name, value })
    ),
    secrets,
  }

  return baseFormData
}
