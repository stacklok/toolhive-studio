import { useState, useEffect, useRef } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { getApiV1BetaWorkloadsOptions } from '@/common/api/generated/@tanstack/react-query.gen'
import { EmptyState } from '@/common/components/empty-state'
import { IllustrationNoConnection } from '@/common/components/illustrations/illustration-no-connection'
import { Button } from '@/common/components/ui/button'
import { RefreshButton } from '@/common/components/refresh-button'
import { LinkViewTransition } from '@/common/components/link-view-transition'
import { DialogFormRunMcpServerWithCommand } from '@/features/mcp-servers/components/dialog-form-run-mcp-command'
import { GridCardsMcpServers } from '@/features/mcp-servers/components/grid-cards-mcp-server'
import { DropdownMenuRunMcpServer } from '@/features/mcp-servers/components/menu-run-mcp-server'
import { useMutationRestartServerAtStartup } from '@/features/mcp-servers/hooks/use-mutation-restart-server'
import { TitlePage } from '@/common/components/title-page'

export const Route = createFileRoute('/')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(
      getApiV1BetaWorkloadsOptions({ query: { all: true } })
    ),
  component: Index,
})

export function Index() {
  const { data, refetch } = useSuspenseQuery({
    ...getApiV1BetaWorkloadsOptions({ query: { all: true } }),
  })
  const workloads = data?.workloads ?? []
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
    <>
      <TitlePage title="MCP Servers">
        {workloads.length > 0 && (
          <div className="ml-auto flex gap-2">
            <RefreshButton refresh={refetch} />
            <DropdownMenuRunMcpServer
              openRunCommandDialog={() => setIsRunWithCommandOpen(true)}
            />
          </div>
        )}
        <DialogFormRunMcpServerWithCommand
          isOpen={isRunWithCommandOpen}
          onOpenChange={setIsRunWithCommandOpen}
        />
      </TitlePage>
      {!isPending && !workloads.length ? (
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
            <Button asChild key="add-from-registry">
              <LinkViewTransition to="/registry">
                Browse registry <ChevronRight />
              </LinkViewTransition>
            </Button>,
          ]}
          illustration={IllustrationNoConnection}
        />
      ) : (
        <GridCardsMcpServers mcpServers={workloads} />
      )}
    </>
  )
}
