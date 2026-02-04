import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'
import { getApiV1BetaWorkloads } from '@common/api/generated/sdk.gen'
import {
  getApiV1BetaSecretsDefaultKeysOptions,
  getApiV1BetaWorkloadsByNameOptions,
} from '@common/api/generated/@tanstack/react-query.gen'
import { LinkViewTransition } from '@/common/components/link-view-transition'
import { useCheckServerStatus } from '@/common/hooks/use-check-server-status'
import { Button } from '@/common/components/ui/button'
import { useUpdateServer } from '@/features/mcp-servers/hooks/use-update-server'
import { CustomizeToolsTable } from '@/features/mcp-servers/components/customize-tools-table'
import { convertCreateRequestToFormData as convertLocalServerToFormData } from '@/features/mcp-servers/lib/orchestrate-run-local-server'
import { convertCreateRequestToFormData as convertRemoteServerToFormData } from '@/features/mcp-servers/lib/orchestrate-run-remote-server'
import { buildToolsWithOverrides } from '@/features/mcp-servers/lib/build-tools-with-overrides'
import { useIsServerFromRegistry } from '../../hooks/use-is-server-from-registry'
import { trackEvent } from '@/common/lib/analytics'
import { EmptyState } from '@/common/components/empty-state'
import { IllustrationStop } from '@/common/components/illustrations/illustration-stop'
import { useMutationRestartServer } from '@/features/mcp-servers/hooks/use-mutation-restart-server'

// This is only for the servers from the registry at the moment
export function CustomizeToolsPage() {
  const navigate = useNavigate()
  const { serverName } = useParams({ from: '/customize-tools/$serverName' })
  const { checkServerStatus } = useCheckServerStatus()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    data: workload,
    refetch: refetchWorkload,
    isFetching: isWorkloadLoading,
    isPending: isWorkloadPending,
  } = useQuery({
    queryKey: ['workload', serverName],
    queryFn: async () => {
      const { data } = await getApiV1BetaWorkloads({
        query: {
          all: true,
        },
      })
      // TODO: GET single server do not return the correct port?
      return data?.workloads?.find((item) => item.name === serverName) ?? null
    },
  })
  const {
    data: existingServerData,
    isFetching: isLoadingServer,
    isError: isExistingServerDataError,
  } = useQuery({
    ...getApiV1BetaWorkloadsByNameOptions({
      path: { name: serverName || '' },
    }),
    enabled: !!serverName,
    retry: false,
  })
  const {
    isFromRegistry,
    registryTools = [],
    drift,
    getToolsDiffFromRegistry,
  } = useIsServerFromRegistry(serverName)

  const { data: serverTools, isFetching: isLoadingServerTools } = useQuery({
    queryKey: ['workload-available-tools', serverName, workload?.name],
    queryFn: async () => {
      if (!workload) return null
      const results =
        await window.electronAPI.utils.getWorkloadAvailableTools(workload)
      // for showing the loading state
      await new Promise((resolve) => setTimeout(resolve, 500))
      return results
    },
    enabled:
      !!serverName &&
      !isWorkloadLoading &&
      !isWorkloadPending &&
      workload?.status === 'running',
    refetchOnWindowFocus: true,
    staleTime: 0,
  })

  const { data: availableSecrets } = useQuery({
    ...getApiV1BetaSecretsDefaultKeysOptions(),
    enabled: !!serverName,
    retry: false,
  })

  // Build serverToolsMap for tools diff calculation
  const serverToolsMap = serverTools
    ? Object.fromEntries(
        Object.entries(serverTools).map(([name, toolDef]) => [
          name,
          { name, description: toolDef.description || '' },
        ])
      )
    : {}

  // Build complete tools list with overrides applied
  const completedTools = buildToolsWithOverrides({
    registryTools,
    serverTools: serverTools || null,
    toolsOverride: existingServerData?.tools_override || null,
    enabledToolsFilter: existingServerData?.tools || null,
  })

  const toolsDiff = getToolsDiffFromRegistry(Object.keys(serverToolsMap))
  // Show diff only when no filter is applied and tools don't match exactly
  const showToolsDiff =
    !existingServerData?.tools &&
    existingServerData?.tools?.length === 0 &&
    !toolsDiff?.hasExactMatch

  const isRemoteServer = !!existingServerData?.url
  const { updateServerMutation } = useUpdateServer(serverName, {
    isRemote: isRemoteServer,
  })

  const { mutateAsync: restartServer, isPending: isRestartPending } =
    useMutationRestartServer({
      name: serverName,
      group: workload?.group,
    })

  const handleUpdateServer = async (
    tools: string[] | null,
    toolsOverride?: Record<
      string,
      { name?: string; description?: string }
    > | null
  ) => {
    if (!existingServerData || isExistingServerDataError) {
      throw new Error('Existing server data not available')
    }

    // Use the appropriate converter based on whether it's a remote or local server
    const formData = isRemoteServer
      ? convertRemoteServerToFormData(existingServerData, availableSecrets)
      : convertLocalServerToFormData(existingServerData, availableSecrets)

    updateServerMutation(
      {
        data: {
          ...formData,
          tools,
          tools_override: toolsOverride,
        },
      },
      {
        onSuccess: () => {
          toast.success('Server tools updated successfully')
          checkServerStatus({
            serverName,
            groupName: workload?.group || 'default',
            isEditing: true,
          })
          navigate({
            to: '/group/$groupName',
            params: { groupName: workload?.group || 'default' },
            search: { newServerName: serverName },
          })
        },
        onError: (error) => {
          setIsSubmitting(false)
          toast.error(
            `Failed to update server: ${typeof error === 'string' ? error : error.message}`
          )
        },
      }
    )
  }

  const handleApply = async (
    enabledTools: Record<string, boolean>,
    toolsOverride: Record<
      string,
      { name?: string; description?: string }
    > | null
  ) => {
    trackEvent('Customize Tools: apply changes', {
      server_name: serverName,
      tools_count: Object.keys(enabledTools).length,
    })
    if (!serverTools) {
      toast.error('Server data not loaded')
      return
    }

    setIsSubmitting(true)

    try {
      // Use display names directly (override names when overrides exist)
      // The tools array should contain the final tool names as they appear in the server
      const enabledToolNames = Object.entries(enabledTools)
        .filter(([, enabled]) => enabled)
        .map(([displayName]) => displayName)

      const toolsEnabledDrift =
        enabledToolNames.length !== completedTools.length

      handleUpdateServer(
        toolsEnabledDrift ? enabledToolNames : null,
        toolsOverride
      )
    } catch (error) {
      setIsSubmitting(false)
      toast.error(
        `Failed to apply changes: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  const handleStartServer = () => {
    trackEvent('Customize Tools: Server not running click start server', {
      server_name: serverName,
    })
    restartServer(
      { path: { name: serverName } },
      {
        onSuccess: () => {
          refetchWorkload()
        },
        onError: () => {
          toast.error(`Failed to start server for ${serverName}`)
        },
      }
    )
  }

  if (!isFromRegistry) return null

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2">
        <LinkViewTransition to={`/group/${workload?.group || 'default'}`}>
          <Button
            variant="link"
            aria-label="Back"
            className="text-muted-foreground"
          >
            <ChevronLeft className="size-4" />
            Back
          </Button>
        </LinkViewTransition>
      </div>
      <div className="mb-5">
        <h1
          className="m-0 mb-0 p-0 font-serif text-[34px] leading-[42px]
            font-light tracking-[-0.85px]"
        >
          Customize tools for {serverName}
        </h1>
      </div>
      <div className="min-h-0 flex-1">
        {!isWorkloadPending &&
        !isWorkloadLoading &&
        workload?.status !== 'running' ? (
          <EmptyState
            illustration={IllustrationStop}
            title="Server is not running"
            body="We can't retrieve the running tools with their names and descriptions when the server is stopped. Start the server to view and customize available tools."
            actions={[
              <Button
                key="start-server"
                onClick={() => handleStartServer()}
                disabled={isRestartPending}
              >
                {isRestartPending ? 'Starting...' : 'Start server'}
              </Button>,
              <Button
                key="cancel"
                variant="outline"
                onClick={() =>
                  navigate({
                    to: `/group/${workload?.group || 'default'}`,
                  })
                }
              >
                Cancel
              </Button>,
            ]}
          />
        ) : (
          <CustomizeToolsTable
            tools={completedTools || []}
            overrideTools={existingServerData?.tools_override}
            toolsDiff={showToolsDiff ? toolsDiff : null}
            isLoading={
              isSubmitting ||
              isWorkloadLoading ||
              isLoadingServerTools ||
              isLoadingServer
            }
            onApply={handleApply}
            drift={drift}
          />
        )}
      </div>
    </div>
  )
}
