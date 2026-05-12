const getCspMap = (sentryDsn?: string) => {
  const hasSentry = Boolean(sentryDsn)
  const workerSrc = hasSentry ? "'self' blob:" : "'self'"

  // The renderer never makes direct HTTP requests to thv — they are forwarded
  // over IPC to the main process, which dials the UNIX socket / named pipe —
  // so no localhost entry is needed in connect-src.
  const connectParts = ["'self'", 'https://api.hsforms.com']
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
    'child-src': "'self' blob:",
  }
}

export const getCspString = (sentryDsn?: string) =>
  Object.entries(getCspMap(sentryDsn))
    .map(([key, value]) => `${key} ${value}`)
    .join('; ')
