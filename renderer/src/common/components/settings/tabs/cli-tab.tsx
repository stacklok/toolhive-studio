import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  FolderOpen,
  AlertCircle,
  Terminal,
  ExternalLink,
  AlertTriangle,
  ArrowDownToLine,
} from 'lucide-react'
import { toast } from 'sonner'
import { trackEvent } from '@/common/lib/analytics'
import { getUninstallCommand } from '@/features/cli-issue/lib/cli-issue-utils'
import { WrapperField } from './components/wrapper-field'
import { Badge } from '../../ui/badge'
import { Button } from '../../ui/button'
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert'

const CLI_DOCS_URL = 'https://docs.stacklok.com/toolhive/guides-cli/'

function CliInfoWrapper({
  title,
  children,
  actions,
}: {
  title: string
  children: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="text-muted-foreground text-sm">{children}</div>
    </div>
  )
}

function StatusBadge({ isValid }: { isValid: boolean }) {
  return isValid ? (
    <Badge variant="default" className="bg-green-600">
      <CheckCircle2 className="mr-1 size-3" />
      Valid
    </Badge>
  ) : (
    <Badge variant="destructive">
      <XCircle className="mr-1 size-3" />
      Invalid
    </Badge>
  )
}

export function CliTab() {
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
      <CliInfoWrapper title="CLI Installation">
        Loading CLI information...
      </CliInfoWrapper>
    )
  }

  if (error || !cliStatus) {
    return (
      <CliInfoWrapper title="CLI Installation">
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>Failed to load CLI information</AlertDescription>
        </Alert>
      </CliInfoWrapper>
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
    <div className="space-y-6">
      <CliInfoWrapper title="CLI Installation" actions={headerActions}>
        {externalCli && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="size-4" />
            <AlertTitle>External CLI Installation Detected</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                An external ToolHive CLI was found at{' '}
                <code className="bg-muted rounded px-1 text-xs">
                  {externalCli.path}
                </code>
              </p>
              <p>
                {getUninstallCommand(externalCli.source) ? (
                  <>
                    To uninstall, run:{' '}
                    <code>{getUninstallCommand(externalCli.source)}</code>
                  </>
                ) : (
                  <>Please manually remove the external CLI installation.</>
                )}
              </p>
            </AlertDescription>
          </Alert>
        )}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            <StatusBadge isValid={cliStatus.isValid} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">CLI Version</span>
            <Badge variant="secondary">
              {cliStatus.cliVersion || 'Unknown'}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Install Method</span>
            <Badge variant="outline">
              {cliStatus.installMethod === 'symlink'
                ? 'Symlink'
                : cliStatus.installMethod === 'copy'
                  ? 'Copy'
                  : 'Not installed'}
            </Badge>
          </div>

          {cliStatus.isManaged && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Managed by</span>
              <Badge variant="secondary">ToolHive Studio</Badge>
            </div>
          )}
        </div>
        {!cliStatus.isManaged && (
          <Alert className="mt-3">
            <AlertCircle className="size-4" />
            <AlertDescription>
              CLI is not currently managed by ToolHive Studio. Click
              &quot;Reinstall&quot; to set up CLI management.
            </AlertDescription>
          </Alert>
        )}
      </CliInfoWrapper>

      <CliInfoWrapper title="CLI Location">
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
      </CliInfoWrapper>

      {pathStatus && (
        <CliInfoWrapper title="PATH Configuration">
          <WrapperField
            label="Shell PATH"
            description={
              pathStatus.isConfigured ? (
                <span className="text-green-600">
                  CLI is accessible from your terminal
                </span>
              ) : (
                <span className="text-yellow-600">
                  PATH not configured - run `thv` may not work in new terminals
                </span>
              )
            }
            htmlFor="path-status"
          >
            <StatusBadge isValid={pathStatus.isConfigured} />
          </WrapperField>
          {pathStatus.modifiedFiles.length > 0 && (
            <div className="bg-muted mt-3 rounded-md p-3">
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
        </CliInfoWrapper>
      )}
    </div>
  )
}
