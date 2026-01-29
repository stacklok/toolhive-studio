import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/common/components/ui/card'
import { QuitConfirmationListener } from '@/common/components/layout/top-nav/quit-confirmation-listener'
import { ExternalCliContent } from './external-cli-content'
import { SymlinkIssueContent } from './symlink-issue-content'
import type { ValidationResult } from '../../../../../preload/src/preload'

export function CliIssuePage() {
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
