// Pick the branding CSS out of `process.argv` (set by the main process via
// `webPreferences.additionalArguments`) and expose it on `electronAPI.branding.css`.
// Synchronous read avoids an IPC roundtrip and a flash of unstyled content.
// Argument format: `--branding-css=<base64-encoded-utf-8>` — base64 keeps the
// CSS opaque to shell / argv quoting.

const ARG_PREFIX = '--branding-css='

function readBrandingCss(): string {
  const arg = process.argv.find((a) => a.startsWith(ARG_PREFIX))
  if (!arg) return ''
  const encoded = arg.slice(ARG_PREFIX.length)
  if (!encoded) return ''
  // Buffer.from(..., 'base64') silently drops invalid bytes — never throws.
  return Buffer.from(encoded, 'base64').toString('utf-8')
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
