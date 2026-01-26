import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { AlertTriangle, RefreshCw, Wrench, Copy, Check } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/common/components/ui/card'
import { Button } from '@/common/components/ui/button'
import { QuitConfirmationListener } from '@/common/components/layout/top-nav/quit-confirmation-listener'
import type {
  ValidationResult,
  ExternalCliInfo,
} from '../../../preload/src/preload'

export const Route = createFileRoute('/cli-issue')({
  component: CliIssuePage,
})

function getUninstallCommand(
  source: 'homebrew' | 'winget' | 'manual'
): string | null {
  switch (source) {
    case 'homebrew':
      return 'brew uninstall toolhive'
    case 'winget':
      return 'winget uninstall toolhive'
    case 'manual':
      return null
  }
}

function CodeBlockWithCopy({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignore copy errors
    }
  }

  return (
    <div className="bg-muted relative rounded-md">
      <pre className="p-4 pr-12 text-sm">
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="absolute top-2 right-2 size-8"
        title="Copy command"
      >
        {copied ? (
          <Check className="size-4 text-green-600" />
        ) : (
          <Copy className="size-4" />
        )}
      </Button>
    </div>
  )
}

function getSourceLabel(source: 'homebrew' | 'winget' | 'manual'): string {
  switch (source) {
    case 'homebrew':
      return 'Homebrew'
    case 'winget':
      return 'Winget'
    case 'manual':
      return 'Manual installation'
  }
}

function ExternalCliContent({
  cli,
  onCheckAgain,
  isLoading,
}: {
  cli: ExternalCliInfo
  onCheckAgain: () => void
  isLoading: boolean
}) {
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

function SymlinkIssueContent({
  type,
  target,
  onRepair,
  isLoading,
}: {
  type: 'broken' | 'tampered'
  target: string
  onRepair: () => void
  isLoading: boolean
}) {
  const isBroken = type === 'broken'
  const title = isBroken
    ? 'CLI Installation Needs Repair'
    : 'CLI Installation Modified'
  const description = isBroken
    ? 'The ToolHive CLI symlink is broken.'
    : 'The ToolHive CLI has been modified externally.'
  const detail = isBroken
    ? 'This can happen if ToolHive Studio was moved or updated.'
    : 'This could cause version compatibility issues.'
  const buttonText = isBroken ? 'Repair' : 'Restore'

  return (
    <>
      <CardHeader className="text-center">
        <div className="mb-4 flex justify-center">
          <Wrench className="text-warning size-12" />
        </div>
        <CardTitle className="text-2xl font-semibold">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted rounded-md p-4 text-sm">
          <p>
            <strong>
              {isBroken ? 'Was pointing to:' : 'Currently pointing to:'}
            </strong>{' '}
            {target}
          </p>
        </div>
        <p className="text-muted-foreground text-sm">
          {detail} Would you like to {isBroken ? 'repair' : 'restore'} the CLI
          installation?
        </p>
        <Button
          onClick={onRepair}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <RefreshCw className="mr-2 size-4 animate-spin" />
          ) : (
            <Wrench className="mr-2 size-4" />
          )}
          {buttonText}
        </Button>
      </CardContent>
    </>
  )
}

function CliIssuePage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load initial validation result
  const [initialLoaded, setInitialLoaded] = useState(false)
  if (!initialLoaded) {
    setInitialLoaded(true)
    window.electronAPI.cliAlignment.getValidationResult().then((result) => {
      if (result && result.status === 'valid') {
        // Already valid, navigate away
        navigate({ to: '/' })
      } else {
        setValidationResult(result)
      }
    })
  }

  const handleCheckAgain = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await window.electronAPI.cliAlignment.validate()
      if (result.status === 'valid') {
        navigate({ to: '/' })
      } else {
        setValidationResult(result)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRepair = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { repairResult, validationResult: newValidation } =
        await window.electronAPI.cliAlignment.repair()
      if (!repairResult.success) {
        setError(repairResult.error ?? 'Repair failed')
        return
      }
      if (newValidation?.status === 'valid') {
        navigate({ to: '/' })
      } else {
        setValidationResult(newValidation)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Repair failed')
    } finally {
      setIsLoading(false)
    }
  }

  if (!validationResult) {
    return (
      <div className="flex h-[calc(100vh-5rem)] items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8 text-center">
            <RefreshCw
              className="text-muted-foreground mx-auto size-8 animate-spin"
            />
            <p className="text-muted-foreground mt-4">Checking CLI status...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] items-center justify-center p-4">
      <QuitConfirmationListener />
      <Card className="w-full max-w-lg">
        {validationResult.status === 'external-cli-found' && (
          <ExternalCliContent
            cli={validationResult.cli}
            onCheckAgain={handleCheckAgain}
            isLoading={isLoading}
          />
        )}
        {validationResult.status === 'symlink-broken' && (
          <SymlinkIssueContent
            type="broken"
            target={validationResult.target}
            onRepair={handleRepair}
            isLoading={isLoading}
          />
        )}
        {validationResult.status === 'symlink-tampered' && (
          <SymlinkIssueContent
            type="tampered"
            target={validationResult.target}
            onRepair={handleRepair}
            isLoading={isLoading}
          />
        )}
        {error && (
          <div
            className="border-destructive bg-destructive/10 text-destructive
              mx-6 mb-6 rounded-md border p-4 text-sm"
          >
            {error}
          </div>
        )}
      </Card>
    </div>
  )
}
