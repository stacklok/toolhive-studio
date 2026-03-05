import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  RefreshCw,
  FolderOpen,
  AlertCircle,
  Terminal,
  ExternalLink,
  ArrowDownToLine,
} from 'lucide-react'
import { toast } from 'sonner'
import { trackEvent } from '@/common/lib/analytics'
import { WrapperField } from './components/wrapper-field'
import { SettingsRow } from './components/settings-row'
import { StatusBadge } from './components/status-badge'
import { ExternalCliAlert } from './components/external-cli-alert'
import { Badge } from '../../ui/badge'
import { Button } from '../../ui/button'
import { Alert, AlertDescription } from '../../ui/alert'
import { Separator } from '../../ui/separator'
import { SettingsSectionTitle } from './components/settings-section-title'
import { useAppVersion } from '@/common/hooks/use-app-version'

const CLI_DOCS_URL = 'https://docs.stacklok.com/toolhive/guides-cli/'

export function CliTab() {
  const { data: appInfo } = useAppVersion()
  const queryClient = useQueryClient()
  const {
    data: cliStatus,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['cli-alignment-status'],
    queryFn: () => window.electronAPI.cliAlignment.getStatus(),
  })

  const { data: pathStatus } = useQuery({
    queryKey: ['cli-path-status'],
    queryFn: () => window.electronAPI.cliAlignment.getPathStatus(),
  })

  const { data: validationResult } = useQuery({
    queryKey: ['cli-validation-result'],
    queryFn: () => window.electronAPI.cliAlignment.getValidationResult(),
  })

  // Validate mutation - runs full validation including external CLI detection
  const { mutateAsync: validate, isPending: isValidating } = useMutation({
    mutationFn: () => window.electronAPI.cliAlignment.validate(),
    onSuccess: (result) => {
      trackEvent('CLI Settings: verify result', {
        'cli.status': result.status,
        'cli.has_external_cli': result.status === 'external-cli-found',
      })
      queryClient.invalidateQueries({ queryKey: ['cli-alignment-status'] })
      queryClient.invalidateQueries({ queryKey: ['cli-validation-result'] })
      if (result.status === 'external-cli-found') {
        trackEvent('CLI Settings: external cli detected', {
          'cli.source': result.cli?.source,
          'cli.path': result.cli?.path,
        })
        toast.warning('External CLI installation detected')
      } else if (result.status === 'valid') {
        toast.success('CLI status verified')
      } else {
        toast.info('CLI status updated')
      }
    },
    onError: (error) => {
      trackEvent('CLI Settings: verify result', {
        'cli.success': false,
        'cli.error': error.message,
      })
      toast.error(`Validation failed: ${error.message}`)
    },
  })

  // Reinstall mutation
  const { mutateAsync: reinstall, isPending: isReinstalling } = useMutation({
    mutationFn: () => window.electronAPI.cliAlignment.reinstall(),
    onSuccess: (result) => {
      trackEvent('CLI Settings: reinstall result', {
        'cli.success': result.success,
        'cli.error': result.error,
      })
      if (result.success) {
        toast.success('CLI reinstalled successfully')
        queryClient.invalidateQueries({ queryKey: ['cli-alignment-status'] })
      } else {
        toast.error(`Failed to reinstall CLI: ${result.error}`)
      }
    },
    onError: (error) => {
      trackEvent('CLI Settings: reinstall result', {
        'cli.success': false,
        'cli.error': error.message,
      })
      toast.error(`Failed to reinstall CLI: ${error.message}`)
    },
  })

  const handleVerify = () => {
    trackEvent('CLI Settings: verify clicked')
    validate()
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <SettingsSectionTitle>CLI Installation</SettingsSectionTitle>
        <p className="text-muted-foreground text-sm">
          Loading CLI information...
        </p>
      </div>
    )
  }

  if (error || !cliStatus) {
    return (
      <div className="space-y-3">
        <SettingsSectionTitle>CLI Installation</SettingsSectionTitle>
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>Failed to load CLI information</AlertDescription>
        </Alert>
      </div>
    )
  }

  const headerActions = (
    <>
      <a
        href={CLI_DOCS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:text-foreground flex items-center
          gap-1 text-sm transition-colors"
      >
        <ExternalLink className="size-3.5" />
        <span>Docs</span>
      </a>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleVerify}
        disabled={isLoading || isValidating}
        title="Refresh status"
      >
        <RefreshCw className={`size-4 ${isValidating ? 'animate-spin' : ''}`} />
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="rounded-full"
        onClick={() => {
          trackEvent('CLI Settings: reinstall clicked')
          reinstall()
        }}
        disabled={isLoading || isReinstalling}
      >
        <ArrowDownToLine className="mr-2 size-4" />
        {isReinstalling ? 'Reinstalling...' : 'Reinstall'}
      </Button>
    </>
  )

  // Check if external CLI was detected
  const externalCli =
    validationResult?.status === 'external-cli-found'
      ? validationResult.cli
      : null

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <SettingsSectionTitle>CLI Installation</SettingsSectionTitle>
        <div className="flex items-center gap-2 pt-2">{headerActions}</div>
      </div>

      {externalCli && (
        <ExternalCliAlert path={externalCli.path} source={externalCli.source} />
      )}

      <div className="flex flex-col gap-3 pt-1 pb-5">
        <SettingsRow label="Status">
          <StatusBadge isValid={cliStatus.isValid} />
        </SettingsRow>
        <Separator />
        <SettingsRow label="CLI Version">
          <span
            className="text-muted-foreground flex items-center gap-2 text-sm
              leading-5.5"
          >
            {cliStatus.cliVersion || 'Unknown'}
            {!appInfo?.isNewVersionAvailable && (
              <Badge variant="success">Latest</Badge>
            )}
          </span>
        </SettingsRow>
        <Separator />
        <SettingsRow label="Install Method">
          <span className="text-muted-foreground text-sm leading-5.5">
            {cliStatus.installMethod === 'symlink'
              ? 'Symlink'
              : cliStatus.installMethod === 'copy'
                ? 'Copy'
                : 'Not installed'}
          </span>
        </SettingsRow>
        <Separator />
        {cliStatus.isManaged && (
          <>
            <SettingsRow label="Managed by">
              <span className="text-muted-foreground text-sm leading-5.5">
                ToolHive UI
              </span>
            </SettingsRow>
            <Separator />
          </>
        )}
      </div>

      {!cliStatus.isManaged && (
        <Alert>
          <AlertCircle className="size-4" />
          <AlertDescription>
            CLI is not currently managed by ToolHive UI. Click
            &quot;Reinstall&quot; to set up CLI management.
          </AlertDescription>
        </Alert>
      )}

      <SettingsSectionTitle>CLI Location</SettingsSectionTitle>
      <div className="flex flex-col gap-3 py-1">
        <div className="bg-muted rounded-md p-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="text-muted-foreground size-4" />
            <code className="text-xs">{cliStatus.cliPath}</code>
          </div>
          {cliStatus.symlinkTarget && cliStatus.installMethod === 'symlink' && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-muted-foreground text-xs">Points to:</span>
              <code className="text-xs">{cliStatus.symlinkTarget}</code>
            </div>
          )}
        </div>
        <Separator />
      </div>

      {pathStatus && (
        <>
          <SettingsSectionTitle>PATH Configuration</SettingsSectionTitle>
          <div className="flex flex-col gap-3 py-1">
            <WrapperField
              label="Shell PATH"
              description={
                pathStatus.isConfigured ? (
                  <span className="text-success">
                    CLI is accessible from your terminal
                  </span>
                ) : (
                  <span className="text-yellow-600">
                    PATH not configured - run `thv` may not work in new
                    terminals
                  </span>
                )
              }
              htmlFor="path-status"
            >
              <StatusBadge isValid={pathStatus.isConfigured} />
            </WrapperField>
            <Separator />
          </div>
          {pathStatus.modifiedFiles.length > 0 && (
            <div className="bg-muted rounded-md p-3">
              <div className="text-muted-foreground mb-2 text-xs font-medium">
                Modified files:
              </div>
              <div className="space-y-1">
                {pathStatus.modifiedFiles.map((file) => (
                  <div key={file} className="flex items-center gap-2">
                    <Terminal className="text-muted-foreground size-3" />
                    <code className="text-xs">{file}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
