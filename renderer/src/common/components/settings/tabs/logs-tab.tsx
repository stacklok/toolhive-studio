import { Button } from '../../ui/button'
import { useState, useEffect } from 'react'
import { Copy, Check, Download } from 'lucide-react'
import { delay } from '@utils/delay'
import { useDownloadFile } from '../../../hooks/use-download-file'
import log from 'electron-log/renderer'

const LOG_PATHS = {
  darwin: '~/Library/Logs/ToolHive/main.log',
  win32: '%USERPROFILE%\\AppData\\Roaming\\ToolHive\\logs\\main.log',
  linux: '~/.config/ToolHive/logs/main.log',
} as const

export function LogsTab() {
  const [copied, setCopied] = useState<boolean>(false)
  const [logPath, setLogPath] = useState<string>('')
  const platform = window.electronAPI.platform
  const { isDownloading, downloadFile } = useDownloadFile()

  useEffect(() => {
    const fetchLogContent = async () => {
      try {
        const logPath = await window.electronAPI.getMainLogContent()
        setLogPath(logPath)
      } catch {
        const logPath = LOG_PATHS[platform as keyof typeof LOG_PATHS] || ''
        setLogPath(logPath)
      }
    }
    fetchLogContent()
  }, [platform])

  const handleCopyLogPath = async () => {
    try {
      await navigator.clipboard.writeText(logPath)
      setCopied(true)
      delay(2000).then(() => setCopied(false))
    } catch (error) {
      log.error('Failed to copy to clipboard:', error)
    }
  }

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

        <div className="">
          <p className="text-muted-foreground text-sm">
            Application logs are stored locally on your system. You can find
            them in:
          </p>
          <div
            className="bg-muted/50 mt-2 flex items-center justify-between
              rounded p-2 font-mono text-xs"
          >
            <span>{LOG_PATHS[platform as keyof typeof LOG_PATHS]}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyLogPath}
              className="ml-2 size-7 shrink-0 cursor-pointer"
              title="Copy log path"
            >
              {copied ? (
                <Check className="size-4 text-green-600" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>

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
      </div>
    </div>
  )
}
