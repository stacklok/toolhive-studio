import z from 'zod/v4'
import type {
  GithubComStacklokToolhivePkgCoreWorkload as CoreWorkload,
  PkgApiV1ListSecretsResponse as V1ListSecretsResponse,
} from '@common/api/generated/types.gen'
import {
  createRemoteMcpBaseSchema,
  REMOTE_MCP_AUTH_TYPES,
} from '@/common/lib/form-schema-mcp'

type SecretFormValue = {
  name: string
  value: { secret: string; isFromStore: boolean }
}

const OAUTH_VALIDATION_RULES = {
  oauth2: [
    {
      field: 'authorize_url',
      message: 'Authorize URL is required for OAuth 2.0',
      path: ['oauth_config', 'authorize_url'],
    },
    {
      field: 'token_url',
      message: 'Token URL is required for OAuth2',
      path: ['oauth_config', 'token_url'],
    },
    {
      field: 'client_id',
      message: 'Client ID is required for OAuth 2.0',
      path: ['oauth_config', 'client_id'],
    },
  ],
  oidc: [
    {
      field: 'issuer',
      message: 'Issuer URL is required for OIDC',
      path: ['oauth_config', 'issuer'],
    },
    {
      field: 'client_id',
      message: 'Client ID is required for OIDC',
      path: ['oauth_config', 'client_id'],
    },
  ],
  bearer_token: [
    {
      field: 'bearer_token',
      message: 'Bearer token is required for Bearer authentication',
      path: ['oauth_config', 'bearer_token'],
    },
  ],
}

const validateOAuthField = (value: string | undefined): boolean =>
  Boolean(value && value.trim() !== '')

const validateSecretField = (value: SecretFormValue | undefined): boolean =>
  Boolean(value && value.value.secret && value.value.secret.trim() !== '')

const getAvailableSecretKeys = (availableSecrets?: V1ListSecretsResponse) => {
  if (!availableSecrets) return undefined
  return new Set(
    availableSecrets.keys
      ?.map((secret) => secret.key)
      .filter((key): key is string => Boolean(key)) ?? []
  )
}

export const getFormSchemaRemoteMcp = (
  workloads: CoreWorkload[],
  editingServerName?: string,
  availableSecrets?: V1ListSecretsResponse
) => {
  const filteredWorkloads = editingServerName
    ? workloads.filter((w) => w.name !== editingServerName)
    : workloads
  const availableSecretKeys = getAvailableSecretKeys(availableSecrets)

  return createRemoteMcpBaseSchema(filteredWorkloads).superRefine(
    (data, ctx) => {
      const { auth_type, oauth_config } = data

      // Validate callback_port when it's provided
      const port = oauth_config?.callback_port
      if (port !== undefined && port !== null) {
        if (typeof port === 'number' && (port < 1024 || port > 65535)) {
          ctx.addIssue({
            code: 'custom',
            message: 'Port must be between 1024 and 65535',
            path: ['oauth_config', 'callback_port'],
          })
        }
      }

      // Validate OAuth/OIDC specific fields
      const validationRules =
        OAUTH_VALIDATION_RULES[auth_type as keyof typeof OAUTH_VALIDATION_RULES]

      validationRules?.forEach(({ field, message, path }) => {
        const fieldValue = (oauth_config as Record<string, unknown>)[field]

        let isValid = false
        if (
          field === 'client_secret' ||
          auth_type === REMOTE_MCP_AUTH_TYPES.BearerToken
        ) {
          isValid = validateSecretField(
            fieldValue as
              | {
                  name: string
                  value: { secret: string; isFromStore: boolean }
                }
              | undefined
          )
        } else {
          isValid = validateOAuthField(fieldValue as string | undefined)
        }

        if (!isValid) {
          ctx.addIssue({
            code: 'custom',
            message,
            path,
          })
        }
      })

      const validateStoreReference = (
        value: SecretFormValue | undefined,
        path: (string | number)[]
      ) => {
        if (
          !availableSecretKeys ||
          !value?.value.isFromStore ||
          !value.value.secret.trim()
        ) {
          return
        }

        const secretName = value.value.secret
        if (!availableSecretKeys.has(secretName)) {
          ctx.addIssue({
            code: 'custom',
            message: `Secret "${secretName}" was not found in the secrets store`,
            path,
          })
        }
      }

      validateStoreReference(oauth_config.client_secret, [
        'oauth_config',
        'client_secret',
      ])
      validateStoreReference(oauth_config.bearer_token, [
        'oauth_config',
        'bearer_token',
      ])

      data.secrets.forEach((secret, index) => {
        validateStoreReference(secret, ['secrets', index, 'value'])
      })

      data.header_forward?.add_headers_from_secret?.forEach((header, index) => {
        validateStoreReference(header.secret, [
          'header_forward',
          'add_headers_from_secret',
          index,
          'secret',
        ])
      })
    }
  )
}

export type FormSchemaRemoteMcp = Omit<
  z.infer<ReturnType<typeof getFormSchemaRemoteMcp>>,
  'proxy_mode'
>
