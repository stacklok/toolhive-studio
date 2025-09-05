import z from 'zod/v4'
import type { CoreWorkload } from '@api/types.gen'

const oauthConfigSchema = z.object({
  authorize_url: z.string().optional(),
  callback_port: z.number().optional(),
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
    url: z.string().nonempty('URL is required'),
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
  })
  return baseFields
  // return z.discriminatedUnion('type', [
  //   baseFields.extend({
  //     type: z.literal('docker_image'),
  //     image: z.string().nonempty('Docker image is required'),
  //   }),
  //   baseFields.extend({
  //     type: z.literal('package_manager'),
  //     protocol: z.union(
  //       [z.literal('npx'), z.literal('uvx'), z.literal('go')],
  //       'Please select either npx, uvx, or go.'
  //     ),
  //     package_name: z.string().nonempty('Package name is required'),
  //   }),
  // ])
  // .superRefine((data, ctx) => {
  //   if (data.auth_type === 'oidc') {
  //     if (!data.oidc_config.issuer || data.oidc_config.issuer.trim() === '') {
  //       ctx.addIssue({
  //         code: 'custom',
  //         message: 'Issuer URL is required for OIDC',
  //         path: ['oidc_config.issuer'],
  //       })
  //     }
  //     if (!data.oidc_config.client_id || data.oidc_config.client_id.trim() === '') {
  //       ctx.addIssue({
  //         code: 'custom',
  //         message: 'Client ID is required for OIDC',
  //         path: ['oidc_config.client_id'],
  //       })
  //     }
  //     if (!data.oidc_config.client_secret || data.oidc_config.client_secret.trim() === '') {
  //       ctx.addIssue({
  //         code: 'custom',
  //         message: 'Client Secret is required for OIDC',
  //         path: ['oidc_config.client_secret'],
  //       })
  //     }
  //     if (!data.oidc_config.scopes || data.oidc_config.scopes.trim() === '') {
  //       ctx.addIssue({
  //         code: 'custom',
  //         message: 'Scopes are required for OIDC',
  //         path: ['oidc_config.scopes'],
  //       })
  //     }
  //   } else if (data.auth_type === 'oauth2') {
  //     if (!data.oauth_config.authorize_url || data.oauth_config.authorize_url.trim() === '') {
  //       ctx.addIssue({
  //         code: 'custom',
  //         message: 'Authorize URL is required for OAuth2',
  //         path: ['authorize_url'],
  //       })
  //     }
  //     if (!data.token_url || data.token_url.trim() === '') {
  //       ctx.addIssue({
  //         code: 'custom',
  //         message: 'Token URL is required for OAuth2',
  //         path: ['token_url'],
  //       })
  //     }
  //     if (!data.client_id || data.client_id.trim() === '') {
  //       ctx.addIssue({
  //         code: 'custom',
  //         message: 'Client ID is required for OAuth2',
  //         path: ['client_id'],
  //       })
  //     }
  //     if (!data.client_secret || data.client_secret.trim() === '') {
  //       ctx.addIssue({
  //         code: 'custom',
  //         message: 'Client Secret is required for OAuth2',
  //         path: ['client_secret'],
  //       })
  //     }
  //     if (!data.scopes || data.scopes.trim() === '') {
  //       ctx.addIssue({
  //         code: 'custom',
  //         message: 'Scopes are required for OAuth2',
  //         path: ['scopes'],
  //       })
  //     }
  //   }
  // })
}

export type FormSchemaRemoteMcp = z.infer<
  ReturnType<typeof getFormSchemaRemoteMcp>
>
