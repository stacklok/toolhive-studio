import { z } from 'zod/v4'

// Shape of the JSON at the branding config path. Studio currently consumes
// only `design_tokens.colors`; the other fields are parsed for forward
// compatibility but not yet applied.

const colorMap = z.record(z.string(), z.string())

export const brandingConfigSchema = z
  .object({
    app_name: z.string().optional(),
    logo_url: z.string().optional(),
    favicon_url: z.string().optional(),
    design_tokens: z
      .object({
        colors: z
          .object({
            light: colorMap.optional(),
            dark: colorMap.optional(),
          })
          .optional(),
      })
      .optional(),
  })
  // Tolerate unknown top-level keys — operators may pass through extra fields
  // the config server adds in the future.
  .loose()

export type BrandingConfig = z.infer<typeof brandingConfigSchema>
