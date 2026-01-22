import { Badge } from '../../ui/badge'
import { Button } from '../../ui/button'
import { Alert, AlertDescription } from '../../ui/alert'
import { WrapperField } from './components/wrapper-field'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trash2,
  FolderOpen,
  AlertCircle,
  Terminal,
} from 'lucide-react'
import { toast } from 'sonner'

function CliInfoWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">CLI Installation</h2>
        <div className="text-muted-foreground text-sm">{children}</div>
      </div>
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

  // Fetch CLI alignment status
  const {
    data: cliStatus,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['cli-alignment-status'],
    queryFn: () => window.electronAPI.cliAlignment.getStatus(),
  })

  // Fetch PATH configuration status
  const { data: pathStatus } = useQuery({
    queryKey: ['cli-path-status'],
    queryFn: () => window.electronAPI.cliAlignment.getPathStatus(),
  })

  // Reinstall mutation
  const { mutateAsync: reinstall, isPending: isReinstalling } = useMutation({
    mutationFn: () => window.electronAPI.cliAlignment.reinstall(),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('CLI reinstalled successfully')
        queryClient.invalidateQueries({ queryKey: ['cli-alignment-status'] })
      } else {
        toast.error(`Failed to reinstall CLI: ${result.error}`)
      }
    },
    onError: (error) => {
      toast.error(`Failed to reinstall CLI: ${error.message}`)
    },
  })

  // Remove mutation
  const { mutateAsync: remove, isPending: isRemoving } = useMutation({
    mutationFn: () => window.electronAPI.cliAlignment.remove(),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('CLI removed successfully')
        queryClient.invalidateQueries({ queryKey: ['cli-alignment-status'] })
        queryClient.invalidateQueries({ queryKey: ['cli-path-status'] })
      } else {
        toast.error(`Failed to remove CLI: ${result.error}`)
      }
    },
    onError: (error) => {
      toast.error(`Failed to remove CLI: ${error.message}`)
    },
  })

  const handleVerify = () => {
    refetch()
    toast.info('CLI status verified')
  }

  if (isLoading) {
    return <CliInfoWrapper>Loading CLI information...</CliInfoWrapper>
  }

  if (error || !cliStatus) {
    return (
      <CliInfoWrapper>
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>Failed to load CLI information</AlertDescription>
        </Alert>
      </CliInfoWrapper>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Application Logs</h2>

        <div className="">
          <CliInfoWrapper>
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
          </CliInfoWrapper>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">CLI Location</h2>
            <div className="bg-muted rounded-md p-3">
              <div className="flex items-center gap-2">
                <FolderOpen className="text-muted-foreground size-4" />
                <code className="text-xs">{cliStatus.cliPath}</code>
              </div>
              {cliStatus.symlinkTarget &&
                cliStatus.installMethod === 'symlink' && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      Points to:
                    </span>
                    <code className="text-xs">{cliStatus.symlinkTarget}</code>
                  </div>
                )}
            </div>
          </div>

          {pathStatus && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">PATH Configuration</h2>
              <WrapperField
                label="Shell PATH"
                description={
                  pathStatus.isConfigured ? (
                    <span className="text-green-600">
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
              {pathStatus.modifiedFiles.length > 0 && (
                <div className="bg-muted rounded-md p-3">
                  <div
                    className="text-muted-foreground mb-2 text-xs font-medium"
                  >
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
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Actions</h2>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleVerify}
                disabled={isLoading}
              >
                <RefreshCw className="mr-2 size-4" />
                Verify
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => reinstall()}
                disabled={isReinstalling || isRemoving}
              >
                <RefreshCw
                  className={`mr-2 size-4
                    ${isReinstalling ? 'animate-spin' : ''}`}
                />
                {isReinstalling ? 'Reinstalling...' : 'Reinstall'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => remove()}
                disabled={isReinstalling || isRemoving || !cliStatus.isManaged}
              >
                <Trash2 className="mr-2 size-4" />
                {isRemoving ? 'Removing...' : 'Remove'}
              </Button>
            </div>
            {!cliStatus.isManaged && (
              <Alert>
                <AlertCircle className="size-4" />
                <AlertDescription>
                  CLI is not currently managed by ToolHive Studio. Click
                  &quot;Reinstall&quot; to set up CLI management.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Usage</h2>
            <div className="bg-muted rounded-md p-3">
              <p className="text-muted-foreground mb-2 text-sm">
                Use the `thv` command in your terminal to interact with
                ToolHive:
              </p>
              <div className="space-y-2">
                <code className="block text-xs">thv --help</code>
                <code className="block text-xs">thv list</code>
                <code className="block text-xs">
                  thv run &lt;server-name&gt;
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
