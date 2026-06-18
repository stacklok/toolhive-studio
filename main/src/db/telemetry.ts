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

// Bucket A: the on-disk schema is newer than the running app, so the migrator
// disabled all writes (see migrator.ts). Reported once per launch on affected
// installs. os.name / release are attached automatically by @sentry/electron.
export function captureDbReadOnly(
  appliedSchema: number,
  knownSchema: number
): void {
  Sentry.withScope((scope) => {
    scope.setTag('db.failure_bucket', 'schema_newer')
    scope.setExtras({
      'db.applied_schema': appliedSchema,
      'db.known_schema': knownSchema,
    })
    Sentry.captureMessage(
      `[DB] Read-only: on-disk schema v${appliedSchema} is newer than app v${knownSchema}; SQLite writes disabled`,
      'warning'
    )
  })
}

// Bucket B: a SQLite write actually threw (filesystem/permission/lock/disk/
// corruption). The native `code` (e.g. SQLITE_IOERR, SQLITE_FULL, SQLITE_BUSY)
// is surfaced as a tag so we can tell the failure modes apart.
export function captureDbWriteFailure(
  table: string,
  key: string,
  error: unknown
): void {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : undefined
  Sentry.withScope((scope) => {
    scope.setTag('db.failure_bucket', 'write_threw')
    scope.setTag('db.table', table)
    if (code) scope.setTag('db.sqlite_code', code)
    scope.setExtras({ 'db.key': key })
    Sentry.captureException(error)
  })
}
