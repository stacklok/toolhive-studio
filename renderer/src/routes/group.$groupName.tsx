import { useState, useEffect, useRef } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { getApiV1BetaWorkloadsOptions } from '@api/@tanstack/react-query.gen'
import { EmptyState } from '@/common/components/empty-state'
import { IllustrationNoConnection } from '@/common/components/illustrations/illustration-no-connection'
import { Button } from '@/common/components/ui/button'
import { RefreshButton } from '@/common/components/refresh-button'
import { LinkViewTransition } from '@/common/components/link-view-transition'
import { GridCardsMcpServers } from '@/features/mcp-servers/components/grid-cards-mcp-server'
import { DropdownMenuRunMcpServer } from '@/features/mcp-servers/components/menu-run-mcp-server'
import { useMutationRestartServerAtStartup } from '@/features/mcp-servers/hooks/use-mutation-restart-server'
import { TitlePage } from '@/common/components/title-page'
import { McpServersSidebar } from '@/features/mcp-servers/components/mcp-servers-sidebar'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'
import { featureFlagKeys } from '../../../utils/feature-flags'
import { ManageClientsButton } from '@/features/clients/components/manage-clients-button'
import { DialogFormLocalMcp } from '@/features/mcp-servers/components/local-mcp/dialog-form-local-mcp'

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
  const [isRunWithCommandOpen, setIsRunWithCommandOpen] = useState(false)
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
          {workloads.length > 0 && (
            <div className="ml-auto flex gap-2">
              <RefreshButton refresh={refetch} />
              <DropdownMenuRunMcpServer
                openRunCommandDialog={() => setIsRunWithCommandOpen(true)}
              />
              <ManageClientsButton groupName={groupName} />
            </div>
          )}
          <DialogFormLocalMcp
            isOpen={isRunWithCommandOpen}
            closeDialog={() => setIsRunWithCommandOpen(false)}
          />
        </TitlePage>
        {!isPending && !filteredWorkloads.length ? (
          <EmptyState
            title="Add your first MCP server"
            body="You can add a server by running it with a command or by browsing the registry"
            actions={[
              <Button
                variant="outline"
                key="add-custom-server"
                onClick={() => setIsRunWithCommandOpen(true)}
              >
                Add custom server
              </Button>,
              <div key="secondary-actions" className="flex gap-2">
                <Button asChild variant="outline">
                  <LinkViewTransition to="/registry">
                    Browse registry <ChevronRight />
                  </LinkViewTransition>
                </Button>
                <ManageClientsButton groupName={groupName} />
              </div>,
            ]}
            illustration={IllustrationNoConnection}
          />
        ) : (
          <GridCardsMcpServers mcpServers={filteredWorkloads} />
        )}
      </div>
    </div>
  )
}
