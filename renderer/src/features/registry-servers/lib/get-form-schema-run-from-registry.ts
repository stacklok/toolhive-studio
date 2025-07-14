import type {
  RegistryEnvVar,
  WorkloadsWorkload,
} from '@/common/api/generated/types.gen'
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

const validatePort = (val: string) => {
  if (!val.trim()) return 'Port is required'
  if (!/^[0-9]+$/.test(val)) return 'Port must be a number'
  const num = Number(val)
  if (isNaN(num) || num < 1 || num > 65535) return 'Port must be 1-65535'
  return null
}

const validateHost = (val: string) => {
  if (!val.trim()) return 'Host is required'
  if (!/^\.?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(val)) return 'Invalid host'
  return null
}

/**
 * Returns the form schema used to validate the "run from registry" form.
 * The schema is dynamically generated based on the server's environment variables.
 */
export function getFormSchemaRunFromRegistry({
  envVars,
  secrets,
  workloads,
}: GroupedEnvVars & { workloads: WorkloadsWorkload[] }) {
  return z.object({
    serverName: z
      .string()
      .min(1, 'Server name is required')
      .refine(
        (value) => !workloads.some((w) => w.name === value),
        'This name is already in use'
      ),
    cmd_arguments: z.string().optional(),
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
    allowedHosts: z
      .string()
      .refine((val) => validateHost(val) === null, {
        message: 'Invalid host',
      })
      .array(),
    allowedPorts: z
      .string()
      .refine((val) => validatePort(val.toString()) === null, {
        message: 'Invalid port',
      })
      .array(),
    allowedProtocols: z.string().array(),
  })
}

export type FormSchemaRunFromRegistry = z.infer<
  ReturnType<typeof getFormSchemaRunFromRegistry>
>
