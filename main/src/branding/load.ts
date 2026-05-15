import { readFile } from 'node:fs/promises'
import {
  brandingConfigSchema,
  type BrandingConfig,
} from '@common/branding/schema'
import { colorTokensToStyleContent } from '@common/branding/color-tokens'
import log from '../logger'

// SEP#725 — Load the operator-supplied branding config and serialize the
// color-token overrides into a CSS string the renderer can inject verbatim
// into a `<style>` tag.
//
// One-shot read at boot. To pick up edits to the JSON without an app
// restart, replace this with an `fs.watch`-driven emitter that pushes
// updates to the renderer over IPC — out of scope for the initial cut
// (see scratchpad "Hot reload vs restart-required" decision).
//
// Returns `null` on any read / parse / shape error. All failure modes are
// logged at warn level so a broken config surfaces in studio logs instead of
// silently falling back to the default palette.

export async function loadBrandingConfig(
  filePath: string
): Promise<BrandingConfig | null> {
  let raw: string
  try {
    raw = await readFile(filePath, 'utf-8')
  } catch (err) {
    // ENOENT is the common "operator didn't configure anything" case — quiet.
    if (
      err instanceof Error &&
      'code' in err &&
      (err as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return null
    }
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
  return result.data
}

// Composes the loader + the renderer-facing CSS emitter. Returns an empty
// string if there is no config, or no color overrides in the config, so the
// renderer can unconditionally inject the result into a `<style>` block.
export async function getBrandingCss(filePath: string): Promise<string> {
  const config = await loadBrandingConfig(filePath)
  return colorTokensToStyleContent(config?.design_tokens?.colors)
}
