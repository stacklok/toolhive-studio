import z from 'zod/v4'

export const formSchemaSecretsOnboarding = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('1password'),
    api_token: z
      .string('1Password API token is required')
      .nonempty('1Password API token is required'),
  }),
  z.object({
    type: z.literal('encrypted'),
    password: z
      .string('A password is required')
      .nonempty('A password is required'),
  }),
  z.object({
    type: z.literal('none'),
  }),
])

export type FormSchemaSecretsOnboarding = z.infer<
  typeof formSchemaSecretsOnboarding
>
