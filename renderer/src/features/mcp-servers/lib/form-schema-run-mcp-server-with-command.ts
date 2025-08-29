import type { CoreWorkload } from '@api/types.gen'
import z from 'zod/v4'

export const getFormSchemaRunMcpCommand = (workloads: CoreWorkload[]) => {
  const baseFields = z.object({
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

  return z
    .discriminatedUnion('type', [
      baseFields.extend({
        type: z.literal('docker_image'),
        image: z.string().nonempty('Docker image is required'),
      }),
      baseFields.extend({
        type: z.literal('package_manager'),
        protocol: z.union(
          [z.literal('npx'), z.literal('uvx'), z.literal('go')],
          'Please select either npx, uvx, or go.'
        ),
        package_name: z.string().nonempty('Package name is required'),
      }),
    ])
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

export type FormSchemaRunMcpCommand = z.infer<
  ReturnType<typeof getFormSchemaRunMcpCommand>
>
