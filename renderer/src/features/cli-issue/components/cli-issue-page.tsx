import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/common/components/ui/card'
import { QuitConfirmationListener } from '@/common/components/layout/top-nav/quit-confirmation-listener'
import { trackEvent, trackPageView } from '@/common/lib/analytics'
import { ExternalCliContent } from './external-cli-content'
import { SymlinkIssueContent } from './symlink-issue-content'
import type { ValidationResult } from '@common/types/cli'

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
        // Track page view when issue is displayed
        if (result) {
          trackPageView('CLI Issue Page', {
            'cli.status': result.status,
            'cli.target':
              result.status === 'symlink-broken' ||
              result.status === 'symlink-tampered'
                ? result.target
                : undefined,
            'cli.external_source':
              result.status === 'external-cli-found'
                ? result.cli?.source
                : undefined,
          })
        }
      }
    })
  }

  const handleCheckAgain = async () => {
    trackEvent('CLI Issue: check again clicked', {
      'cli.current_status': validationResult?.status,
    })
    setIsLoading(true)
    setError(null)
    try {
      const result = await window.electronAPI.cliAlignment.validate()
      trackEvent('CLI Issue: check again result', {
        'cli.new_status': result.status,
        'cli.success': result.status === 'valid',
      })
      if (result.status === 'valid') {
        navigate({ to: '/' })
      } else {
        setValidationResult(result)
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Validation failed'
      trackEvent('CLI Issue: check again result', {
        'cli.success': false,
        'cli.error': errorMessage,
      })
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRepair = async () => {
    const issueType =
      validationResult?.status === 'symlink-broken' ? 'broken' : 'tampered'
    trackEvent('CLI Issue: repair clicked', {
      'cli.issue_type': issueType,
    })
    setIsLoading(true)
    setError(null)
    try {
      const { repairResult, validationResult: newValidation } =
        await window.electronAPI.cliAlignment.repair()
      if (!repairResult.success) {
        trackEvent('CLI Issue: repair result', {
          'cli.success': false,
          'cli.error': repairResult.error ?? 'Repair failed',
        })
        setError(repairResult.error ?? 'Repair failed')
        return
      }
      trackEvent('CLI Issue: repair result', {
        'cli.success': true,
        'cli.new_status': newValidation?.status,
      })
      if (newValidation?.status === 'valid') {
        navigate({ to: '/' })
      } else {
        setValidationResult(newValidation)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Repair failed'
      trackEvent('CLI Issue: repair result', {
        'cli.success': false,
        'cli.error': errorMessage,
      })
      setError(errorMessage)
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
