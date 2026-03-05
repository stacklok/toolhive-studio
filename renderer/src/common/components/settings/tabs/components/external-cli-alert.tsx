import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '../../../ui/alert'
import { getUninstallCommand } from '@/features/cli-issue/lib/cli-issue-utils'
import type { CliSource } from '@common/types/cli'

interface ExternalCliAlertProps {
  path: string
  source: CliSource
}

export function ExternalCliAlert({ path, source }: ExternalCliAlertProps) {
  const uninstallCommand = getUninstallCommand(source)

  return (
    <Alert variant="destructive">
      <AlertTriangle className="size-4" />
      <AlertTitle>External CLI Installation Detected</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          An external ToolHive CLI was found at{' '}
          <code className="bg-muted rounded px-1 text-xs">{path}</code>
        </p>
        <p>
          {uninstallCommand ? (
            <>
              To uninstall, run: <code>{uninstallCommand}</code>
            </>
          ) : (
            <>Please manually remove the external CLI installation.</>
          )}
        </p>
      </AlertDescription>
    </Alert>
  )
}
