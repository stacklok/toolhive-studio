import { readFile } from 'node:fs/promises'
import {
  brandingConfigSchema,
  type BrandingConfig,
} from '@common/branding/schema'
import { colorTokensToStyleContent } from '@common/branding/color-tokens'
import log from '../logger'

// Load the operator-supplied branding config. One-shot read at boot;
// restart required to pick up edits. Returns `null` on any read / parse /
// shape error; failures are warn-logged so a broken config surfaces in logs
// instead of silently falling back to the default palette.

function isEnoent(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err && err.code === 'ENOENT'
}

export async function loadBrandingConfig(
  filePath: string
): Promise<BrandingConfig | null> {
  let raw: string
  try {
    raw = await readFile(filePath, 'utf-8')
  } catch (err) {
    // ENOENT is the common "operator didn't configure anything" case — quiet.
    if (isEnoent(err)) return null
    log.warn(
      `[branding] failed to read ${filePath}: ${
        err instanceof Error ? err.message : String(err)
      }`
    )
    return null
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    log.warn(
      `[branding] invalid JSON in ${filePath}: ${
        err instanceof Error ? err.message : String(err)
      }`
    )
    return null
  }

  const result = brandingConfigSchema.safeParse(parsed)
  if (!result.success) {
    log.warn(
      `[branding] config at ${filePath} did not match schema: ${result.error.message}`
    )
    return null
  }

  // Operator-typo trap: Zod's default `.strip()` silently drops unknown
  // nested keys (e.g. `design_tokens.color` instead of `colors`). Warn-log
  // so the operator sees their typo instead of a silent default-fallback.
  if (parsed && typeof parsed === 'object' && 'design_tokens' in parsed) {
    const dt = (parsed as { design_tokens?: unknown }).design_tokens
    if (dt && typeof dt === 'object') {
      for (const key of Object.keys(dt)) {
        if (key !== 'colors') {
          log.warn(
            `[branding] ${filePath}: unknown design_tokens.${key} (did you mean "colors"?)`
          )
        }
      }
    }
  }

  return result.data
}

// Returns an empty string when there's no config or no color overrides, so
// the renderer can unconditionally inject the result into a `<style>` block.
export async function getBrandingCss(filePath: string): Promise<string> {
  const config = await loadBrandingConfig(filePath)
  return colorTokensToStyleContent(config?.design_tokens?.colors)
}
