import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'

interface ThvBinaryMode {
  mode: string
  path: string
  isDefault: boolean
}

/**
 * Banner that displays a warning when using a non-default thv binary in development mode.
 * Only visible when THV binary mode is set to 'custom' in .thv_bin config.
 */
export function ThvBinaryModeBanner() {
  const [binaryMode, setBinaryMode] = useState<ThvBinaryMode | null>(null)
  const [version, setVersion] = useState<string | null>(null)

  useEffect(() => {
    // Fetch the current thv binary mode and version
    Promise.all([
      window.electronAPI.getThvBinaryMode(),
      window.electronAPI.getToolhiveVersion().catch(() => null),
    ])
      .then(([mode, ver]) => {
        setBinaryMode(mode as ThvBinaryMode)
        setVersion(typeof ver === 'string' ? ver : null)
      })
      .catch((error: unknown) => {
        console.error('Failed to get thv binary info:', error)
      })
  }, [])

  // Don't render if we haven't loaded the mode yet, or if it's the default mode
  if (!binaryMode || binaryMode.isDefault) {
    return null
  }

  return (
    <div
      className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2"
      role="status"
      aria-live="polite"
    >
      <div
        className="flex max-w-[95vw] items-start gap-2 rounded-md border
          border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-900
          sm:max-w-xl dark:border-yellow-800 dark:bg-yellow-950
          dark:text-yellow-100"
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <div className="min-w-0">
          {version ? (
            <>
              <span> thv </span>
              <span className="font-mono text-xs">{version}</span>
              <span> at </span>
            </>
          ) : (
            <>
              <span>Using thv binary at </span>
            </>
          )}
          <span
            className="rounded bg-yellow-100 px-1 py-0.5 font-mono text-[10px]
              leading-4 break-all dark:bg-yellow-900"
            title={binaryMode.path}
          >
            {binaryMode.path}
          </span>
        </div>
      </div>
    </div>
  )
}
