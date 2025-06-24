import type { WorkloadsWorkload } from '@/common/api/generated'
import z from 'zod/v4'

const getCommonFields = (workloads: WorkloadsWorkload[]) =>
  z.object({
    name: z
      .string()
      .nonempty('Name is required')
      .refine(
        (value) => !workloads.some((w) => w.name === value),
        'This name is already in use'
      ),
    transport: z.union(
      [z.literal('sse'), z.literal('stdio')],
      'Please select either SSE or stdio.'
    ),
    cmd_arguments: z.string().optional(),
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

export const getFormSchemaRunMcpCommand = (workloads: WorkloadsWorkload[]) =>
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('docker_image'),
      image: z.string().nonempty('Docker image is required'),
      ...getCommonFields(workloads).shape,
    }),
    z.object({
      type: z.literal('package_manager'),
      protocol: z.union(
        [z.literal('npx'), z.literal('uvx'), z.literal('go')],
        'Please select either npx, uvx, or go.'
      ),
      package_name: z.string().nonempty('Package name is required'),
      ...getCommonFields(workloads).shape,
    }),
  ])

export type FormSchemaRunMcpCommand = z.infer<
  ReturnType<typeof getFormSchemaRunMcpCommand>
>
