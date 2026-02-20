import { Button } from '../../ui/button'
import { Download } from 'lucide-react'
import { useDownloadFile } from '../../../hooks/use-download-file'
import { CodeBlockWithCopy } from '../../code-block-with-copy'
import { Separator } from '../../ui/separator'
import { SettingsSectionTitle } from './components/settings-section-title'

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
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        <SettingsSectionTitle>Logs</SettingsSectionTitle>
        <p className="text-muted-foreground text-sm leading-5.5">
          Application logs are stored locally on your system. You can find them
          in...
        </p>
      </div>

      {logPath ? (
        <>
          <div className="flex flex-col gap-3 py-1">
            <CodeBlockWithCopy code={logPath} />
            <Separator />
          </div>
          <Button
            variant="action"
            onClick={handleDownloadLog}
            disabled={isDownloading}
          >
            <Download className="size-4" />
            {isDownloading ? 'Loading...' : 'Save log file'}
          </Button>
        </>
      ) : (
        <p className="text-muted-foreground text-sm">Failed to get log path</p>
      )}
    </div>
  )
}
