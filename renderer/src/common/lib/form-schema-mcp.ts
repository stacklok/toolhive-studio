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
        secret: z.string().optional(),
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

  return commonSchema
}

// --------
//  REMOTE MCP SERVER
export const createAuthConfigSchema = () => {
  return z.object({
    url: z.string().optional(),
    auth_type: z
      .union([z.literal('none'), z.literal('oauth2'), z.literal('oidc')])
      .optional(),
    issuer_url: z.string().optional(),
    client_id: z.string().optional(),
    client_secret: z.string().optional(),
    scopes: z.string().optional(),
    pkce: z.boolean(),
    authorize_url: z.string().optional(),
    token_url: z.string().optional(),
  })
}

export const addAuthValidation = (ctx: z.RefinementCtx, data: unknown) => {
  const authData = data as {
    auth_type?: 'none' | 'oauth2' | 'oidc'
    issuer_url?: string
    client_id?: string
    client_secret?: string
    scopes?: string
    authorize_url?: string
    token_url?: string
  }

  if (authData.auth_type === 'oidc') {
    if (!authData.issuer_url || authData.issuer_url.trim() === '') {
      ctx.addIssue({
        code: 'custom',
        message: 'Issuer URL is required for OIDC',
        path: ['issuer_url'],
      })
    }
    if (!authData.client_id || authData.client_id.trim() === '') {
      ctx.addIssue({
        code: 'custom',
        message: 'Client ID is required for OIDC',
        path: ['client_id'],
      })
    }
    if (!authData.client_secret || authData.client_secret.trim() === '') {
      ctx.addIssue({
        code: 'custom',
        message: 'Client Secret is required for OIDC',
        path: ['client_secret'],
      })
    }
    if (!authData.scopes || authData.scopes.trim() === '') {
      ctx.addIssue({
        code: 'custom',
        message: 'Scopes are required for OIDC',
        path: ['scopes'],
      })
    }
  } else if (authData.auth_type === 'oauth2') {
    if (!authData.authorize_url || authData.authorize_url.trim() === '') {
      ctx.addIssue({
        code: 'custom',
        message: 'Authorize URL is required for OAuth2',
        path: ['authorize_url'],
      })
    }
    if (!authData.token_url || authData.token_url.trim() === '') {
      ctx.addIssue({
        code: 'custom',
        message: 'Token URL is required for OAuth2',
        path: ['token_url'],
      })
    }
    if (!authData.client_id || authData.client_id.trim() === '') {
      ctx.addIssue({
        code: 'custom',
        message: 'Client ID is required for OAuth2',
        path: ['client_id'],
      })
    }
    if (!authData.client_secret || authData.client_secret.trim() === '') {
      ctx.addIssue({
        code: 'custom',
        message: 'Client Secret is required for OAuth2',
        path: ['client_secret'],
      })
    }
    if (!authData.scopes || authData.scopes.trim() === '') {
      ctx.addIssue({
        code: 'custom',
        message: 'Scopes are required for OAuth2',
        path: ['scopes'],
      })
    }
  }
}

// --------

export type McpBaseSchema = z.infer<ReturnType<typeof createMcpBaseSchema>>

export type NetworkConfigSchema = z.infer<
  ReturnType<typeof createNetworkConfigSchema>
>

export type VolumesSchema = z.infer<ReturnType<typeof createVolumesSchema>>

export type TransportConfigSchema = z.infer<
  ReturnType<typeof createTransportConfigSchema>
>

export type AuthConfigSchema = z.infer<
  ReturnType<typeof createAuthConfigSchema>
>
