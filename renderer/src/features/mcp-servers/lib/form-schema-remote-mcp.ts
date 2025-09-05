import z from 'zod/v4'
import type { CoreWorkload } from '@api/types.gen'

const oauthConfigSchema = z.object({
  authorize_url: z.string().optional(),
  callback_port: z
    .number()
    .optional()
    .refine(
      (val) => val !== undefined && val !== null,
      'Callback port is required'
    ),

  client_id: z.string().optional(),
  client_secret: z.string().optional(),
  issuer: z.string().optional(),
  oauth_params: z.record(z.string(), z.string()).optional(),
  scopes: z.array(z.string()).optional(),
  skip_browser: z.boolean(),
  token_url: z.string().optional(),
  use_pkce: z.boolean(),
})

export const getFormSchemaRemoteMcp = (
  workloads: CoreWorkload[],
  editingServerName?: string
) => {
  const baseFields = z.object({
    name: z
      .union([z.string(), z.undefined()])
      .transform((val) => val ?? '')
      .pipe(
        z
          .string()
          .nonempty('Name is required')
          .refine(
            (value) => value.length === 0 || /^[a-zA-Z0-9._-]+$/.test(value),
            'Invalid server name: it can only contain alphanumeric characters, dots, hyphens, and underscores.'
          )
          .refine(
            (value) =>
              !workloads.some((w) => w.name === value) &&
              value !== editingServerName,
            'This name is already in use or is the same as the editing server name'
          )
      ),
    url: z.string().nonempty('MCP URL is required'),
    auth_type: z
      .union([z.literal('none'), z.literal('oauth2'), z.literal('oidc')])
      .optional(),
    oauth_config: oauthConfigSchema,
    envVars: z
      .object({
        name: z.string().nonempty('Name is required'),
        value: z.string().nonempty('Value is required'),
      })
      .array(),
    secrets: z
      .object({
        name: z.string().nonempty('Name is required'),
        value: z.object({
          secret: z.string().nonempty('Value is required'),
          isFromStore: z.boolean(),
        }),
      })
      .array(),
    transport: z.union(
      [z.literal('sse'), z.literal('streamable-http')],
      'Transport is required. Please select either SSE or streamable-http.'
    ),
  })
  return baseFields
}

export type FormSchemaRemoteMcp = z.infer<
  ReturnType<typeof getFormSchemaRemoteMcp>
>
