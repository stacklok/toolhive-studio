import { CardContent } from '@/common/components/ui/card'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/common/components/ui/tooltip'
import type {
  CoreWorkload,
  RegistryEnvVar,
} from '@common/api/generated/types.gen'
import { ActionsMcpServer } from '../actions-mcp-server'
import { useMutationRestartServer } from '../../hooks/use-mutation-restart-server'
import { useMutationStopServerList } from '../../hooks/use-mutation-stop-server'
import { ComplianceBadge } from './compliance-badge'
import { useUpdateVersion } from '../../hooks/use-update-version'
import type { useComplianceCheck } from '../../hooks/use-compliance-check'
import { trackEvent } from '@/common/lib/analytics'
import { ArrowUpCircle } from 'lucide-react'

function UpdateVersionButton({
  serverName,
  registryImage,
  drift,
  registryEnvVars,
  disabled,
}: {
  serverName: string
  registryImage: string
  drift: { localTag: string; registryTag: string }
  registryEnvVars?: RegistryEnvVar[]
  disabled?: boolean
}) {
  const { promptUpdate, isReady } = useUpdateVersion({
    serverName,
    registryImage,
    localTag: drift.localTag,
    registryTag: drift.registryTag,
    registryEnvVars,
  })

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={(e) => {
            e.stopPropagation()
            void promptUpdate('card_button')
          }}
          disabled={disabled || !isReady}
          className="hover:bg-accent inline-flex size-9 cursor-pointer
            items-center justify-center rounded-md disabled:pointer-events-none
            disabled:opacity-50"
          aria-label={`Update to ${drift.registryTag}`}
        >
          <ArrowUpCircle className="size-5 text-amber-500" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        Update available: {drift.localTag} → {drift.registryTag}
      </TooltipContent>
    </Tooltip>
  )
}

interface CardContentMcpServerProps {
  status: CoreWorkload['status']
  name: string
  transport: CoreWorkload['transport_type']
  group?: CoreWorkload['group']
  drift: { localTag: string; registryTag: string } | null
  registryImage: string | null
  registryEnvVars?: RegistryEnvVar[]
  report: ReturnType<typeof useComplianceCheck>['report']
  isChecking: boolean
  error: Error | null
}

export function CardContentMcpServer({
  name,
  status,
  transport,
  group,
  drift,
  registryImage,
  registryEnvVars,
  report,
  isChecking,
  error,
}: CardContentMcpServerProps) {
  const isRunning = status === 'running'
  const isUpdating = `${status}` === 'updating'
  const isDeleting = `${status}` === 'deleting' || status === 'removing'
  const { mutateAsync: restartMutate, isPending: isRestartPending } =
    useMutationRestartServer({
      name,
      group,
    })
  const { mutateAsync: stopMutate, isPending: isStopPending } =
    useMutationStopServerList({
      name,
      group,
    })

  return (
    <CardContent>
      <div className="flex flex-col gap-4">
        <div
          className="border-border flex items-center justify-between border-t
            pt-4"
        >
          <ActionsMcpServer
            status={status}
            isPending={isRestartPending || isStopPending}
            mutate={() => {
              if (isRunning) {
                stopMutate({
                  path: {
                    name,
                  },
                })
                return trackEvent(`Workload ${name} stopped`, {
                  workload: name,
                  transport,
                })
              }

              restartMutate({
                path: {
                  name,
                },
              })
              return trackEvent(`Workload ${name} started`, {
                workload: name,
                transport,
              })
            }}
          />
          <div className="flex items-center gap-1">
            <ComplianceBadge
              report={report}
              isChecking={isChecking}
              error={error}
            />
            {drift && registryImage && (
              <UpdateVersionButton
                serverName={name}
                registryImage={registryImage}
                drift={drift}
                registryEnvVars={registryEnvVars}
                disabled={isUpdating || isDeleting}
              />
            )}
          </div>
        </div>
      </div>
    </CardContent>
  )
}
