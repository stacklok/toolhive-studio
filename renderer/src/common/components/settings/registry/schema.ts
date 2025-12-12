import { z } from 'zod/v4'
import { REGISTRY_FORM_TYPES } from './utils'

export const registryFormSchema = z
  .object({
    type: z.enum(REGISTRY_FORM_TYPES).default('default'),
    source: z.string().optional(),
    allow_private_ip: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    const requiresSource =
      data.type === 'local_path' ||
      data.type === 'url' ||
      data.type === 'api_url'

    if (requiresSource && (!data.source || data.source.trim().length === 0)) {
      ctx.addIssue({
        code: 'custom',
        path: ['source'],
        message:
          data.type === 'local_path'
            ? 'File path is required'
            : 'Registry URL is required',
      })
    }
  })
  .refine(
    (data) => {
      if (data.type === 'local_path' || data.type === 'url') {
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
      if (data.type === 'url' && data.source) {
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
      if (data.type === 'api_url' && data.source) {
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

export type RegistryFormData = z.infer<typeof registryFormSchema>
