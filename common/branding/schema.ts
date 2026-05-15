import { z } from 'zod/v4'

// SEP#725 — Shape of the JSON at the branding config path. Matches cloud-ui's
// `BrandingConfig` (`sep/enterprise/toolhive-cloud-ui/src/lib/branding-config.ts`).
// Field names are snake-cased so operators write idiomatic JSON. All fields
// are optional; missing fields fall back to the bundled defaults.
//
// Studio currently consumes only `design_tokens.colors`; the non-color fields
// (`app_name`, `logo_url`, `favicon_url`) are parsed for forward compatibility
// but not yet applied — see the "Non-color fields" deferred decision in
// scratchpad / SEP#725.

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
  // Reject unknown top-level keys silently rather than failing — operators
  // may pass through extra fields the config server adds in the future.
  .loose()

export type BrandingConfig = z.infer<typeof brandingConfigSchema>
