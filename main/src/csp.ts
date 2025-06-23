const getCspMap = (port: number, sentryDsn?: string) => {
  // In production with Sentry enabled, allow blob workers for replay
  const hasSentry = Boolean(sentryDsn)
  const workerSrc = hasSentry ? "'self' blob:" : "'self'"

  return {
    'default-src': "'self'",
    'script-src': "'self'",
    'style-src': "'self' 'unsafe-inline'",
    'img-src': "'self' data: blob:",
    'font-src': "'self' data:",
    'connect-src': `'self' http://localhost:${port}${hasSentry ? ' https://*.sentry.io' : ''}`,
    'frame-src': "'none'",
    'object-src': "'none'",
    'base-uri': "'self'",
    'form-action': "'self'",
    'frame-ancestors': "'none'",
    'manifest-src': "'self'",
    'media-src': "'self' blob: data:",
    // Allow blob: workers only when Sentry is configured
    'worker-src': workerSrc,
    'child-src': "'none'",
  }
}

export const getCspString = (port: number, sentryDsn?: string) =>
  Object.entries(getCspMap(port, sentryDsn))
    .map(([key, value]) => `${key} ${value}`)
    .join('; ')
