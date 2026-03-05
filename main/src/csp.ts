const getCspMap = (port: number | undefined, sentryDsn?: string) => {
  const hasSentry = Boolean(sentryDsn)
  const workerSrc = hasSentry ? "'self' blob:" : "'self'"

  // When using UNIX sockets the renderer never makes direct HTTP requests
  // to the thv server, so no localhost entry is needed in connect-src.
  const connectParts = ["'self'"]
  if (port != null) connectParts.push(`http://localhost:${port}`)
  connectParts.push('https://api.hsforms.com')
  if (hasSentry) connectParts.push('https://*.sentry.io')

  return {
    'default-src': "'self'",
    'script-src': "'self'",
    'style-src': "'self' 'unsafe-inline'",
    'img-src': "'self' data: blob:",
    'font-src': "'self' data:",
    'connect-src': connectParts.join(' '),
    'frame-src': "'none'",
    'object-src': "'none'",
    'base-uri': "'self'",
    'form-action': "'self'",
    'frame-ancestors': "'none'",
    'manifest-src': "'self'",
    'media-src': "'self' blob: data:",
    'worker-src': workerSrc,
    'child-src': "'none'",
  }
}

export const getCspString = (port: number | undefined, sentryDsn?: string) =>
  Object.entries(getCspMap(port, sentryDsn))
    .map(([key, value]) => `${key} ${value}`)
    .join('; ')
