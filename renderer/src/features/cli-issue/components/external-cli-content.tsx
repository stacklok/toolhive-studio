import { AlertTriangle, RefreshCw } from 'lucide-react'
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/common/components/ui/card'
import { Button } from '@/common/components/ui/button'
import { CodeBlockWithCopy } from '@/common/components/code-block-with-copy'
import { getUninstallCommand, getSourceLabel } from '../lib/cli-issue-utils'
import type { ExternalCliInfo } from '@common/types/cli'

interface ExternalCliContentProps {
  cli: ExternalCliInfo
  onCheckAgain: () => void
  isLoading: boolean
}

export function ExternalCliContent({
  cli,
  onCheckAgain,
  isLoading,
}: ExternalCliContentProps) {
  const versionInfo = cli.version ? ` (version ${cli.version})` : ''
  const uninstallCommand = getUninstallCommand(cli.source)

  return (
    <>
      <CardHeader className="text-center">
        <div className="mb-4 flex justify-center">
          <AlertTriangle className="text-destructive size-12" />
        </div>
        <CardTitle className="text-2xl font-semibold">
          External ToolHive CLI Detected
        </CardTitle>
        <CardDescription>
          ToolHive Studio cannot run while an external CLI is installed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted rounded-md p-4 text-sm">
          <p className="break-all">
            <strong>Found:</strong> {cli.path}
            {versionInfo}
          </p>
          <p>
            <strong>Source:</strong> {getSourceLabel(cli.source)}
          </p>
        </div>
        <p className="text-muted-foreground text-sm">
          ToolHive Studio manages its own CLI installation to ensure version
          compatibility. Please uninstall the external CLI and click "Check
          Again".
        </p>
        {uninstallCommand ? (
          <>
            <p className="text-muted-foreground text-sm">
              Run this command in your terminal to uninstall:
            </p>
            <CodeBlockWithCopy code={uninstallCommand} />
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            Please manually remove the external ToolHive CLI installation.
          </p>
        )}
        <Button
          onClick={onCheckAgain}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <RefreshCw className="mr-2 size-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 size-4" />
          )}
          Check Again
        </Button>
      </CardContent>
    </>
  )
}
