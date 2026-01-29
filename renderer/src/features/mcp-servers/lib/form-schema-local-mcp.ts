import type { CoreWorkload } from '@common/api/generated/types.gen'
import z from 'zod/v4'
import {
  createMcpBaseSchema,
  addNetworkValidation,
} from '@/common/lib/form-schema-mcp'

export const getFormSchemaLocalMcp = (
  workloads: CoreWorkload[],
  editingServerName?: string
) => {
  const filteredWorkloads = editingServerName
    ? workloads.filter((w) => w.name !== editingServerName)
    : workloads

  const commonSchemaMcp = createMcpBaseSchema(filteredWorkloads)

  const dockerImageSchema = commonSchemaMcp.extend({
    type: z.literal('docker_image'),
    image: z.string().nonempty('Docker image is required'),
  })

  const packageManagerSchema = commonSchemaMcp.extend({
    type: z.literal('package_manager'),
    protocol: z.union([z.literal('npx'), z.literal('uvx'), z.literal('go')]),
    package_name: z.string().nonempty('Package name is required'),
  })

  return z
    .discriminatedUnion('type', [dockerImageSchema, packageManagerSchema])
    .superRefine((data, ctx) => {
      addNetworkValidation(ctx, data)
    })
}

export type FormSchemaLocalMcp = z.infer<
  ReturnType<typeof getFormSchemaLocalMcp>
>
