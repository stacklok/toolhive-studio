import * as Sentry from '@sentry/electron/main'

export function withDbSpan<T>(
  name: string,
  op: string,
  attributes: Record<string, string | number | boolean>,
  fn: () => T
): T {
  return Sentry.startSpan(
    {
      name,
      op,
      attributes: {
        'analytics.source': 'tracking',
        'analytics.type': 'event',
        'db.system': 'sqlite',
        ...attributes,
      },
    },
    (span) => {
      try {
        const result = fn()
        span.setStatus({ code: 1 })
        return result
      } catch (error) {
        span.setStatus({
          code: 2,
          message: error instanceof Error ? error.message : String(error),
        })
        throw error
      }
    }
  )
}
