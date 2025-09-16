import { useState, useEffect, useRef } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { getApiV1BetaWorkloadsOptions } from '@api/@tanstack/react-query.gen'
import { EmptyState } from '@/common/components/empty-state'
import { IllustrationNoConnection } from '@/common/components/illustrations/illustration-no-connection'
import { GridCardsMcpServers } from '@/features/mcp-servers/components/grid-cards-mcp-server'
import { useMutationRestartServerAtStartup } from '@/features/mcp-servers/hooks/use-mutation-restart-server'
import { TitlePage } from '@/common/components/title-page'
import { McpServersSidebar } from '@/features/mcp-servers/components/mcp-servers-sidebar'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'
import { featureFlagKeys } from '../../../utils/feature-flags'
import { RefreshButton } from '@/common/components/refresh-button'
import { DropdownMenuRunMcpServer } from '@/features/mcp-servers/components/dropdown-menu-run-mcp-server'
import { WrapperDialogFormMcp } from '@/features/mcp-servers/components/wrapper-dialog-mcp'
import { ManageClientsButton } from '@/features/clients/components/manage-clients-button'
import { GroupActionsDropdown } from '@/features/mcp-servers/components/group-actions-dropdown'

export const Route = createFileRoute('/group/$groupName')({
  loader: ({ context: { queryClient }, params: { groupName } }) =>
    queryClient.ensureQueryData(
      getApiV1BetaWorkloadsOptions({
        query: {
          all: true,
          group: groupName,
        },
      })
    ),
  component: GroupRoute,
})

function GroupRoute() {
  const { groupName } = Route.useParams()
  const showSidebar = useFeatureFlag(featureFlagKeys.GROUPS)

  const { data, refetch } = useSuspenseQuery({
    ...getApiV1BetaWorkloadsOptions({
      query: {
        all: true,
        group: groupName,
      },
    }),
  })

  const workloads = data?.workloads ?? []
  const filteredWorkloads = workloads
  const [serverDialogOpen, setServerDialogOpen] = useState<{
    local: boolean
    remote: boolean
  }>({
    local: false,
    remote: false,
  })
  const { mutateAsync, isPending } = useMutationRestartServerAtStartup()
  const hasProcessedShutdown = useRef(false)

  useEffect(() => {
    const handleShutdownRestart = async () => {
      try {
        if (hasProcessedShutdown.current) return
        hasProcessedShutdown.current = true

        const shutdownServers =
          await window.electronAPI.shutdownStore.getLastShutdownServers()
        if (shutdownServers.length === 0) return

        await mutateAsync({
          body: { names: shutdownServers.map((server) => server.name!) },
        })
      } catch (error) {
        console.error('Error during shutdown server restart:', error)
      }
    }

    handleShutdownRestart()
  }, [mutateAsync])

  return (
    <div className="flex h-full gap-6">
      {showSidebar ? <McpServersSidebar /> : null}
      <div
        className={showSidebar ? 'ml-sidebar min-w-0 flex-1' : 'min-w-0 flex-1'}
      >
        <TitlePage title="MCP Servers">
          <>
            {workloads.length > 0 && (
              <div className="ml-auto flex gap-2">
                <RefreshButton refresh={refetch} />
                <DropdownMenuRunMcpServer
                  openRunCommandDialog={setServerDialogOpen}
                />
                <ManageClientsButton groupName={groupName} />
                {showSidebar ? (
                  <GroupActionsDropdown groupName={groupName} />
                ) : null}
              </div>
            )}

            <WrapperDialogFormMcp
              serverType={serverDialogOpen}
              closeDialog={() =>
                setServerDialogOpen({ local: false, remote: false })
              }
              groupName={groupName}
            />
          </>
        </TitlePage>
        {!isPending && !filteredWorkloads.length ? (
          <EmptyState
            title="Add your first MCP server"
            body="Add a server manually or browse the MCP Server registry"
            illustration={IllustrationNoConnection}
          >
            <div className="my-6">
              <DropdownMenuRunMcpServer
                openRunCommandDialog={setServerDialogOpen}
              />
            </div>
          </EmptyState>
        ) : (
          <GridCardsMcpServers mcpServers={filteredWorkloads} />
        )}
      </div>
    </div>
  )
}
