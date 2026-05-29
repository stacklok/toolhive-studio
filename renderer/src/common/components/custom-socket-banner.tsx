import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from './ui/alert'
import log from 'electron-log/renderer'

/**
 * Banner that warns the developer when the studio is talking to an
 * externally-managed `thv` over a custom UNIX socket / Windows named pipe
 * (THV_SOCKET env var). Visible in development only.
 */
export function CustomSocketBanner() {
  const [isCustomSocket, setIsCustomSocket] = useState(false)
  const [socketPath, setSocketPath] = useState<string | undefined>(undefined)

  useEffect(() => {
    Promise.all([
      window.electronAPI.isUsingCustomSocket(),
      window.electronAPI.getToolhiveSocketPath(),
    ])
      .then(([usingCustom, path]) => {
        setIsCustomSocket(usingCustom)
        setSocketPath(path)
      })
      .catch((error: unknown) => {
        log.error('Failed to get custom socket info:', error)
      })
  }, [])

  if (!isCustomSocket || !socketPath) {
    return null
  }

  return (
    <Alert
      className="fixed bottom-4 left-1/2 z-50 w-auto max-w-[95vw]
        -translate-x-1/2 border-yellow-200 bg-yellow-50 text-yellow-900
        dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-100"
    >
      <AlertTriangle />
      <AlertDescription className="flex items-start gap-2">
        <div className="whitespace-nowrap">
          {/* eslint-disable-next-line no-restricted-syntax -- external thv CLI reference */}
          <span>Using external ToolHive at </span>
          <span
            className="rounded bg-yellow-100 px-1 py-0.5 font-mono text-xs
              dark:bg-yellow-900"
            title={socketPath}
          >
            {socketPath}
          </span>
        </div>
      </AlertDescription>
    </Alert>
  )
}
