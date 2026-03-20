import { z } from 'zod/v4'
import { REGISTRY_FORM_TYPES, REGISTRY_FORM_TYPE } from './utils'

export const registryFormSchema = z
  .object({
    type: z.enum(REGISTRY_FORM_TYPES).default(REGISTRY_FORM_TYPE.DEFAULT),
    source: z.string().optional(),
    allow_private_ip: z.boolean().optional(),
    client_id: z.string().optional(),
    issuer_url: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const requiresSource =
      data.type === REGISTRY_FORM_TYPE.LOCAL_PATH ||
      data.type === REGISTRY_FORM_TYPE.URL ||
      data.type === REGISTRY_FORM_TYPE.API_URL

    if (requiresSource && (!data.source || data.source.trim().length === 0)) {
      ctx.addIssue({
        code: 'custom',
        path: ['source'],
        message:
          data.type === REGISTRY_FORM_TYPE.LOCAL_PATH
            ? 'File path is required'
            : data.type === REGISTRY_FORM_TYPE.API_URL
              ? 'Registry Server API URL is required'
              : 'Registry URL is required',
      })
    }
  })
  .refine(
    (data) => {
      if (
        data.type === REGISTRY_FORM_TYPE.LOCAL_PATH ||
        data.type === REGISTRY_FORM_TYPE.URL
      ) {
        return data.source?.endsWith('.json')
      }
      return true
    },
    {
      message: 'Registry must be a .json file',
      path: ['source'],
    }
  )
  .refine(
    (data) => {
      if (data.type === REGISTRY_FORM_TYPE.URL && data.source) {
        if (!data.source.startsWith('https://')) {
          return false
        }
        try {
          new URL(data.source)
          return true
        } catch {
          return false
        }
      }
      return true
    },
    {
      message: 'Remote registry must be a valid HTTPS URL',
      path: ['source'],
    }
  )
  .refine(
    (data) => {
      if (data.type === REGISTRY_FORM_TYPE.API_URL && data.source) {
        try {
          new URL(data.source)
          return true
        } catch {
          return false
        }
      }
      return true
    },
    {
      message: 'Registry Server API must be a valid URL',
      path: ['source'],
    }
  )
  .refine(
    (data) => {
      const issuer = data.issuer_url?.trim()
      if (data.type !== REGISTRY_FORM_TYPE.API_URL || !issuer) {
        return true
      }
      try {
        new URL(issuer)
        return true
      } catch {
        return false
      }
    },
    {
      message: 'Issuer URL must be a valid URL',
      path: ['issuer_url'],
    }
  )

export type RegistryFormData = z.infer<typeof registryFormSchema>
