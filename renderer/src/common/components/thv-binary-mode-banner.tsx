import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'

interface ThvBinaryMode {
  mode: string
  path: string
  isDefault: boolean
}

/**
 * Banner that displays a warning when using a non-default thv binary in development mode.
 * Only visible when THV_BINARY_MODE is set to 'global' or 'custom' in .thv_bin config.
 */
export function ThvBinaryModeBanner() {
  const [binaryMode, setBinaryMode] = useState<ThvBinaryMode | null>(null)

  useEffect(() => {
    // Fetch the current thv binary mode
    window.electronAPI
      .getThvBinaryMode()
      .then((mode: ThvBinaryMode) => {
        setBinaryMode(mode)
      })
      .catch((error: unknown) => {
        console.error('Failed to get thv binary mode:', error)
      })
  }, [])

  // Don't render if we haven't loaded the mode yet, or if it's the default mode
  if (!binaryMode || binaryMode.isDefault) {
    return null
  }

  return (
    <div
      className="border-b border-yellow-200 bg-yellow-50 px-4 py-2
        dark:border-yellow-800 dark:bg-yellow-950"
    >
      <div
        className="flex items-center gap-2 text-sm text-yellow-900
          dark:text-yellow-100"
      >
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <div className="flex-1">
          <span className="font-semibold">Development Mode:</span> Using{' '}
          <span className="font-mono text-xs">{binaryMode.mode}</span> thv
          binary at{' '}
          <span
            className="rounded bg-yellow-100 px-1 py-0.5 font-mono text-xs
              dark:bg-yellow-900"
          >
            {binaryMode.path}
          </span>
        </div>
      </div>
    </div>
  )
}
