import type { V1WorkloadListResponse } from '@/common/api/generated'
import {
  getApiV1BetaWorkloadsOptions,
  postApiV1BetaWorkloadsMutation,
} from '@/common/api/generated/@tanstack/react-query.gen'
import { Button } from '@/common/components/ui/button'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { DialogFormRunMcpServerWithCommand } from '@/features/mcp-servers/components/dialog-form-run-mcp-command'
import { GridCardsMcpServers } from '@/features/mcp-servers/components/grid-cards-mcp-server'
import { DropdownMenuRunMcpServer } from '@/features/mcp-servers/components/menu-run-mcp-server'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(
      // @ts-expect-error - https://github.com/stacklok/toolhive/issues/497
      getApiV1BetaWorkloadsOptions({ query: { all: true } })
    ),
  component: Index,
})

export function Index() {
  const serversQuery = useSuspenseQuery(
    // @ts-expect-error - https://github.com/stacklok/toolhive/issues/497
    getApiV1BetaWorkloadsOptions({ query: { all: true } })
  )
  const [isRunWithCommandOpen, setIsRunWithCommandOpen] = useState(false)
  const { mutateAsync } = useToastMutation(postApiV1BetaWorkloadsMutation())

  // TODO: https://github.com/stacklok/toolhive/issues/495
  const parsed: V1WorkloadListResponse = JSON.parse(serversQuery.data as string)
  const servers = parsed.workloads

  return (
    <>
      <div className="mb-6 flex items-center">
        <h1 className="text-3xl font-semibold">Installed</h1>
        <Button onClick={() => myUndefinedFunction()}>Foo</Button>
        <DropdownMenuRunMcpServer
          openRunCommandDialog={() => setIsRunWithCommandOpen(true)}
          className="ml-auto"
        />
        <DialogFormRunMcpServerWithCommand
          isOpen={isRunWithCommandOpen}
          onOpenChange={setIsRunWithCommandOpen}
          onSubmit={(data) => {
            mutateAsync({
              body: data,
            })
          }}
        />
      </div>
      {!servers || servers.length === 0 ? (
        <div>No servers found</div>
      ) : (
        <GridCardsMcpServers mcpServers={servers} />
      )}
    </>
  )
}
