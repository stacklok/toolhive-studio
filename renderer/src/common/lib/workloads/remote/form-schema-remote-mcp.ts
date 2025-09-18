import z from 'zod/v4'
import type { CoreWorkload } from '@api/types.gen'
import { createRemoteMcpBaseSchema } from '@/common/lib/form-schema-mcp'

const OAUTH_VALIDATION_RULES = {
  oauth2: [
    {
      field: 'authorize_url',
      message: 'Authorize URL is required for OAuth2',
      path: ['oauth_config', 'authorize_url'],
    },
    {
      field: 'token_url',
      message: 'Token URL is required for OAuth2',
      path: ['oauth_config', 'token_url'],
    },
    {
      field: 'client_id',
      message: 'Client ID is required for OAuth2',
      path: ['oauth_config', 'client_id'],
    },
    {
      field: 'client_secret',
      message: 'Client Secret is required for OAuth2',
      path: ['oauth_config', 'client_secret'],
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
}

const validateOAuthField = (value: string | undefined): boolean =>
  Boolean(value && value.trim() !== '')

const validateClientSecretField = (
  value:
    | { name: string; value: { secret: string; isFromStore: boolean } }
    | undefined
): boolean =>
  Boolean(value && value.value.secret && value.value.secret.trim() !== '')

export const getFormSchemaRemoteMcp = (
  workloads: CoreWorkload[],
  editingServerName?: string
) => {
  const filteredWorkloads = editingServerName
    ? workloads.filter((w) => w.name !== editingServerName)
    : workloads

  return createRemoteMcpBaseSchema(filteredWorkloads).superRefine(
    (data, ctx) => {
      const { auth_type, oauth_config } = data

      // Skip validation if no authentication is required
      if (auth_type === 'none') return

      const validationRules =
        OAUTH_VALIDATION_RULES[auth_type as keyof typeof OAUTH_VALIDATION_RULES]

      validationRules?.forEach(({ field, message, path }) => {
        const fieldValue = (oauth_config as Record<string, unknown>)[field]

        let isValid = false
        if (field === 'client_secret') {
          isValid = validateClientSecretField(
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
    }
  )
}

export type FormSchemaRemoteMcp = z.infer<
  ReturnType<typeof getFormSchemaRemoteMcp>
>
