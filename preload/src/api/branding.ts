// SEP#725 — Brand color overrides.
//
// Main process reads the operator's `branding-0.json`, serializes it to a CSS
// string, and passes it to the renderer process via `webPreferences.additional
// Arguments`. Preload picks it out of `process.argv`, decodes it, and exposes
// it as a string constant on `electronAPI.branding.css`. The renderer injects
// it into `<head>` synchronously before mounting React — no IPC roundtrip,
// no FOUC.
//
// Argument format: `--branding-css=<base64-encoded-utf-8>`. Base64 keeps the
// CSS opaque to shell / argv quoting concerns; an empty CSS string is encoded
// as the empty payload. If the arg isn't present (e.g. tests, a window not
// created by `createMainWindow`), we expose an empty string.

const ARG_PREFIX = '--branding-css='

function readBrandingCss(): string {
  const arg = process.argv.find((a) => a.startsWith(ARG_PREFIX))
  if (!arg) return ''
  const encoded = arg.slice(ARG_PREFIX.length)
  if (!encoded) return ''
  try {
    return Buffer.from(encoded, 'base64').toString('utf-8')
  } catch {
    return ''
  }
}

export const brandingApi = {
  branding: {
    css: readBrandingCss(),
  },
} as const

export interface BrandingAPI {
  branding: {
    css: string
  }
}
