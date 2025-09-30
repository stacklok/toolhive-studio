import type { CoreWorkload } from '@api/types.gen'
import { z } from 'zod/v4'

const createNameSchema = (workloads: CoreWorkload[]) => {
  const nameValidation = z
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
    )

  return z.object({
    name: nameValidation,
  })
}

const createBasicEnvVarsSchema = () =>
  z.object({
    envVars: z.array(
      z.object({
        name: z.string().nonempty('Name is required'),
        value: z.string().nonempty('Value is required'),
      })
    ),
  })
const createBasicSecretsSchema = () =>
  z.object({
    secrets: z.array(
      z.object({
        name: z.string().nonempty('Name is required'),
        value: z.object({
          secret: z.string().nonempty('Secret is required'),
          isFromStore: z.boolean(),
        }),
      })
    ),
  })

const createCommandArgumentsSchema = () => {
  return z.object({
    cmd_arguments: z.array(z.string()).optional(),
  })
}

const createNetworkConfigSchema = () => {
  return z.object({
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
  })
}

const createVolumesSchema = () => {
  return z.object({
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
}

const createTransportConfigSchema = () => {
  return z.object({
    transport: z.union(
      [z.literal('sse'), z.literal('stdio'), z.literal('streamable-http')],
      'Please select either SSE, stdio, or streamable-http.'
    ),
    target_port: z.number().optional(),
  })
}

export const addNetworkValidation = (ctx: z.RefinementCtx, data: unknown) => {
  const networkData = data as {
    networkIsolation?: boolean
    allowedHosts?: Array<{ value: string }>
    allowedPorts?: Array<{ value: string }>
  }
  // Skip validation if network isolation is disabled
  if (!networkData.networkIsolation) {
    return
  }

  // Validate allowedHosts only when network isolation is enabled
  networkData.allowedHosts?.forEach((host, index) => {
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
  networkData.allowedPorts?.forEach((port, index) => {
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
}

// Utility functions for dynamic schema creation
const createDynamicNameSchema = (names: string[]) => {
  return names.length === 0
    ? z.string()
    : z.union(names.map((name) => z.literal(name)))
}

// --------
// REGISTRY SERVER

const createRegistrySecretsSchema = (
  secretNames: string[],
  secrets: Array<{ name?: string; required?: boolean }>,
  isEmptyValueFn: (value: unknown) => boolean
) => {
  const secretNameSchema = createDynamicNameSchema(secretNames)

  const secretObjSchema = z
    .object({
      name: secretNameSchema,
      value: z.object({
        secret: z.string(),
        isFromStore: z.boolean(),
      }),
    })
    .refine(
      (d) => {
        const isRequired = secrets.find((s) => s.name === d.name)?.required
        if (isRequired && isEmptyValueFn(d.value?.secret)) {
          return false
        }
        return true
      },
      {
        message: 'This secret is required',
        path: ['value'],
      }
    )

  return z.object({
    secrets: secretObjSchema.array(),
  })
}

const createRegistryEnvVarsSchema = (
  envVarNames: string[],
  envVars: Array<{ name?: string; required?: boolean }>,
  isEmptyValueFn: (value: unknown) => boolean
) => {
  const envVarNameSchema = createDynamicNameSchema(envVarNames)

  const envVarSchema = z
    .object({
      name: envVarNameSchema,
      value: z.string().optional(),
    })
    .refine(
      (d) => {
        const isRequired = envVars.find((s) => s.name === d.name)?.required
        if (isRequired && isEmptyValueFn(d.value)) {
          return false
        }
        return true
      },
      {
        message: 'This environment variable is required',
        path: ['value'],
      }
    )

  return z.object({
    envVars: envVarSchema.array(),
  })
}

export const createRegistrySchema = (
  workloads: CoreWorkload[],
  envVars: Array<{ name?: string; required?: boolean }>,
  secrets: Array<{ name?: string; required?: boolean }>,
  isEmptyValueFn: (value: unknown) => boolean
) => {
  const isNonEmptyString = (v: unknown): v is string =>
    typeof v === 'string' && v.length > 0

  const secretNames = Array.from(
    new Set(secrets.map(({ name }) => name).filter(isNonEmptyString))
  )

  const envVarNames = Array.from(
    new Set(envVars.map(({ name }) => name).filter(isNonEmptyString))
  )

  const nameSchema = createNameSchema(workloads)
  const secretsSchema = createRegistrySecretsSchema(
    secretNames,
    secrets,
    isEmptyValueFn
  )
  const envVarsSchema = createRegistryEnvVarsSchema(
    envVarNames,
    envVars,
    isEmptyValueFn
  )
  const commandArgsSchema = createCommandArgumentsSchema()
  const networkSchema = createNetworkConfigSchema()
  const volumesSchema = createVolumesSchema()

  return nameSchema
    .extend({
      group: z.string().min(1, 'Group is required'),
    })
    .extend(secretsSchema.shape)
    .extend(envVarsSchema.shape)
    .extend(commandArgsSchema.shape)
    .extend(networkSchema.shape)
    .extend(volumesSchema.shape)
    .superRefine((data, ctx) => {
      addNetworkValidation(ctx, data)
    })
}

export const createMcpBaseSchema = (workloads: CoreWorkload[]) => {
  const nameSchema = createNameSchema(workloads)
  const envVarsSchema = createBasicEnvVarsSchema()
  const secretsSchema = createBasicSecretsSchema()
  const transportSchema = createTransportConfigSchema()
  const commandArgsSchema = createCommandArgumentsSchema()
  const networkSchema = createNetworkConfigSchema()
  const volumesSchema = createVolumesSchema()

  const commonSchema = nameSchema
    .extend(transportSchema.shape)
    .extend(commandArgsSchema.shape)
    .extend(networkSchema.shape)
    .extend(volumesSchema.shape)
    .extend(envVarsSchema.shape)
    .extend(secretsSchema.shape)
    .extend({
      group: z.string(),
    })

  return commonSchema
}

// --------
//  REMOTE MCP SERVER

const remoteMcpOauthConfigSchema = z.object({
  authorize_url: z.string().optional(),
  callback_port: z.number().optional(),
  client_id: z.string().optional(),
  client_secret: z
    .object({
      name: z.string(),
      value: z.object({
        secret: z.string(),
        isFromStore: z.boolean(),
      }),
    })
    .optional(),
  issuer: z.string().optional(),
  oauth_params: z.record(z.string(), z.string()).optional(),
  scopes: z.string().optional(),
  skip_browser: z.boolean(),
  token_url: z.string().optional(),
  use_pkce: z.boolean(),
})

export const createRemoteMcpBaseSchema = (workloads: CoreWorkload[]) => {
  const nameSchema = createNameSchema(workloads)
  const envVarsSchema = createBasicEnvVarsSchema()
  const secretsSchema = createBasicSecretsSchema()
  const transportSchema = createTransportConfigSchema()
  const urlSchema = z.object({
    url: z.string().nonempty('The MCP server URL is required'),
  })
  const authTypeSchema = z.object({
    auth_type: z.enum(['none', 'oauth2', 'oidc']).default('none'),
  })

  const commonSchema = nameSchema
    .extend(urlSchema.shape)
    .extend(transportSchema.shape)
    .extend(envVarsSchema.shape)
    .extend(secretsSchema.shape)
    .extend(urlSchema.shape)
    .extend(authTypeSchema.shape)
    .extend({ oauth_config: remoteMcpOauthConfigSchema })

  return commonSchema
}
