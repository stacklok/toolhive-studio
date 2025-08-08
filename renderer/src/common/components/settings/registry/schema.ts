import { z } from 'zod/v4'

export const registryFormSchema = z
  .object({
    type: z.enum(['file', 'url', 'default']).default('default'),
    source: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'url' || data.type === 'file') {
        return data.source && data.source.trim().length > 0
      }
      return true
    },
    {
      message: 'Registry URL or file path is required',
      path: ['source'],
    }
  )
  .refine(
    (data) => {
      if (data.type === 'url' || data.type === 'file') {
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

export type RegistryFormData = z.infer<typeof registryFormSchema>
