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
    permission_profile: z
      .object({
        name: z.string().optional(),
        network: z.object({
          outbound: z.object({
            allow_host: z.array(z.string()),
            allow_port: z.array(z.number()),
            allow_transport: z.array(z.string()),
            insecure_allow_all: z.boolean(),
          }),
        }),
        read: z.array(z.string()).optional(),
        write: z.array(z.string()).optional(),
      })
      .optional(),
  })
}

export type FormSchemaRunFromRegistry = z.infer<
  ReturnType<typeof getFormSchemaRunFromRegistry>
>
