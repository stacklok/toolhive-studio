import type { CoreWorkload } from '@api/types.gen'
import z from 'zod/v4'
import type { GroupedEnvVars } from './group-env-vars'
import { isEmptyEnvVar } from '@/common/lib/utils'
import { createRegistrySchema } from '@/common/lib/form-schema-mcp'

/**
 * Returns the form schema used to validate the "run from registry" form.
 * The schema is dynamically generated based on the server's environment variables.
 */
export function getFormSchemaRegistryMcp({
  envVars,
  secrets,
  workloads,
  editingServerName,
}: GroupedEnvVars & {
  workloads: CoreWorkload[]
  editingServerName?: string
}) {
  // Filter out the editing server name from workloads for validation
  const filteredWorkloads = editingServerName
    ? workloads.filter((w) => w.name !== editingServerName)
    : workloads

  const base = createRegistrySchema(
    filteredWorkloads,
    envVars,
    secrets,
    (value) => isEmptyEnvVar(value as string | null | undefined)
  )

  return base.safeExtend({
    group: z.string().nonempty('Group is required'),
  })
}

export type FormSchemaRegistryMcp = z.infer<
  ReturnType<typeof getFormSchemaRegistryMcp>
>
