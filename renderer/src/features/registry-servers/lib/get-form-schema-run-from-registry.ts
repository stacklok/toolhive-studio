import type { RegistryEnvVar } from '@/common/api/generated/types.gen'
import z from 'zod/v4'
import type { GroupedEnvVars } from './group-env-vars'

function refineSecret(
  value: {
    name: string
    value?:
      | {
          secret?: string | undefined
          isFromStore: boolean
        }
      | undefined
  },
  vars: RegistryEnvVar[]
): boolean {
  const isRequired = vars.find((s) => s.name === value.name)?.required
  if (isRequired && !value.value?.secret) {
    return false
  }
  return true
}

function refineEnvVar(
  value: {
    name: string
    value?: string | undefined
  },
  vars: RegistryEnvVar[]
): boolean {
  const isRequired = vars.find((s) => s.name === value.name)?.required
  if (isRequired && !value.value) {
    return false
  }
  return true
}

/**
 * Returns the form schema used to validate the "run from registry" form.
 * The schema is dynamically generated based on the server's environment variables.
 */
export function getFormSchemaRunFromRegistry({
  envVars,
  secrets,
}: GroupedEnvVars) {
  return z.object({
    serverName: z.string().min(1, 'Server name is required'),
    secrets: z
      .object({
        name: z.union(secrets.map(({ name }) => z.literal(name ?? ''))),
        value: z.object({
          secret: z.string().optional(), // NOTE: This is optional to allow us to pre-populate the form with empty strings, we refine based on whether it is required by the server later.
          isFromStore: z.boolean(),
        }),
      })
      .refine((d) => refineSecret(d, secrets), {
        error: 'This secret is required',
        path: ['value'],
      })
      .array(),
    envVars: z
      .object({
        name: z.union(envVars.map(({ name }) => z.literal(name ?? ''))),
        value: z.string().optional(),
      })
      .refine((d) => refineEnvVar(d, envVars), {
        error: 'This environment variable is required',
        path: ['value'],
      })
      .array(),
  })
}

export type FormSchemaRunFromRegistry = z.infer<
  ReturnType<typeof getFormSchemaRunFromRegistry>
>
