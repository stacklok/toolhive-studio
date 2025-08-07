import type { RegistryEnvVar, CoreWorkload } from '@api/types.gen'
import z from 'zod/v4'
import type { GroupedEnvVars } from './group-env-vars'
import { isEmptyEnvVar } from '@/common/lib/utils'

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
  if (isRequired && isEmptyEnvVar(value.value?.secret)) {
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
  if (isRequired && isEmptyEnvVar(value.value)) {
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
  workloads,
}: GroupedEnvVars & { workloads: CoreWorkload[] }) {
  return z.object({
    serverName: z
      .string()
      .min(1, 'Server name is required')
      .refine(
        (value) => !workloads.some((w) => w.name === value),
        'This name is already in use'
      ),
    cmd_arguments: z.array(z.string()).optional(),
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
    networkIsolation: z.boolean(),
    allowedHosts: z.array(
      z.object({
        value: z.string().refine(
          (val) => {
            if (val.trim() === '') return true
            return /^\.?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(val)
          },
          {
            message: 'Invalid host format',
          }
        ),
      })
    ),
    allowedPorts: z.array(
      z.object({
        value: z.string().refine(
          (val) => {
            const num = parseInt(val, 10)
            return !isNaN(num) && num >= 1 && num <= 65535
          },
          {
            message: 'Port must be a number between 1 and 65535',
          }
        ),
      })
    ),
    volumes: z.array(
      z.object({
        host: z.string(),
        container: z.string(),
        accessMode: z.enum(['ro', 'rw']).optional(),
      })
    ),
  })
}

export type FormSchemaRunFromRegistry = z.infer<
  ReturnType<typeof getFormSchemaRunFromRegistry>
>
