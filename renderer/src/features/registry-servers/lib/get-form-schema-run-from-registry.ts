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
  const isNonEmptyString = (v: unknown): v is string =>
    typeof v === 'string' && v.length > 0

  const secretNames = Array.from(
    new Set(secrets.map(({ name }) => name).filter(isNonEmptyString))
  )
  const secretNameSchema =
    secretNames.length === 0
      ? z.string()
      : z.union(secretNames.map((v) => z.literal(v)))

  const envVarNames = Array.from(
    new Set(envVars.map(({ name }) => name).filter(isNonEmptyString))
  )
  const envVarNameSchema =
    envVarNames.length === 0
      ? z.string()
      : z.union(envVarNames.map((v) => z.literal(v)))

  return z
    .object({
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
          name: secretNameSchema,
          value: z.object({
            secret: z.string().optional(),
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
          name: envVarNameSchema,
          value: z.string().optional(),
        })
        .refine((d) => refineEnvVar(d, envVars), {
          error: 'This environment variable is required',
          path: ['value'],
        })
        .array(),
      networkIsolation: z.boolean(),
      allowedHosts: z
        .array(
          z.object({
            value: z.string(),
          })
        )
        .optional(),
      allowedPorts: z
        .array(
          z.object({
            value: z.string(),
          })
        )
        .optional(),
      volumes: z
        .array(
          z.object({
            host: z.string(),
            container: z.string(),
            accessMode: z.enum(['ro', 'rw']).optional(),
          })
        )
        .optional(),
    })
    .superRefine((data, ctx) => {
      // Skip validation if network isolation is disabled
      if (!data.networkIsolation) {
        return
      }

      // Validate allowedHosts only when network isolation is enabled
      data.allowedHosts?.forEach((host, index) => {
        if (
          host.value.trim() !== '' &&
          !/^\.?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(host.value)
        ) {
          ctx.addIssue({
            code: 'custom',
            message: 'Invalid host format',
            path: ['allowedHosts', index, 'value'],
          })
        }
      })

      // Validate allowedPorts only when network isolation is enabled
      data.allowedPorts?.forEach((port, index) => {
        if (port.value.trim() !== '') {
          const num = parseInt(port.value, 10)
          if (isNaN(num) || num < 1 || num > 65535) {
            ctx.addIssue({
              code: 'custom',
              message: 'Port must be a number between 1 and 65535',
              path: ['allowedPorts', index, 'value'],
            })
          }
        }
      })
    })
}

export type FormSchemaRunFromRegistry = z.infer<
  ReturnType<typeof getFormSchemaRunFromRegistry>
>
