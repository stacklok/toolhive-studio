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
  // `Buffer` is not available in sandboxed preloads since Electron 45, so
  // decode with web APIs. `atob` throws on malformed input — fall back to no
  // branding rather than crashing the preload (which would drop electronAPI).
  try {
    const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0))
    return new TextDecoder().decode(bytes)
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
