import type { CoreWorkload } from '@api/types.gen'
import z from 'zod/v4'
import {
  createMcpBaseSchema,
  createNetworkConfigSchema,
  createVolumesSchema,
  createTransportConfigSchema,
  createCommandArgumentsSchema,
  addNetworkValidation,
} from './form-schema-mcp'

export const getFormSchemaLocalMcp = (
  workloads: CoreWorkload[],
  editingServerName?: string
) => {
  // Filter out the editing server name from workloads for validation
  const filteredWorkloads = editingServerName
    ? workloads.filter((w) => w.name !== editingServerName)
    : workloads

  const baseSchema = createMcpBaseSchema(filteredWorkloads)
  const transportSchema = createTransportConfigSchema()
  const commandArgsSchema = createCommandArgumentsSchema()
  const networkSchema = createNetworkConfigSchema()
  const volumesSchema = createVolumesSchema()

  const dockerImageSchema = baseSchema
    .extend(transportSchema.shape)
    .extend(commandArgsSchema.shape)
    .extend(networkSchema.shape)
    .extend(volumesSchema.shape)
    .extend({
      type: z.literal('docker_image'),
      image: z.string().nonempty('Docker image is required'),
    })

  const packageManagerSchema = baseSchema
    .extend(transportSchema.shape)
    .extend(commandArgsSchema.shape)
    .extend(networkSchema.shape)
    .extend(volumesSchema.shape)
    .extend({
      type: z.literal('package_manager'),
      protocol: z.union(
        [z.literal('npx'), z.literal('uvx'), z.literal('go')],
        'Please select either npx, uvx, or go.'
      ),
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
