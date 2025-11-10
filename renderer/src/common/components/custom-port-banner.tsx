import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from './ui/alert'
import log from 'electron-log/renderer'

/**
 * Banner that displays a warning when using a custom ToolHive port in development mode.
 * Only visible when THV_PORT environment variable is set.
 */
export function CustomPortBanner() {
  const [isCustomPort, setIsCustomPort] = useState(false)
  const [port, setPort] = useState<number | undefined>(undefined)

  useEffect(() => {
    Promise.all([
      window.electronAPI.isUsingCustomPort(),
      window.electronAPI.getToolhivePort(),
    ])
      .then(([usingCustom, toolhivePort]) => {
        setIsCustomPort(usingCustom)
        setPort(toolhivePort)
      })
      .catch((error: unknown) => {
        log.error('Failed to get custom port info:', error)
      })
  }, [])

  // Don't render if not using custom port or port is not available
  if (!isCustomPort || !port) {
    return null
  }

  const httpAddress = `http://127.0.0.1:${port}`

  return (
    <Alert
      className="fixed bottom-4 left-1/2 z-50 w-auto max-w-[95vw]
        -translate-x-1/2 border-yellow-200 bg-yellow-50 text-yellow-900
        dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-100"
    >
      <AlertTriangle />
      <AlertDescription className="flex items-start gap-2">
        <div className="whitespace-nowrap">
          <span>Using external ToolHive at </span>
          <span
            className="rounded bg-yellow-100 px-1 py-0.5 font-mono text-xs
              dark:bg-yellow-900"
            title={httpAddress}
          >
            {httpAddress}
          </span>
        </div>
      </AlertDescription>
    </Alert>
  )
}
