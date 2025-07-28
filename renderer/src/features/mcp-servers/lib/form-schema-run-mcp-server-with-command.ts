import type { WorkloadsWorkload } from '@/common/api/generated'
import z from 'zod/v4'

const getCommonFields = (workloads: WorkloadsWorkload[]) =>
  z.object({
    name: z
      .union([z.string(), z.undefined()])
      .transform((val) => val ?? '')
      .pipe(
        z
          .string()
          .nonempty('Name is required')
          .refine(
            (value) => value.length === 0 || /^[a-zA-Z0-9._-]+$/.test(value),
            'Invalid server name: it can only contain alphanumeric characters, dots, hyphens, and underscores.'
          )
          .refine(
            (value) => !workloads.some((w) => w.name === value),
            'This name is already in use'
          )
      ),
    transport: z.union(
      [z.literal('sse'), z.literal('stdio'), z.literal('streamable-http')],
      'Please select either SSE, stdio, or streamable-http.'
    ),
    target_port: z.number().optional(),
    cmd_arguments: z.array(z.string()).optional(),
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
