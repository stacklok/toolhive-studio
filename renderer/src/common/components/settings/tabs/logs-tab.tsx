import { Button } from '../../ui/button'
import { Download } from 'lucide-react'
import { useDownloadFile } from '../../../hooks/use-download-file'
import { CodeBlockWithCopy } from '../../code-block-with-copy'

const LOG_PATHS = {
  darwin: '~/Library/Logs/ToolHive/main.log',
  win32: '%USERPROFILE%\\AppData\\Roaming\\ToolHive\\logs\\main.log',
  linux: '~/.config/ToolHive/logs/main.log',
} as const

export function LogsTab() {
  const { isDownloading, downloadFile } = useDownloadFile()
  const platform = window.electronAPI.platform
  const logPath = LOG_PATHS[platform as keyof typeof LOG_PATHS] ?? null

  const handleDownloadLog = async () => {
    await downloadFile(
      () => window.electronAPI.getMainLogContent(),
      `toolhive-main-${new Date().toISOString().split('T')[0]}.log`
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Application Logs</h2>

        {logPath ? (
          <div>
            <p className="text-muted-foreground text-sm">
              Application logs are stored locally on your system. You can find
              them in:
            </p>
            <CodeBlockWithCopy code={logPath} />
            {logPath && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadLog}
                disabled={isDownloading}
                className="mt-3 w-fit"
              >
                <Download className="mr-2 size-4" />
                {isDownloading ? 'Loading...' : 'Save log file'}
              </Button>
            )}
          </div>
        ) : (
          <div>Failed to get log path</div>
        )}
      </div>
    </div>
  )
}
