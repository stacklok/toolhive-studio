import {
  getApiV1BetaWorkloadsOptions,
  postApiV1BetaWorkloadsMutation,
  getApiV1BetaWorkloadsQueryKey,
  getApiV1BetaWorkloadsByNameOptions,
} from '@/common/api/generated/@tanstack/react-query.gen'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { pollServerStatus } from '@/common/lib/polling'
import { DialogFormRunMcpServerWithCommand } from '@/features/mcp-servers/components/dialog-form-run-mcp-command'
import { GridCardsMcpServers } from '@/features/mcp-servers/components/grid-cards-mcp-server'
import { DropdownMenuRunMcpServer } from '@/features/mcp-servers/components/menu-run-mcp-server'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
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
  const { data } = useSuspenseQuery({
    ...getApiV1BetaWorkloadsOptions({ query: { all: true } }),
  })
  const workloads = data?.workloads ?? []
  const [isRunWithCommandOpen, setIsRunWithCommandOpen] = useState(false)
  const { mutateAsync } = useToastMutation(postApiV1BetaWorkloadsMutation())
  const queryClient = useQueryClient()

  return (
    <>
      <div className="mb-6 flex items-center">
        <h1 className="text-xl font-semibold">Installed</h1>
        <DropdownMenuRunMcpServer
          openRunCommandDialog={() => setIsRunWithCommandOpen(true)}
          className="ml-auto"
        />
        <DialogFormRunMcpServerWithCommand
          isOpen={isRunWithCommandOpen}
          onOpenChange={setIsRunWithCommandOpen}
          onSubmit={(data) => {
            mutateAsync(
              {
                body: data,
              },
              {
                onSuccess: async () => {
                  await pollServerStatus(() =>
                    queryClient.fetchQuery(
                      getApiV1BetaWorkloadsByNameOptions({
                        path: { name: data.name as string },
                      })
                    )
                  )
                  queryClient.invalidateQueries(
                    // @ts-expect-error - https://github.com/stacklok/toolhive/issues/497
                    getApiV1BetaWorkloadsQueryKey({ query: { all: true } })
                  )
                },
              }
            )
          }}
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
