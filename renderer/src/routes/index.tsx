import { getApiV1BetaWorkloadsOptions } from '@/common/api/generated/@tanstack/react-query.gen'
import { RefreshButton } from '@/common/components/refresh-button'
import { DialogFormRunMcpServerWithCommand } from '@/features/mcp-servers/components/dialog-form-run-mcp-command'
import { GridCardsMcpServers } from '@/features/mcp-servers/components/grid-cards-mcp-server'
import { DropdownMenuRunMcpServer } from '@/features/mcp-servers/components/menu-run-mcp-server'
import { useRunCustomServer } from '@/features/mcp-servers/hooks/use-run-custom-server'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

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
  const { handleSubmit } = useRunCustomServer()

  return (
    <>
      <div className="mb-6 flex items-center">
        <h1 className="text-3xl font-semibold">Installed</h1>
        <div className="ml-auto flex gap-2">
          <RefreshButton refresh={refetch} />
          <DropdownMenuRunMcpServer
            openRunCommandDialog={() => setIsRunWithCommandOpen(true)}
          />
        </div>
        <DialogFormRunMcpServerWithCommand
          isOpen={isRunWithCommandOpen}
          onOpenChange={setIsRunWithCommandOpen}
          onSubmit={handleSubmit}
        />
      </div>
      {workloads.length === 0 ? (
        <div>No servers found</div>
      ) : (
        <GridCardsMcpServers mcpServers={workloads} />
      )}
    </>
  )
}
