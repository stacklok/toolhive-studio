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

const validateCallbackPortField = (value: number | undefined): boolean =>
  Boolean(value !== undefined && value !== null && value > 0)

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

      // Validate callback_port is required when auth_type is 'none'
      if (auth_type === 'none') {
        if (!validateCallbackPortField(oauth_config?.callback_port)) {
          ctx.addIssue({
            code: 'custom',
            message: 'Callback port is required',
            path: ['oauth_config', 'callback_port'],
          })
        }
        return
      }

      // Validate OAuth/OIDC specific fields
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
