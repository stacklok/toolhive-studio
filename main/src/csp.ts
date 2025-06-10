const getCspMap = (port: number) => ({
  'default-src': "'self'",
  'script-src': "'self'",
  'style-src': "'self' 'unsafe-inline'",
  'img-src': "'self' data: blob:",
  'font-src': "'self' data:",
  'connect-src': `'self' http://localhost:${port}`,
  'frame-src': "'none'",
  'object-src': "'none'",
  'base-uri': "'self'",
  'form-action': "'self'",
  'frame-ancestors': "'none'",
  'manifest-src': "'self'",
  'media-src': "'self' blob: data:",
  'worker-src': "'self'",
})

export const getCspString = (port: number) =>
  Object.entries(getCspMap(port))
    .map(([key, value]) => `${key} ${value}`)
    .join('; ')
