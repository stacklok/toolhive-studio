import {
  getApiV1BetaWorkloadsOptions,
  postApiV1BetaWorkloadsMutation,
  getApiV1BetaWorkloadsQueryKey,
  getApiV1BetaWorkloadsByNameOptions,
} from '@/common/api/generated/@tanstack/react-query.gen'
import { EmptyState } from '@/common/components/empty-state'
import { IllustrationNoConnection } from '@/common/components/illustrations/illustration-no-connection'
import { RefreshButton } from '@/common/components/refresh-button'
import { Button } from '@/common/components/ui/button'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { pollServerStatus } from '@/common/lib/polling'
import { DialogFormRunMcpServerWithCommand } from '@/features/mcp-servers/components/dialog-form-run-mcp-command'
import { GridCardsMcpServers } from '@/features/mcp-servers/components/grid-cards-mcp-server'
import { DropdownMenuRunMcpServer } from '@/features/mcp-servers/components/menu-run-mcp-server'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
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
  const { mutateAsync } = useToastMutation(postApiV1BetaWorkloadsMutation())
  const queryClient = useQueryClient()

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
        <EmptyState
          title="Add your first MCP server"
          body="Browse or search the registry for a specific tool"
          actions={[
            <Button
              variant="outline"
              key="add-custom-server"
              onClick={() => setIsRunWithCommandOpen(true)}
            >
              Add custom server
            </Button>,
            <Button asChild key="add-from-registry">
              <Link to="/registry">
                Browse registry <ChevronRight />
              </Link>
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
