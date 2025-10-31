import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from './ui/alert'

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
    <Alert
      variant="warning"
      className="fixed bottom-4 left-1/2 z-50 max-w-[95vw] -translate-x-1/2
        sm:max-w-xl"
    >
      <AlertTriangle />
      <AlertDescription className="flex items-start gap-2">
        <div className="min-w-0">
          <span>thv </span>
          <span className="font-mono text-xs">
            {version ?? 'Unknown version'}
          </span>
          <span> at </span>
          <span
            className="rounded bg-yellow-100 px-1 py-0.5 font-mono text-[10px]
              leading-4 break-all dark:bg-yellow-900"
            title={binaryMode.path}
          >
            {binaryMode.path}
          </span>
        </div>
      </AlertDescription>
    </Alert>
  )
}
