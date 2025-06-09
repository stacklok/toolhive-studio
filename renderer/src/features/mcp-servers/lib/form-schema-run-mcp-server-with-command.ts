import z from 'zod/v4'

// TODO: Add secrets into the form schema
const commonFields = z.object({
  name: z.string().nonempty('Name is required'),
  transport: z.union(
    [z.literal('sse'), z.literal('stdio')],
    'Please select either SSE or stdio.'
  ),
  cmd_arguments: z.string().optional(),
  environment_variables: z
    .object({
      key: z.string().nonempty('Key is required'),
      value: z.string().nonempty('Value is required'),
    })
    .array(),
})

export const formSchemaRunMcpCommand = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('docker_image'),
    image: z.string().nonempty('Docker image is required'),
    ...commonFields.shape,
  }),
  z.object({
    type: z.literal('package_manager'),
    protocol: z.union(
      [z.literal('npx'), z.literal('uvx'), z.literal('go')],
      'Please select either npx, uvx, or go.'
    ),
    package_name: z.string().nonempty('Package name is required'),
    ...commonFields.shape,
  }),
])

export type FormSchemaRunMcpCommand = z.infer<typeof formSchemaRunMcpCommand>
